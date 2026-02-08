// ==========================================
// 전역 설정 (Config.gs)
// ==========================================

const CONFIG = {
  // 스프레드시트 설정
  SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),
  
  // 시트 이름
  SHEETS: {
    REQUESTS: '신청내역',
    USERS: '사용자관리',
    CODES: '코드관리',
    LOGS: '로그',
    DASHBOARD: '대시보드',
    DELIVERY_PLACES: '배송지관리'
  },
  
  // Drive 폴더 (초기화 시 설정됨)
  DRIVE_FOLDER_ID: null,
  
  // 이메일 설정
  EMAIL: {
    ENABLED: true,
    ADMIN_NOTIFICATION: true,
    USER_NOTIFICATION: true,
    FROM_NAME: '부품발주시스템'
  },
  
  // 신청번호 형식
  REQUEST_NO_FORMAT: 'YYMMDD0000',
  
  // 상태 코드 (축소된 상태값)
  STATUS: {
    REQUESTED: '접수중',
    ORDERING: '접수완료',
    COMPLETED_CONFIRMED: '발주완료(납기확인)',
    COMPLETED_PENDING: '발주완료(납기미정)',
    FINISHED: '처리완료',
    CANCELLED: '접수취소'
  },
  
  // 역할
  ROLES: {
    USER: '신청자',
    ADMIN: '관리자'
  },
  
  // 파일 업로드 제한
  FILE: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png'],
    IMAGE_QUALITY: 0.85,
    MAX_WIDTH: 1920,
    MAX_HEIGHT: 1080
  },
  
  // 페이징
  PAGE_SIZE: 50,
  
  // 캐시 설정 (성능 최적화)
  CACHE: {
    ENABLED: true,
    TTL: 300, // 5분 (기본값)
    DASHBOARD_TTL: 30, // 대시보드: 30초
    STATS_TTL: 60, // 통계: 60초
    REQUESTS_TTL: 60, // 신청 목록: 60초
    CODES_TTL: 600 // 코드 목록: 10분
  },
  
  // 디버그 설정
  DEBUG: {
    ENABLED: false, // 프로덕션에서는 false
    LOG_LEVEL: 'ERROR' // ERROR, WARN, INFO, DEBUG
  }
};

/**
 * Script Properties에서 값을 가져옵니다.
 * @param {string} key - 속성 키
 * @return {string|null} 속성 값 또는 null
 */
function getProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

/**
 * Script Properties에 값을 저장합니다.
 * @param {string} key - 속성 키
 * @param {string} value - 속성 값
 */
function setProperty(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}

/**
 * 시스템 Properties를 초기화합니다. (Drive 폴더 생성 포함)
 * @throws {Error} 초기화 실패 시 오류 발생
 */
function initializeProperties() {
  const props = PropertiesService.getScriptProperties();
  
  try {
    // Drive 폴더 생성
    const folder = DriveApp.createFolder('부품발주_사진첨부');
    
    // 폴더 공유 설정 (링크가 있는 사람은 볼 수 있음)
    try {
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sharingError) {
      // 공유 설정 실패 시에도 계속 진행
      Logger.log('Folder sharing setting failed: ' + sharingError);
      // 기본 공유 설정 시도
      try {
        folder.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
      } catch (e) {
        Logger.log('Alternative sharing setting also failed: ' + e);
      }
    }
    
    props.setProperties({
      'DRIVE_FOLDER_ID': folder.getId(),
      'INITIALIZED': 'true',
      'VERSION': '1.0.0',
      'DEPLOY_DATE': new Date().toISOString()
    });
    
    // CONFIG에 반영
    CONFIG.DRIVE_FOLDER_ID = folder.getId();
    
    Logger.log('Properties initialized successfully. Folder ID: ' + folder.getId());
  } catch (error) {
    Logger.log('initializeProperties error: ' + error);
    throw new Error('초기화 중 오류가 발생했습니다: ' + error.message);
  }
}

// ==========================================
// 유틸리티 함수 (Utils.gs)
// ==========================================

/**
 * 날짜를 지정된 형식으로 포맷팅합니다.
 * @param {Date|string} date - 포맷팅할 날짜
 * @param {string} format - 날짜 형식 (기본값: 'yyyy-MM-dd')
 * @return {string} 포맷팅된 날짜 문자열
 */
function formatDate(date, format = 'yyyy-MM-dd') {
  if (!date) return '';
  return Utilities.formatDate(new Date(date), 'Asia/Seoul', format);
}

/**
 * 두 날짜가 같은 날인지 비교합니다.
 * @param {Date|string} date1 - 첫 번째 날짜
 * @param {Date|string} date2 - 두 번째 날짜
 * @return {boolean} 같은 날이면 true, 아니면 false
 */
function isSameDate(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

// 로깅 헬퍼 함수
function log(level, message) {
  if (!CONFIG.DEBUG.ENABLED) return;
  
  const levels = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
  const currentLevel = levels[CONFIG.DEBUG.LOG_LEVEL] || 0;
  const messageLevel = levels[level] || 0;
  
  if (messageLevel <= currentLevel) {
    Logger.log(`[${level}] ${message}`);
  }
}

// 캐시 관리
class CacheManager {
  constructor() {
    this.cache = CacheService.getScriptCache();
  }
  
  get(key) {
    if (!CONFIG.CACHE.ENABLED) return null;
    
    const cached = this.cache.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  set(key, value, ttl = CONFIG.CACHE.TTL) {
    if (!CONFIG.CACHE.ENABLED) return;
    
    this.cache.put(key, JSON.stringify(value), ttl);
  }
  
  remove(key) {
    this.cache.remove(key);
  }
  
  clear() {
    this.cache.removeAll([]);
  }
  
  // 와일드카드 패턴으로 여러 키 삭제 (제한적 지원)
  removePattern(pattern) {
    // Google Apps Script CacheService는 와일드카드를 지원하지 않으므로
    // 특정 패턴의 키들을 직접 관리해야 함
    // 이는 구현 복잡도를 높이므로, 필요시 별도 키 목록 관리 필요
  }
}

// Lock 메커니즘 (동시성 제어)
class LockManager {
  constructor() {
    this.lock = LockService.getScriptLock();
  }
  
  acquire(timeout = 10000) {
    try {
      return this.lock.tryLock(timeout);
    } catch (e) {
      Logger.log('Lock acquire failed: ' + e);
      return false;
    }
  }
  
  release() {
    try {
      this.lock.releaseLock();
    } catch (e) {
      Logger.log('Lock release failed: ' + e);
    }
  }
  
  withLock(callback, timeout = 10000) {
    if (this.acquire(timeout)) {
      try {
        return callback();
      } finally {
        this.release();
      }
    } else {
      throw new Error('시스템이 사용 중입니다. 잠시 후 다시 시도해주세요.');
    }
  }
}

// 에러 핸들링
class ErrorHandler {
  static handle(error, context = '') {
    const errorMessage = error.message || error.toString();
    
    Logger.log(`Error in ${context}: ${errorMessage}`);
    Logger.log(error.stack);
    
    // Stackdriver Logging
    console.error(`${context}: ${errorMessage}`, error.stack);
    
    return {
      success: false,
      message: this._getUserFriendlyMessage(errorMessage),
      technical: errorMessage
    };
  }
  
  static _getUserFriendlyMessage(technicalMessage) {
    const messages = {
      'Authorization required': '권한이 필요합니다. 다시 로그인해주세요.',
      'Service invoked too many times': '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      'Quota exceeded': '일일 사용량을 초과했습니다. 내일 다시 시도해주세요.',
      'Timeout': '처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
    };
    
    for (const [key, value] of Object.entries(messages)) {
      if (technicalMessage.includes(key)) {
        return value;
      }
    }
    
    return '오류가 발생했습니다. 관리자에게 문의해주세요.';
  }
}

// 데이터 검증
class Validator {
  static isEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }
  
  static isPhone(phone) {
    const regex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
    return regex.test(phone.replace(/[^0-9]/g, ''));
  }
  
  static isNotEmpty(value) {
    return value && value.toString().trim() !== '';
  }
  
  static isNumber(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
  }
  
  static isInRange(value, min, max) {
    const num = parseFloat(value);
    return this.isNumber(num) && num >= min && num <= max;
  }
}

/**
 * HTML 파일을 포함합니다. (템플릿에서 사용)
 * @param {string} filename - 포함할 HTML 파일 이름 (확장자 제외)
 * @return {string} HTML 파일 내용
 */
function include(filename) {
  try {
    const content = HtmlService.createHtmlOutputFromFile(filename).getContent();
    // 빈 내용이나 에러가 있는 경우 빈 문자열 반환
    if (!content || content.trim() === '') {
      Logger.log('include: Empty content for file: ' + filename);
      return '';
    }
    return content;
  } catch (error) {
    Logger.log('include error for file ' + filename + ': ' + error);
    // 에러 발생 시 빈 문자열 반환 (페이지 로딩 방지)
    return '';
  }
}

// ==========================================
// 데이터 접근 레이어 (Models.gs)
// ==========================================

class RequestModel {
  constructor() {
    this.sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG.SHEETS.REQUESTS);
    
    // 시트가 없으면 null로 설정
    if (!this.sheet) {
      Logger.log('RequestModel: Sheet "' + CONFIG.SHEETS.REQUESTS + '" not found');
    }
  }
  
  // 전체 조회 (서버 측 필터링 및 페이징 지원)
  findAll(filter = {}, options = {}) {
    try {
      // 시트가 없으면 빈 배열 반환
      if (!this.sheet) {
        log('WARN', 'RequestModel.findAll: Sheet not found');
        return options.page ? { data: [], total: 0, page: 1, pageSize: 0 } : [];
      }
      
      const data = this.sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return options.page ? { data: [], total: 0, page: 1, pageSize: 0 } : [];
      }
      
      const headers = data[0];
      const rows = data.slice(1);
      const objects = rows.map((row, index) => this._rowToObject(headers, row, index + 2));
      
      // 서버 측 필터링
      let filtered = objects.filter(obj => this._matchFilter(obj, filter));
      
      // 정렬 (서버 측)
      if (options.sortBy) {
        filtered = this._sort(filtered, options.sortBy, options.sortOrder || 'desc');
      } else {
        // 기본 정렬: 최신순 (requestDate 기준)
        filtered = this._sort(filtered, 'requestDate', 'desc');
      }
      
      const total = filtered.length;
      
      // 서버 측 페이징
      if (options.page && options.pageSize) {
        const startIndex = (options.page - 1) * options.pageSize;
        const endIndex = startIndex + options.pageSize;
        filtered = filtered.slice(startIndex, endIndex);
        
        return {
          data: filtered,
          total: total,
          page: options.page,
          pageSize: options.pageSize,
          totalPages: Math.ceil(total / options.pageSize)
        };
      }
      
      // 페이징 옵션이 없으면 기존 방식 (하위 호환성)
      return filtered;
    } catch (error) {
      log('ERROR', 'RequestModel.findAll error: ' + error);
      throw error;
    }
  }
  
  // 정렬 헬퍼
  _sort(array, sortBy, sortOrder = 'asc') {
    return array.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // 날짜 필드 처리
      if (sortBy === 'requestDate' || sortBy === 'orderDate' || sortBy === 'receiptDate') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      
      // 숫자 필드 처리
      if (sortBy === 'quantity') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      
      // 문자열 필드 처리
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
      }
      if (typeof bVal === 'string') {
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }
  
  // ID로 조회
  findById(requestNo) {
    const data = this.sheet.getDataRange().getValues();
    if (data.length <= 1) return null;
    
    const headers = data[0];
    const requestNoStr = String(requestNo); // 문자열로 변환
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === requestNoStr) {
        return this._rowToObject(headers, data[i], i + 1);
      }
    }
    
    return null;
  }
  
  // 생성
  create(requestData) {
    const row = this._objectToRow(requestData);
    this.sheet.appendRow(row);
    return requestData;
  }
  
  // 수정 (배치 업데이트 최적화)
  update(requestNo, updates) {
    if (!this.sheet) return false;
    
    const data = this.sheet.getDataRange().getValues();
    const requestNoStr = String(requestNo);
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === requestNoStr) {
        // 배치 업데이트: 여러 셀을 한 번에 업데이트
        const updatesArray = [];
        Object.keys(updates).forEach(key => {
          const colIndex = this._getColumnIndex(key);
          if (colIndex >= 0) {
            updatesArray.push({
              range: this.sheet.getRange(i + 1, colIndex + 1),
              value: updates[key]
            });
          }
        });
        
        // 한 번에 업데이트 (배치 처리)
        updatesArray.forEach(update => {
          update.range.setValue(update.value);
        });
        
        return true;
      }
    }
    return false;
  }
  
  // 삭제 (실제로는 상태 변경)
  delete(requestNo) {
    return this.update(requestNo, { 
      status: CONFIG.STATUS.CANCELLED,
      lastModified: new Date()
    });
  }
  
  // Private 메서드들
  _rowToObject(headers, row, rowIndex) {
    const obj = { _rowIndex: rowIndex };
    headers.forEach((header, index) => {
      const key = this._headerToKey(header);
      // requestNo는 항상 문자열로 변환
      if (key === 'requestNo' && row[index]) {
        obj[key] = String(row[index]);
      } else {
        obj[key] = row[index];
      }
    });
    return obj;
  }
  
  _objectToRow(obj) {
    const headers = this.sheet.getRange(1, 1, 1, this.sheet.getLastColumn()).getValues()[0];
    return headers.map(header => {
      const key = this._headerToKey(header);
      return obj[key] !== undefined ? obj[key] : '';
    });
  }
  
  _headerToKey(header) {
    const map = {
      '신청번호': 'requestNo',
      '신청일시': 'requestDate',
      '신청자ID': 'requesterEmail', // 시트 컬럼명은 '신청자ID'이지만 코드에서는 'requesterEmail'로 사용 (하위 호환성)
      '신청자이메일': 'requesterEmail', // 하위 호환성
      '신청자이름': 'requesterName',
      '기사코드': 'employeeCode',
      '소속팀': 'team',
      '지역': 'region',
      '품명': 'itemName',
      '모델명': 'modelName',
      '규격': 'modelName', // 모델명 -> 규격으로 변경
      '시리얼번호': 'serialNo',
      '수량': 'quantity',
      '관리번호': 'assetNo',
      '수령지': 'deliveryPlace', // 하위 호환성 유지
      '배송지': 'deliveryPlace',
      '전화번호': 'phone',
      '업체명': 'company',
      '비고': 'remarks',
      '사진URL': 'photoUrl',
      '상태': 'status',
      '접수담당자': 'handler',
      '담당자비고': 'handlerRemarks',
      '발주일시': 'orderDate',
      '예상납기일': 'expectedDeliveryDate',
      '수령확인일시': 'receiptDate',
      '최종수정일시': 'lastModified',
      '최종수정자': 'lastModifiedBy'
    };
    return map[header] || header;
  }
  
  _getColumnIndex(key) {
    const reverseMap = {
      'requestNo': 0, 'requestDate': 1, 'requesterEmail': 2,
      'requesterName': 3, 'employeeCode': 4, 'team': 5,
      'region': 6, 'itemName': 7, 'modelName': 8,
      'serialNo': 9, 'quantity': 10, 'assetNo': 11,
      'deliveryPlace': 12, 'phone': 13, 'company': 14,
      'remarks': 15, 'photoUrl': 16, 'status': 17,
      'handler': 18, 'handlerRemarks': 19, 'orderDate': 20,
      'expectedDeliveryDate': 21, 'receiptDate': 22,
      'lastModified': 23, 'lastModifiedBy': 24
    };
    return reverseMap[key] !== undefined ? reverseMap[key] : -1;
  }
  
  _matchFilter(obj, filter) {
    if (filter.status && obj.status !== filter.status) return false;
    // 사용자 ID 기반 필터링 지원
    if (filter.requesterUserId && obj.requesterEmail !== filter.requesterUserId) return false;
    if (filter.requesterEmail && obj.requesterEmail !== filter.requesterEmail) return false;
    if (filter.region && obj.region !== filter.region) return false;
    // 관리번호 필터링 지원
    if (filter.assetNo && String(obj.assetNo || '').trim() !== String(filter.assetNo || '').trim()) return false;
    
    // 날짜 필터링 - 안전한 비교
    if (filter.dateFrom || filter.dateTo) {
      try {
        if (!obj.requestDate) return false;
        
        // requestDate를 문자열로 변환 (YYYY-MM-DD 형식)
        let reqDateStr;
        if (obj.requestDate instanceof Date) {
          reqDateStr = Utilities.formatDate(obj.requestDate, 'Asia/Seoul', 'yyyy-MM-dd');
        } else {
          // 문자열인 경우 날짜 부분만 추출 (예: "2026. 1. 7 오전 9:45:44" -> "2026-01-07")
          const dateStr = String(obj.requestDate);
          if (dateStr.includes('.')) {
            // "2026. 1. 7 오전 9:45:44" 형식
            const parts = dateStr.split(' ')[0].split('.').map(p => p.trim());
            if (parts.length >= 3) {
              const year = parts[0];
              const month = parts[1].padStart(2, '0');
              const day = parts[2].padStart(2, '0');
              reqDateStr = `${year}-${month}-${day}`;
            } else {
              reqDateStr = dateStr.split(' ')[0]; // 공백 앞부분만 사용
            }
          } else {
            reqDateStr = dateStr.split(' ')[0]; // 공백 앞부분만 사용
          }
        }
        
        // 문자열 비교 (YYYY-MM-DD 형식)
        if (filter.dateFrom && reqDateStr < filter.dateFrom) return false;
        if (filter.dateTo && reqDateStr > filter.dateTo) return false;
      } catch (dateError) {
        Logger.log('Date filter error: ' + dateError);
        // 날짜 비교 오류 시 해당 항목 제외하지 않음 (포함)
      }
    }
    
    return true;
  }
}

class UserModel {
  constructor() {
    try {
      this.sheet = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(CONFIG.SHEETS.USERS);
      if (!this.sheet) {
        Logger.log('UserModel: Users sheet not found');
      }
    } catch (error) {
      Logger.log('UserModel constructor error: ' + error);
      this.sheet = null;
    }
  }
  
  /**
   * 사용자 ID로 사용자 조회
   * @param {string} userId - 사용자 ID
   * @return {Object|null} 사용자 정보
   */
  findByUserId(userId) {
    if (!this.sheet) {
      Logger.log('findByUserId: Users sheet not found');
      return null;
    }
    
    if (!userId) {
      Logger.log('findByUserId: userId is empty');
      return null;
    }
    
    try {
      const data = this.sheet.getDataRange().getValues();
      if (data.length <= 1) return null;
    
    // userId를 문자열로 정규화 (시트의 값이 숫자일 수도 있음)
    const normalizedUserId = String(userId).trim();
    
    for (let i = 1; i < data.length; i++) {
      // 시트의 userId도 문자열로 변환하여 비교 (타입 불일치 방지)
      const sheetUserId = String(data[i][0]).trim();
      
      if (sheetUserId === normalizedUserId) {
        return {
          userId: data[i][0],
          passwordHash: data[i][1],
          name: data[i][2],
          employeeCode: data[i][3],
          team: data[i][4],
          region: data[i][5],
          role: data[i][6],
          active: data[i][7]
        };
      }
    }
    return null;
    } catch (error) {
      Logger.log('findByUserId error: ' + error);
      return null;
    }
  }
  
  /**
   * 이메일로 사용자 조회 (하위 호환성)
   * @param {string} email - 이메일
   * @return {Object|null} 사용자 정보
   */
  findByEmail(email) {
    // 사용자ID 컬럼에서 이메일 형식도 검색
    return this.findByUserId(email);
  }
  
  /**
   * 비밀번호 업데이트
   * @param {string} userId - 사용자 ID
   * @param {string} passwordHash - 새 비밀번호 해시
   */
  updatePassword(userId, passwordHash) {
    const data = this.sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        this.sheet.getRange(i + 1, 2).setValue(passwordHash); // B열: 비밀번호해시
        return true;
      }
    }
    return false;
  }
  
  findAllAdmins() {
    const data = this.sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const admins = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][6] === CONFIG.ROLES.ADMIN && data[i][7] === 'Y') {
        admins.push({
          userId: data[i][0],
          name: data[i][2]
        });
      }
    }
    return admins;
  }
}

class CodeModel {
  constructor() {
    this.sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG.SHEETS.CODES);
  }
  
  getRegions() {
    return this._getCodes(1, 20);
  }
  
  getTeams() {
    const data = this.sheet.getDataRange().getValues();
    const teams = [];
    
    // 소속팀 섹션 찾기 (빈 행 이후)
    let startRow = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === '코드' && data[i][1] === '팀명') {
        startRow = i;
        break;
      }
    }
    
    if (startRow === -1) return [];
    
    for (let i = startRow + 1; i < data.length && i < startRow + 20; i++) {
      if (data[i][0] && data[i][3] === 'Y') {
        teams.push({
          code: data[i][0],
          name: data[i][1],
          region: data[i][2] || null
        });
      }
    }
    
    return teams;
  }
  
  getStatusList() {
    const data = this.sheet.getDataRange().getValues();
    const statuses = [];
    
    // 상태 섹션 찾기
    let startRow = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === '코드' && data[i][1] === '상태명') {
        startRow = i;
        break;
      }
    }
    
    if (startRow === -1) return [];
    
    for (let i = startRow + 1; i < data.length && i < startRow + 20; i++) {
      if (data[i][0] && data[i][2] === 'Y') {
        statuses.push({
          code: data[i][0],
          name: data[i][1],
          color: data[i][3] || null
        });
      }
    }
    
    return statuses;
  }
  
  _getCodes(startRow, maxRows) {
    const data = this.sheet.getDataRange().getValues();
    const codes = [];
    
    for (let i = startRow; i < data.length && i < startRow + maxRows; i++) {
      if (data[i][0] && data[i][2] === 'Y') {
        codes.push({
          code: data[i][0],
          name: data[i][1],
          extra: data[i][3] || null
        });
      }
    }
    
    return codes;
  }
}

class DeliveryPlaceModel {
  constructor() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // CONFIG 누락/캐시 이슈 대비 fallback
    const sheetName = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.DELIVERY_PLACES)
      ? String(CONFIG.SHEETS.DELIVERY_PLACES).trim()
      : '배송지관리';
    
    // 기존 시트만 찾기 (생성하지 않음) - trim 느슨매칭
    this.sheet = ss.getSheetByName(sheetName);
    if (!this.sheet) {
      const sheets = ss.getSheets();
      for (let i = 0; i < sheets.length; i++) {
        const s = sheets[i];
        const n = String(s.getName() || '');
        if (n.trim() === sheetName) {
          // 가능하면 canonicalName으로 rename 시도
          if (n !== sheetName) {
            try { s.setName(sheetName); } catch (e) {}
          }
          this.sheet = s;
          break;
        }
      }
    }
  }
  
  /**
   * 파트별 배송지 목록 조회
   * @param {string} team - 소속팀 (선택사항)
   * @return {Array} 배송지 목록
   */
  findByTeam(team) {
    if (!this.sheet) return [];
    
    const data = this.sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const headers = data[0];
    const rows = data.slice(1);
    const places = rows
      .filter(row => {
        // 활성화된 배송지만
        const activeIndex = headers.indexOf('활성화');
        if (activeIndex >= 0 && row[activeIndex] !== 'Y') return false;
        
        // 팀 필터 적용
        if (team) {
          const teamIndex = headers.indexOf('소속팀');
          if (teamIndex >= 0 && row[teamIndex] !== team) return false;
        }
        
        return true;
      })
      .map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });
    
    return places;
  }
  
  /**
   * 모든 배송지 목록 조회
   * @return {Array} 배송지 목록
   */
  findAll() {
    if (!this.sheet) return [];
    return this.findByTeam(null);
  }
  
  /**
   * 배송지 생성
   * @param {Object} placeData - 배송지 데이터
   * @return {Object} 생성된 배송지
   */
  create(placeData) {
    if (!this.sheet) {
      throw new Error('배송지관리 시트를 찾을 수 없습니다.');
    }
    const headers = this.sheet.getRange(1, 1, 1, this.sheet.getLastColumn()).getValues()[0];
    const row = headers.map(header => placeData[header] || '');
    this.sheet.appendRow(row);
    return placeData;
  }
  
  /**
   * 배송지 수정
   * @param {number} rowIndex - 행 인덱스 (1-based)
   * @param {Object} updates - 수정할 데이터
   * @return {boolean} 성공 여부
   */
  update(rowIndex, updates) {
    const headers = this.sheet.getRange(1, 1, 1, this.sheet.getLastColumn()).getValues()[0];
    Object.keys(updates).forEach(key => {
      const colIndex = headers.indexOf(key);
      if (colIndex >= 0) {
        this.sheet.getRange(rowIndex, colIndex + 1).setValue(updates[key]);
      }
    });
    return true;
  }
  
  /**
   * 배송지 삭제 (활성화 상태 변경)
   * @param {number} rowIndex - 행 인덱스 (1-based)
   * @return {boolean} 성공 여부
   */
  delete(rowIndex) {
    const headers = this.sheet.getRange(1, 1, 1, this.sheet.getLastColumn()).getValues()[0];
    const activeIndex = headers.indexOf('활성화');
    if (activeIndex >= 0) {
      this.sheet.getRange(rowIndex, activeIndex + 1).setValue('N');
      return true;
    }
    return false;
  }
}

// ==========================================
// 인증 및 세션 관리 (Auth.gs)
// ==========================================

/**
 * 세션 관리 클래스
 */
class SessionManager {
  constructor() {
    this.cache = CacheService.getScriptCache();
    this.SESSION_TTL = 3600; // 1시간
  }
  
  /**
   * 세션 생성
   * @param {string} userId - 사용자 ID
   * @param {Object} userInfo - 사용자 정보
   * @return {string} 세션 토큰
   */
  createSession(userId, userInfo) {
    const sessionToken = Utilities.getUuid();
    const sessionData = {
      userId: userId,
      userInfo: userInfo,
      createdAt: new Date().getTime(),
      expiresAt: new Date().getTime() + (this.SESSION_TTL * 1000)
    };
    
    this.cache.put('session_' + sessionToken, JSON.stringify(sessionData), this.SESSION_TTL);
    this.cache.put('user_session_' + userId, sessionToken, this.SESSION_TTL);
    
    Logger.log('Session created for user: ' + userId);
    return sessionToken;
  }
  
  /**
   * 세션 확인
   * @param {string} sessionToken - 세션 토큰
   * @return {Object|null} 세션 데이터 또는 null
   */
  getSession(sessionToken) {
    if (!sessionToken) return null;
    
    const cached = this.cache.get('session_' + sessionToken);
    if (!cached) return null;
    
    const sessionData = JSON.parse(cached);
    
    // 세션 만료 확인
    if (new Date().getTime() > sessionData.expiresAt) {
      this.destroySession(sessionToken);
      return null;
    }
    
    // 세션 연장
    sessionData.expiresAt = new Date().getTime() + (this.SESSION_TTL * 1000);
    this.cache.put('session_' + sessionToken, JSON.stringify(sessionData), this.SESSION_TTL);
    
    return sessionData;
  }
  
  /**
   * 세션 삭제
   * @param {string} sessionToken - 세션 토큰
   */
  destroySession(sessionToken) {
    if (!sessionToken) return;
    
    const cached = this.cache.get('session_' + sessionToken);
    if (cached) {
      const sessionData = JSON.parse(cached);
      this.cache.remove('user_session_' + sessionData.userId);
    }
    
    this.cache.remove('session_' + sessionToken);
    Logger.log('Session destroyed: ' + sessionToken);
  }
  
  /**
   * 사용자 ID로 세션 삭제
   * @param {string} userId - 사용자 ID
   */
  destroySessionByUserId(userId) {
    const userSessionKey = 'user_session_' + userId;
    const sessionToken = this.cache.get(userSessionKey);
    
    if (sessionToken) {
      // 세션 데이터 삭제
      this.destroySession(sessionToken);
    } else {
      // 세션 토큰이 없어도 user_session 키는 삭제 (혹시 모를 경우 대비)
      this.cache.remove(userSessionKey);
    }
    
    Logger.log('Session destroyed for userId: ' + userId);
  }
}

/**
 * 비밀번호 해시 생성
 * @param {string} password - 평문 비밀번호
 * @return {string} SHA-256 해시
 */
function hashPassword(password) {
  const rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );
  
  // 바이트 배열을 16진수 문자열로 변환
  // Utilities.computeDigest는 -128~127 범위의 바이트를 반환
  // 이를 0-255 범위의 unsigned 바이트로 변환
  let hexString = '';
  for (let i = 0; i < rawHash.length; i++) {
    let byte = rawHash[i];
    // 음수 바이트를 양수로 변환
    if (byte < 0) {
      byte = byte + 256;
    }
    // 16진수로 변환 (소문자, 2자리 패딩)
    hexString += ('0' + byte.toString(16)).slice(-2);
  }
  
  return hexString;
}

/**
 * 비밀번호 검증
 * @param {string} password - 입력한 비밀번호
 * @param {string} hash - 저장된 해시
 * @return {boolean} 일치 여부
 */
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

/**
 * 로그인 처리
 * @param {string} userId - 사용자 ID
 * @param {string} password - 비밀번호
 * @return {Object} 로그인 결과
 */
function login(userId, password) {
  try {
    if (!userId || !password) {
      return {
        success: false,
        message: '사용자 ID와 비밀번호를 입력해주세요.'
      };
    }
    
    Logger.log('Login attempt - userId: ' + userId);
    
    // userId 정규화
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
      return {
        success: false,
        message: '사용자 ID를 입력해주세요.'
      };
    }
    
    const userModel = new UserModel();
    
    // 시트 존재 여부 확인
    if (!userModel.sheet) {
      Logger.log('Login: Users sheet not found');
      return {
        success: false,
        message: '시스템 오류: 사용자 시트를 찾을 수 없습니다.'
      };
    }
    
    const user = userModel.findByUserId(normalizedUserId);
    
    if (!user) {
      Logger.log('User not found: ' + normalizedUserId);
      return {
        success: false,
        message: '사용자 ID 또는 비밀번호가 올바르지 않습니다.'
      };
    }
    
    Logger.log('User found: ' + user.name + ', Active: ' + user.active);
    Logger.log('Stored hash: ' + user.passwordHash);
    
    if (user.active !== 'Y') {
      return {
        success: false,
        message: '비활성화된 계정입니다.'
      };
    }
    
    // 비밀번호 해시 생성
    const inputHash = hashPassword(password);
    Logger.log('Input hash: ' + inputHash);
    Logger.log('Hash match: ' + (inputHash === user.passwordHash));
    
    // 비밀번호 검증
    if (!verifyPassword(password, user.passwordHash)) {
      Logger.log('Password verification failed');
      return {
        success: false,
        message: '사용자 ID 또는 비밀번호가 올바르지 않습니다.'
      };
    }
    
    Logger.log('Password verified successfully');
    
    // 세션 생성 전에 해당 사용자의 기존 세션 삭제 (중복 세션 방지)
    const sessionManager = new SessionManager();
    sessionManager.destroySessionByUserId(userId);
    Logger.log('Previous session destroyed for user: ' + userId);
    
    // 새 세션 생성
    const sessionToken = sessionManager.createSession(userId, {
      userId: user.userId,
      name: user.name,
      employeeCode: user.employeeCode,
      team: user.team,
      region: user.region,
      role: user.role
    });
    
    // 로그 기록
    new LogService().log('로그인', null, userId);
    
    return {
      success: true,
      sessionToken: sessionToken,
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        team: user.team
      },
      redirectUrl: user.role === CONFIG.ROLES.ADMIN ? '?page=admin' : '?page=user'
    };
    
  } catch (error) {
    Logger.log('login error: ' + error);
    return {
      success: false,
      message: '로그인 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 로그아웃 처리
 * @param {string} sessionToken - 세션 토큰
 * @return {Object} 로그아웃 결과
 */
function logout(sessionToken) {
  try {
    const sessionManager = new SessionManager();
    const session = sessionManager.getSession(sessionToken);
    
    if (session) {
      new LogService().log('로그아웃', null, session.userId);
      sessionManager.destroySession(sessionToken);
    }
    
    return {
      success: true,
      message: '로그아웃되었습니다.'
    };
  } catch (error) {
    Logger.log('logout error: ' + error);
    return {
      success: false,
      message: '로그아웃 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 현재 세션 확인
 * @param {string} sessionToken - 세션 토큰
 * @return {Object|null} 사용자 정보 또는 null
 */
function getCurrentSession(sessionToken) {
  try {
    if (!sessionToken) {
      Logger.log('getCurrentSession: No sessionToken provided');
      return null;
    }
    
    const sessionManager = new SessionManager();
    const session = sessionManager.getSession(sessionToken);
    
    if (!session) {
      Logger.log('getCurrentSession: No session found for token');
      return null;
    }
    
    Logger.log('getCurrentSession: session.userId = ' + session.userId);
    Logger.log('getCurrentSession: session.userInfo = ' + JSON.stringify(session.userInfo));
    
    // userInfo에 userId가 없으면 session.userId를 추가
    if (session.userInfo && !session.userInfo.userId && session.userId) {
      session.userInfo.userId = session.userId;
      Logger.log('getCurrentSession: Added userId from session to userInfo');
    }
    
    return session.userInfo;
  } catch (error) {
    Logger.log('getCurrentSession error: ' + error);
    Logger.log('getCurrentSession error stack: ' + error.stack);
    return null;
  }
}

/**
 * 비밀번호 변경
 * @param {string} userId - 사용자 ID
 * @param {string} oldPassword - 기존 비밀번호
 * @param {string} newPassword - 새 비밀번호
 * @param {string} sessionToken - 세션 토큰
 * @return {Object} 결과
 */
function changePassword(userId, oldPassword, newPassword, sessionToken) {
  try {
    // 세션 확인
    const currentUser = getCurrentSession(sessionToken);
    if (!currentUser || currentUser.userId !== userId) {
      return {
        success: false,
        message: '권한이 없습니다.'
      };
    }
    
    const userModel = new UserModel();
    const user = userModel.findByUserId(userId);
    
    if (!user) {
      return {
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      };
    }
    
    // 기존 비밀번호 확인 (비밀번호가 설정되어 있는 경우)
    if (user.passwordHash && user.passwordHash.trim() !== '') {
      if (!verifyPassword(oldPassword, user.passwordHash)) {
        return {
          success: false,
          message: '기존 비밀번호가 올바르지 않습니다.'
        };
      }
    }
    
    // 새 비밀번호 해시 생성 및 저장
    const newHash = hashPassword(newPassword);
    userModel.updatePassword(userId, newHash);
    
    new LogService().log('비밀번호 변경', null, userId);
    
    return {
      success: true,
      message: '비밀번호가 변경되었습니다.'
    };
  } catch (error) {
    Logger.log('changePassword error: ' + error);
    return {
      success: false,
      message: '비밀번호 변경 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 관리자가 사용자 비밀번호를 초기화합니다. (관리자 전용)
 * @param {string} targetUserId - 대상 사용자 ID
 * @param {string} newPassword - 새 비밀번호
 * @param {string} sessionToken - 세션 토큰
 * @return {Object} 결과
 */
function resetUserPassword(targetUserId, newPassword, sessionToken) {
  try {
    // 관리자 권한 확인
    const currentUser = getCurrentSession(sessionToken);
    if (!currentUser || currentUser.role !== CONFIG.ROLES.ADMIN) {
      return {
        success: false,
        message: '관리자만 비밀번호를 초기화할 수 있습니다.'
      };
    }
    
    const userModel = new UserModel();
    const user = userModel.findByUserId(targetUserId);
    
    if (!user) {
      return {
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      };
    }
    
    // 새 비밀번호 해시 생성 및 저장
    const newHash = hashPassword(newPassword);
    userModel.updatePassword(targetUserId, newHash);
    
    new LogService().log('비밀번호 초기화 (관리자)', null, currentUser.userId + ' -> ' + targetUserId);
    
    return {
      success: true,
      message: '비밀번호가 초기화되었습니다.'
    };
  } catch (error) {
    Logger.log('resetUserPassword error: ' + error);
    return {
      success: false,
      message: '비밀번호 초기화 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 모든 사용자의 비밀번호를 기본 비밀번호로 초기화합니다. (관리자 전용, 마이그레이션용)
 * @param {string} defaultPassword - 기본 비밀번호
 * @param {string} sessionToken - 세션 토큰
 * @return {Object} 결과
 */
function initializeAllPasswords(defaultPassword, sessionToken) {
  try {
    // 관리자 권한 확인
    const currentUser = getCurrentSession(sessionToken);
    if (!currentUser || currentUser.role !== CONFIG.ROLES.ADMIN) {
      return {
        success: false,
        message: '관리자만 실행할 수 있습니다.'
      };
    }
    
    if (!defaultPassword) {
      return {
        success: false,
        message: '기본 비밀번호를 입력해주세요.'
      };
    }
    
    const userModel = new UserModel();
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG.SHEETS.USERS);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return {
        success: false,
        message: '사용자 데이터가 없습니다.'
      };
    }
    
    const defaultHash = hashPassword(defaultPassword);
    let updatedCount = 0;
    
    // 비밀번호가 비어있는 사용자만 초기화
    for (let i = 1; i < data.length; i++) {
      const userId = data[i][0];
      const currentHash = data[i][1];
      
      // 비밀번호가 비어있거나 활성화된 사용자만
      if (userId && (!currentHash || currentHash.trim() === '') && data[i][7] === 'Y') {
        sheet.getRange(i + 1, 2).setValue(defaultHash); // B열: 비밀번호해시
        updatedCount++;
      }
    }
    
    new LogService().log('전체 비밀번호 초기화', null, currentUser.userId);
    
    return {
      success: true,
      message: `${updatedCount}명의 비밀번호가 초기화되었습니다.`,
      count: updatedCount
    };
  } catch (error) {
    Logger.log('initializeAllPasswords error: ' + error);
    return {
      success: false,
      message: '비밀번호 초기화 중 오류가 발생했습니다: ' + error.message
    };
  }
}

// ==========================================
// 비즈니스 로직 레이어 (Services.gs)
// ==========================================

class RequestService {
  constructor() {
    this.requestModel = new RequestModel();
    this.userModel = new UserModel();
    this.logService = new LogService();
  }
  
  // 신청 생성
  createRequest(formData, user) {
    try {
      // 1. 사용자 정보 확인
      if (!user) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
      }
      
      // 2. 입력 검증
      this._validateRequestData(formData);
      
      // 3. 중복 접수 체크 (같은 관리번호, 같은 상태가 접수중인 경우)
      const duplicateCheck = this._checkDuplicateRequest(formData, user);
      if (duplicateCheck.isDuplicate) {
        return {
          success: false,
          isDuplicate: true,
          duplicateRequestNo: duplicateCheck.requestNo,
          message: `중복 접수가 감지되었습니다. 신청번호: ${duplicateCheck.requestNo}`
        };
      }
      
      // 4. 신청번호 생성
      const requestNo = this._generateRequestNo();
      
      // 4. 사진 업로드
      let photoUrl = '';
      if (formData.photoBase64) {
        photoUrl = this._uploadPhoto(requestNo, formData.photoBase64);
      }
      
      // 5. 데이터 준비
      const requestData = {
        requestNo: requestNo,
        requestDate: new Date(),
        requesterEmail: user.userId, // 사용자 ID 사용
        requesterName: user.name,
        employeeCode: user.employeeCode,
        team: user.team,
        region: formData.region || user.region,
        itemName: formData.itemName,
        modelName: formData.modelName || '',
        serialNo: formData.serialNo || '',
        quantity: parseInt(formData.quantity),
        assetNo: formData.assetNo,
        deliveryPlace: formData.deliveryPlace || '',
        phone: formData.phone || '',
        company: formData.company || '',
        remarks: formData.remarks || '',
        photoUrl: photoUrl,
        status: CONFIG.STATUS.REQUESTED,
        handler: '',
        handlerRemarks: '',
        orderDate: '',
        expectedDeliveryDate: '',
        receiptDate: '',
        lastModified: new Date(),
        lastModifiedBy: user.userId
      };
      
      // 6. DB 저장
      this.requestModel.create(requestData);
      
      // 7. 로그 기록
      this.logService.log('신청 생성', requestNo, user.userId);
      
      // 8. 관리자 알림
      if (CONFIG.EMAIL.ADMIN_NOTIFICATION) {
        this._notifyAdmins(requestData);
      }
      
      return { 
        success: true, 
        requestNo: requestNo,
        message: '신청이 완료되었습니다.' 
      };
      
    } catch (error) {
      Logger.log('createRequest error: ' + error);
      this.logService.error('신청 생성 실패', null, user ? user.userId : 'unknown', error.message);
      return { 
        success: false, 
        message: error.message 
      };
    }
  }
  
  // 상태 변경
  updateStatus(requestNo, newStatus, remarks, user) {
    try {
      if (!user) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
      }
      
      const request = this.requestModel.findById(requestNo);
      if (!request) {
        throw new Error('신청 건을 찾을 수 없습니다.');
      }
      
      // 권한 체크
      this._checkUpdatePermission(user, request, newStatus);
      
      // 상태 변경
      const updates = {
        status: newStatus,
        lastModified: new Date(),
        lastModifiedBy: user.userId
      };
      
      if (remarks) {
        updates.handlerRemarks = remarks;
      }
      
      // 특정 상태일 때 날짜 기록
      if (newStatus === CONFIG.STATUS.ORDERING) {
        updates.orderDate = new Date();
      }
      
      if (newStatus === CONFIG.STATUS.COMPLETED_CONFIRMED || newStatus === CONFIG.STATUS.COMPLETED_PENDING) {
        if (!request.orderDate) {
          updates.orderDate = new Date();
        }
      }
      
      if (newStatus === CONFIG.STATUS.FINISHED) {
        updates.receiptDate = new Date();
      }
      
      this.requestModel.update(requestNo, updates);
      
      // 로그 기록
      this.logService.log(`상태 변경: ${request.status} → ${newStatus}`, requestNo, user.userId);
      
      // 신청자 알림
      if (CONFIG.EMAIL.USER_NOTIFICATION) {
        this._notifyUser(request, newStatus);
      }
      
      return { 
        success: true, 
        message: '상태가 변경되었습니다.' 
      };
      
    } catch (error) {
      Logger.log('updateStatus error: ' + error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  }
  
  // Private 메서드들
  _validateRequestData(data) {
    if (!data.itemName || data.itemName.trim() === '') {
      throw new Error('품명은 필수 입력 항목입니다.');
    }
    
    if (!data.quantity || parseInt(data.quantity) < 1) {
      throw new Error('수량은 1 이상이어야 합니다.');
    }
    
    if (!data.assetNo || data.assetNo.trim() === '') {
      throw new Error('관리번호는 필수 입력 항목입니다.');
    }
    
    if (!data.photoBase64) {
      throw new Error('사진 첨부는 필수입니다.');
    }
  }
  
  _checkDuplicateRequest(formData, user) {
    try {
      // 같은 관리번호로 접수중인 신청이 있는지 확인
      const requests = this.requestModel.findAll({
        requesterUserId: user.userId,
        assetNo: formData.assetNo
      });
      
      // requests가 배열이 아닌 경우 처리
      if (!Array.isArray(requests)) {
        Logger.log('_checkDuplicateRequest: findAll returned non-array: ' + typeof requests);
        return { isDuplicate: false };
      }
      
      // 접수중 상태인 신청 찾기
      const duplicateRequest = requests.find(req => {
        return req.status === CONFIG.STATUS.REQUESTED;
      });
      
      if (duplicateRequest) {
        return {
          isDuplicate: true,
          requestNo: duplicateRequest.requestNo
        };
      }
      
      return { isDuplicate: false };
    } catch (error) {
      Logger.log('_checkDuplicateRequest error: ' + error);
      // 에러 발생 시 중복이 아닌 것으로 처리 (신청 진행 허용)
      return { isDuplicate: false };
    }
  }
  
  _generateRequestNo() {
    const today = new Date();
    const prefix = Utilities.formatDate(today, 'Asia/Seoul', 'yyMMdd');
    
    const requests = this.requestModel.findAll();
    const todayRequests = requests.filter(r => {
      if (!r.requestNo) return false;
      // requestNo를 문자열로 변환하여 비교
      const requestNoStr = String(r.requestNo);
      return requestNoStr.startsWith(prefix);
    });
    
    let sequence = 1;
    if (todayRequests.length > 0) {
      const lastNo = String(todayRequests[todayRequests.length - 1].requestNo);
      sequence = parseInt(lastNo.substr(6)) + 1;
    }
    
    return prefix + String(sequence).padStart(4, '0');
  }
  
  _uploadPhoto(requestNo, base64Data) {
    try {
      let folderId = getProperty('DRIVE_FOLDER_ID') || CONFIG.DRIVE_FOLDER_ID;
      
      // 폴더가 없으면 자동으로 생성
      if (!folderId) {
        Logger.log('Drive folder not found, creating new folder...');
        try {
          const folder = DriveApp.createFolder('부품발주_사진첨부');
          
          // 폴더 공유 설정 (링크가 있는 사람은 볼 수 있음)
          try {
            folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (sharingError) {
            Logger.log('Folder sharing setting failed: ' + sharingError);
            // 공유 설정 실패해도 계속 진행
          }
          
          folderId = folder.getId();
          
          // Properties에 저장
          setProperty('DRIVE_FOLDER_ID', folderId);
          CONFIG.DRIVE_FOLDER_ID = folderId;
          
          Logger.log('Drive folder created successfully: ' + folderId);
        } catch (createError) {
          Logger.log('Failed to create drive folder: ' + createError);
          throw new Error('Drive 폴더 생성에 실패했습니다: ' + createError.message);
        }
      }
      
      let folder;
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (folderError) {
        Logger.log('Failed to get folder by ID, trying to recreate: ' + folderError);
        // 폴더 ID가 유효하지 않으면 다시 생성
        const newFolder = DriveApp.createFolder('부품발주_사진첨부');
        try {
          newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (e) {}
        folderId = newFolder.getId();
        setProperty('DRIVE_FOLDER_ID', folderId);
        CONFIG.DRIVE_FOLDER_ID = folderId;
        folder = newFolder;
        Logger.log('Drive folder recreated: ' + folderId);
      }
      
      // Base64 디코드
      const contentType = base64Data.split(';')[0].split(':')[1];
      const data = base64Data.split(',')[1];
      const blob = Utilities.newBlob(
        Utilities.base64Decode(data),
        contentType,
        requestNo + '_' + new Date().getTime() + '.jpg'
      );
      
      // Drive에 업로드
      const file = folder.createFile(blob);
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (sharingError) {
        Logger.log('File sharing setting failed: ' + sharingError);
        // 공유 설정 실패해도 계속 진행
      }
      
      return file.getUrl();
      
    } catch (error) {
      Logger.log('Photo upload error: ' + error);
      Logger.log('Photo upload error stack: ' + error.stack);
      throw new Error('사진 업로드에 실패했습니다: ' + error.message);
    }
  }
  
  _checkUpdatePermission(user, request, newStatus) {
    // 관리자는 모든 변경 가능
    if (user.role === CONFIG.ROLES.ADMIN) {
      return;
    }
    
    // 신청자는 '접수중' 상태만 취소 가능
    if (user.userId === request.requesterEmail) {
      if (request.status === CONFIG.STATUS.REQUESTED && 
          newStatus === CONFIG.STATUS.CANCELLED) {
        return;
      }
      
      // 발주완료 상태에서 처리완료로 변경 (수령 확인)
      if ((request.status === CONFIG.STATUS.COMPLETED_CONFIRMED || request.status === CONFIG.STATUS.COMPLETED_PENDING) && 
          newStatus === CONFIG.STATUS.FINISHED) {
        return;
      }
    }
    
    throw new Error('상태를 변경할 권한이 없습니다.');
  }
  
  _notifyAdmins(request) {
    try {
      const admins = this.userModel.findAllAdmins();
      
      admins.forEach(admin => {
        // admin.userId가 이메일 형식일 수도 있으므로 그대로 사용
        const adminEmail = admin.userId.includes('@') ? admin.userId : admin.userId + '@example.com';
        MailApp.sendEmail({
          to: adminEmail,
          subject: '[부품발주] 신규 신청 - ' + request.requestNo,
          body: `신규 부품 발주 신청이 접수되었습니다.\n\n` +
                `신청번호: ${request.requestNo}\n` +
                `신청자: ${request.requesterName} (${request.team})\n` +
                `품명: ${request.itemName}\n` +
                `수량: ${request.quantity}\n` +
                `관리번호: ${request.assetNo}\n\n` +
                `시스템에서 확인해주세요.`,
          name: CONFIG.EMAIL.FROM_NAME
        });
      });
    } catch (error) {
      Logger.log('Admin notification failed: ' + error);
    }
  }
  
  _notifyUser(request, newStatus) {
    try {
      const statusMessages = {
        [CONFIG.STATUS.ORDERING]: '접수 완료되었습니다.',
        [CONFIG.STATUS.COMPLETED_CONFIRMED]: '발주가 완료되었습니다. (납기확인) 수령 확인을 부탁드립니다.',
        [CONFIG.STATUS.COMPLETED_PENDING]: '발주가 완료되었습니다. (납기미정)',
        [CONFIG.STATUS.FINISHED]: '처리가 완료되었습니다.',
        [CONFIG.STATUS.CANCELLED]: '신청이 취소되었습니다.'
      };
      
      const message = statusMessages[newStatus];
      if (message) {
        // requesterEmail이 이메일 형식일 수도 있고 사용자 ID일 수도 있음
        const userEmail = request.requesterEmail.includes('@') ? request.requesterEmail : request.requesterEmail + '@example.com';
        MailApp.sendEmail({
          to: userEmail,
          subject: '[부품발주] 상태 변경 - ' + request.requestNo,
          body: `신청하신 부품 발주 건의 상태가 변경되었습니다.\n\n` +
                `신청번호: ${request.requestNo}\n` +
                `품명: ${request.itemName}\n` +
                `상태: ${newStatus}\n` +
                `${message}\n\n` +
                `담당자 비고: ${request.handlerRemarks || '없음'}`,
          name: CONFIG.EMAIL.FROM_NAME
        });
      }
    } catch (error) {
      Logger.log('User notification failed: ' + error);
    }
  }
}

class LogService {
  constructor() {
    this.sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG.SHEETS.LOGS);
  }
  
  log(action, requestNo, userEmail, details = '') {
    this.sheet.appendRow([
      new Date(),
      'INFO',
      action,
      requestNo || '',
      userEmail,
      details
    ]);
  }
  
  error(action, requestNo, userEmail, errorMessage) {
    this.sheet.appendRow([
      new Date(),
      'ERROR',
      action,
      requestNo || '',
      userEmail,
      errorMessage
    ]);
  }
}

// ==========================================
// 트리거 및 자동화 (Triggers.gs)
// ==========================================

/**
 * 모든 자동화 트리거를 설정합니다.
 * - 매일 새벽 2시 백업
 * - 매시간 발주 지연 체크
 * - 매일 오전 9시 일일 리포트
 */
function setupAllTriggers() {
  // 기존 트리거 전체 삭제
  deleteAllTriggers();
  
  // 1. 매일 새벽 2시 백업
  ScriptApp.newTrigger('performDailyBackup')
    .timeBased()
    .atHour(2)
    .everyDays(1)
    .create();
  
  // 2. 매시간 상태 체크 (지연 알림)
  ScriptApp.newTrigger('checkDelayedRequests')
    .timeBased()
    .everyHours(1)
    .create();
  
  // 3. 매일 오전 9시 일일 리포트
  ScriptApp.newTrigger('sendDailyReport')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();
  
  Logger.log('All triggers configured successfully');
}

/**
 * 모든 트리거를 삭제합니다.
 * @param {string|null} functionName - 특정 함수의 트리거만 삭제하려면 함수 이름 지정 (선택사항)
 */
function deleteAllTriggers(functionName = null) {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (!functionName || trigger.getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

// 매일 백업 수행
function performDailyBackup() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const backupFolderId = getProperty('BACKUP_FOLDER_ID');
    
    if (!backupFolderId) {
      // 백업 폴더 생성
      const backupFolder = DriveApp.createFolder('부품발주_백업');
      setProperty('BACKUP_FOLDER_ID', backupFolder.getId());
      try {
        backupFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {
        Logger.log('Backup folder sharing setting failed: ' + e);
      }
    }
    
    const backupFolder = DriveApp.getFolderById(getProperty('BACKUP_FOLDER_ID'));
    
    // 스프레드시트 복사
    const today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd');
    const backupName = `부품발주_백업_${today}`;
    const backup = ss.copy(backupName);
    
    // 백업 폴더로 이동
    DriveApp.getFileById(backup.getId()).moveTo(backupFolder);
    
    // 30일 이전 백업 삭제
    deleteOldBackups(backupFolder, 30);
    
    Logger.log('Daily backup completed: ' + backupName);
    
  } catch (error) {
    Logger.log('Backup failed: ' + error);
    sendErrorNotification('백업 실패', error.message);
  }
}

function deleteOldBackups(folder, daysToKeep) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().startsWith('부품발주_백업_') && 
        file.getDateCreated() < cutoffDate) {
      file.setTrashed(true);
    }
  }
}

// 지연 건 체크 및 알림
function checkDelayedRequests() {
  try {
    const requestModel = new RequestModel();
    const requests = requestModel.findAll({
      status: CONFIG.STATUS.ORDERING
    });
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const delayedRequests = requests.filter(req => {
      if (!req.orderDate) return false;
      const orderDate = new Date(req.orderDate);
      return orderDate < threeDaysAgo;
    });
    
    if (delayedRequests.length > 0) {
      notifyDelayedRequests(delayedRequests);
    }
  } catch (error) {
    Logger.log('checkDelayedRequests error: ' + error);
  }
}

function notifyDelayedRequests(requests) {
  const admins = new UserModel().findAllAdmins();
  
  requests.forEach(req => {
    admins.forEach(admin => {
      try {
        // admin.userId가 이메일 형식일 수도 있으므로 그대로 사용
        const adminEmail = admin.userId && admin.userId.includes('@') ? admin.userId : (admin.userId || '') + '@example.com';
        MailApp.sendEmail({
          to: adminEmail,
          subject: '[부품발주] 발주 지연 알림 - ' + req.requestNo,
          body: `발주가 3일 이상 지연된 건이 있습니다.\n\n` +
                `신청번호: ${req.requestNo}\n` +
                `품명: ${req.itemName}\n` +
                `신청자: ${req.requesterName}\n` +
                `발주일시: ${formatDate(req.orderDate)}\n\n` +
                `확인 부탁드립니다.`,
          name: CONFIG.EMAIL.FROM_NAME
        });
      } catch (error) {
        Logger.log('Delayed notification failed: ' + error);
      }
    });
  });
}

/**
 * 일일 신청 현황 리포트를 관리자에게 이메일로 전송합니다.
 * 매일 오전 9시에 자동 실행됩니다.
 */
function sendDailyReport() {
  try {
    const requestModel = new RequestModel();
    const today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
    
    const requests = requestModel.findAll();
    const todayRequests = requests.filter(req => {
      const reqDate = Utilities.formatDate(new Date(req.requestDate), 'Asia/Seoul', 'yyyy-MM-dd');
      return reqDate === today;
    });
    
    const stats = {
      total: todayRequests.length,
      byStatus: {}
    };
    
    todayRequests.forEach(req => {
      stats.byStatus[req.status] = (stats.byStatus[req.status] || 0) + 1;
    });
    
    // 관리자들에게 리포트 전송
    const admins = new UserModel().findAllAdmins();
    admins.forEach(admin => {
      try {
        // admin.userId가 이메일 형식일 수도 있으므로 그대로 사용
        const adminEmail = admin.userId && admin.userId.includes('@') ? admin.userId : (admin.userId || '') + '@example.com';
        MailApp.sendEmail({
          to: adminEmail,
          subject: '[부품발주] 일일 리포트 - ' + today,
          body: `일일 신청 현황 리포트\n\n` +
                `날짜: ${today}\n` +
                `전체 신청: ${stats.total}건\n\n` +
                `상태별 현황:\n` +
                Object.entries(stats.byStatus).map(([status, count]) => 
                  `  ${status}: ${count}건`
                ).join('\n'),
          name: CONFIG.EMAIL.FROM_NAME
        });
      } catch (error) {
        Logger.log('Daily report failed: ' + error);
      }
    });
  } catch (error) {
    Logger.log('sendDailyReport error: ' + error);
  }
}

/**
 * 시스템 에러 발생 시 관리자에게 알림을 전송합니다.
 * @param {string} errorType - 에러 유형
 * @param {string} errorMessage - 에러 메시지
 * @param {Object} context - 추가 컨텍스트 정보 (선택사항)
 */
function sendErrorNotification(errorType, errorMessage, context = {}) {
  try {
    const admins = new UserModel().findAllAdmins();
    
    const subject = `[부품발주시스템] 에러 발생: ${errorType}`;
    const body = `시스템 에러가 발생했습니다.\n\n` +
                 `에러 유형: ${errorType}\n` +
                 `에러 메시지: ${errorMessage}\n` +
                 `발생 시각: ${new Date().toISOString()}\n` +
                 `컨텍스트:\n${JSON.stringify(context, null, 2)}\n\n` +
                 `시스템을 확인해주세요.`;
    
    admins.forEach(admin => {
      try {
        // admin.userId가 이메일 형식일 수도 있으므로 그대로 사용
        const adminEmail = admin.userId && admin.userId.includes('@') ? admin.userId : (admin.userId || '') + '@example.com';
        MailApp.sendEmail({
          to: adminEmail,
          subject: subject,
          body: body,
          name: CONFIG.EMAIL.FROM_NAME
        });
      } catch (e) {
        Logger.log('Failed to send error notification: ' + e);
      }
    });
  } catch (error) {
    Logger.log('sendErrorNotification failed: ' + error);
  }
}

// ==========================================
// 메인 엔트리 포인트 및 Public API
// ==========================================

// 웹 앱 진입점
function doGet(e) {
  try {
    // e 또는 e.parameter가 없을 수 있으므로 안전하게 처리
    if (!e) {
      e = {};
    }
    if (!e.parameter) {
      e.parameter = {};
    }
    
    // URL 파라미터 확인
    const page = e.parameter.page;
    const sessionToken = e.parameter.token;
    
    // 실제 웹 앱 URL 가져오기
    const webAppUrl = getWebAppUrl();
    
    // 로그인 페이지 요청인 경우
    if (page === 'login' || !page) {
      const template = HtmlService.createTemplateFromFile('LoginPage');
      // 웹 앱 URL이 있으면 템플릿에 전달
      if (webAppUrl && webAppUrl.trim() !== '') {
        template.webAppUrl = webAppUrl;
      }
      return template
        .evaluate()
        .setTitle('로그인');
    }
    
    // 세션 확인
    const user = getCurrentSession(sessionToken);
    
    if (!user) {
      // 세션이 없으면 로그인 페이지로 리다이렉트
      Logger.log('No valid session');
      return HtmlService.createTemplateFromFile('LoginPage')
        .evaluate()
        .setTitle('로그인');
    }
    
    // 디버깅: 사용자 정보 로그
    Logger.log('Current user: ' + user.userId + ', Role: ' + user.role);
    
    // 페이지별 라우팅
    if (page === 'admin' || page === 'admin-dashboard' || (user.role === CONFIG.ROLES.ADMIN && !page)) {
      // 관리자 대시보드
      return HtmlService.createTemplateFromFile('AdminDashboardPage')
        .evaluate()
        .setTitle('관리자 대시보드');
    } else if (page === 'admin-requests') {
      // 전체 신청 목록
      return HtmlService.createTemplateFromFile('AdminPage')
        .evaluate()
        .setTitle('전체 신청 목록');
    } else if (page === 'admin-detail') {
      // 신청 상세 관리
      return HtmlService.createTemplateFromFile('AdminRequestDetailPage')
        .evaluate()
        .setTitle('신청 상세 관리');
    } else if (page === 'admin-statistics') {
      // 통계 및 리포트
      return HtmlService.createTemplateFromFile('AdminStatisticsPage')
        .evaluate()
        .setTitle('통계 및 리포트');
    } else if (page === 'admin-master') {
      // 기준정보 관리
      return HtmlService.createTemplateFromFile('AdminMasterPage')
        .evaluate()
        .setTitle('기준정보 관리');
    } else if (page === 'my-info') {
      // 내 정보
      return HtmlService.createTemplateFromFile('MyInfoPage')
        .evaluate()
        .setTitle('내 정보');
    } else if (page === 'user' || page === 'dashboard' || (user.role === CONFIG.ROLES.USER && !page)) {
      // 신청자 대시보드 (명세서 기반)
      return HtmlService.createTemplateFromFile('UserDashboard')
        .evaluate()
        .setTitle('부품발주 대시보드');
    } else if (page === 'my-requests') {
      // 내 신청 목록
      return HtmlService.createTemplateFromFile('MyRequestsPage')
        .evaluate()
        .setTitle('내 신청 목록');
    } else if (page === 'new-request') {
      // 신청 등록 화면
      return HtmlService.createTemplateFromFile('NewRequestPage')
        .evaluate()
        .setTitle('신청 등록');
    } else if (page === 'detail') {
      // 신청 상세 조회
      return HtmlService.createTemplateFromFile('RequestDetailPage')
        .evaluate()
        .setTitle('신청 상세');
    } else {
      // 기본: 역할에 따라 페이지 이동
      if (user.role === CONFIG.ROLES.ADMIN) {
        return HtmlService.createTemplateFromFile('AdminDashboardPage')
          .evaluate()
          .setTitle('관리자 대시보드');
      } else {
        return HtmlService.createTemplateFromFile('UserDashboard')
          .evaluate()
          .setTitle('부품발주 대시보드');
      }
    }
  } catch (error) {
    Logger.log('doGet error: ' + error);
    Logger.log('doGet error stack: ' + error.stack);
    
    // 에러 상세 정보를 포함한 HTML 반환
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>오류</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .error { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>페이지 로드 오류</h2>
          <p><strong>오류 메시지:</strong> ${error.message || '알 수 없는 오류'}</p>
          <p><strong>오류 타입:</strong> ${error.name || 'Error'}</p>
          <button onclick="window.location.href='?page=login'">로그인 페이지로 이동</button>
        </div>
      </body>
      </html>
    `;
    
    return HtmlService.createHtmlOutput(errorHtml).setTitle('오류');
  }
}

// ==========================================
// 사용자 API
// ==========================================

/**
 * 웹 앱의 실제 배포 URL을 반환합니다.
 * @return {string} 웹 앱 배포 URL
 */
/**
 * 배포된 웹 앱의 실제 URL을 반환합니다.
 * @return {string} 웹 앱 URL
 */
function getWebAppUrl() {
  try {
    const service = ScriptApp.getService();
    if (service) {
      return service.getUrl() || '';
    }
    return '';
  } catch (error) {
    Logger.log('getWebAppUrl error: ' + error);
    return '';
  }
}

/**
 * 현재 로그인한 사용자 정보를 조회합니다. (세션 기반)
 * @param {string} sessionToken - 세션 토큰
 * @return {Object|null} 사용자 정보 객체 또는 null
 */
function getCurrentUser(sessionToken) {
  try {
    return getCurrentSession(sessionToken);
  } catch (error) {
    Logger.log('getCurrentUser error: ' + error);
    return null;
  }
}

/**
 * 현재 사용자의 신청 목록을 조회합니다.
 * @param {Object} filter - 필터 옵션 (status, dateFrom, dateTo 등)
 * @param {string} sessionToken - 세션 토큰
 * @return {Array} 신청 목록 배열
 */
function getMyRequests(filter = {}, sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user) {
      log('ERROR', 'getMyRequests: User not found');
      return [];
    }
    
    // 사용자 ID 기반으로 필터링
    filter.requesterUserId = user.userId;
    filter.requesterEmail = user.userId; // 하위 호환성
    
    const requestModel = new RequestModel();
    
    // 시트 존재 여부 확인
    if (!requestModel.sheet) {
      log('WARN', 'getMyRequests: Request sheet not found');
      return [];
    }
    
    const requests = requestModel.findAll(filter);
    
    // requests가 배열이 아닌 경우 처리
    if (!Array.isArray(requests)) {
      log('ERROR', 'getMyRequests: findAll returned non-array: ' + typeof requests);
      return [];
    }
    
    // 프론트엔드용 포맷팅
    return requests.map(req => ({
      requestNo: req.requestNo,
      requestDate: formatDate(req.requestDate, 'yyyy-MM-dd HH:mm'),
      itemName: req.itemName,
      quantity: req.quantity,
      assetNo: req.assetNo,
      status: req.status,
      handler: req.handler || '',
      handlerRemarks: req.handlerRemarks || '',
      photoUrl: req.photoUrl,
      deliveryPlace: req.deliveryPlace || '',
      canCancel: req.status === CONFIG.STATUS.REQUESTED,
      canConfirmReceipt: req.status === CONFIG.STATUS.COMPLETED_CONFIRMED || req.status === CONFIG.STATUS.COMPLETED_PENDING
    })).reverse(); // 최신순
  } catch (error) {
    log('ERROR', 'getMyRequests error: ' + error);
    return [];
  }
}

/**
 * 새로운 부품 발주 신청을 생성합니다.
 * @param {Object} formData - 신청 데이터 (품명, 수량, 관리번호, 사진 등)
 * @param {string} sessionToken - 세션 토큰
 * @return {Object} 결과 객체 {success: boolean, requestNo: string, message: string}
 */
function createRequest(formData, sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user) {
      log('ERROR', 'createRequest: User not found');
      return {
        success: false,
        message: '로그인이 필요합니다.'
      };
    }
    
    const service = new RequestService();
    const result = service.createRequest(formData, user);
    
    // result가 객체인지 확인
    if (!result || typeof result !== 'object') {
      log('ERROR', 'createRequest: Invalid result from service: ' + typeof result);
      return {
        success: false,
        message: '신청 처리 중 오류가 발생했습니다.'
      };
    }
    
    // 캐시 무효화 (신청 생성 시)
    if (result.success) {
      const cacheManager = new CacheManager();
      // 관련 캐시 제거
      cacheManager.remove('request_stats_' + user.userId);
      cacheManager.remove('my_requests_' + user.userId);
      // getAllRequests 캐시는 패턴 매칭이 어려우므로 TTL에 의존
    }
    
    return result;
  } catch (error) {
    log('ERROR', 'createRequest error: ' + error);
    return {
      success: false,
      message: error.message || '신청 처리 중 오류가 발생했습니다.',
      technical: error.toString()
    };
  }
}

/**
 * 사용자의 신청 통계를 조회합니다.
 * @param {string} sessionToken - 세션 토큰
 * @return {Object} 통계 객체 {requested, inProgress, completed, total}
 */
function getRequestStats(sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user) {
      log('ERROR', 'getRequestStats: User not found');
      return { requested: 0, inProgress: 0, completed: 0, total: 0 };
    }
    
    // 캐시 확인
    const cacheManager = new CacheManager();
    const cacheKey = 'request_stats_' + user.userId;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    const requestModel = new RequestModel();
    
    // 시트 존재 여부 확인
    if (!requestModel.sheet) {
      log('WARN', 'getRequestStats: Request sheet not found');
      return { requested: 0, inProgress: 0, completed: 0, total: 0 };
    }
    
    const requests = requestModel.findAll({ requesterUserId: user.userId });
    
    // requests가 배열이 아닌 경우 처리
    if (!Array.isArray(requests)) {
      log('ERROR', 'getRequestStats: findAll returned non-array: ' + typeof requests);
      return { requested: 0, inProgress: 0, completed: 0, total: 0 };
    }
    
    const stats = {
      requested: 0,
      inProgress: 0,
      completed: 0,
      total: requests.length
    };
    
    requests.forEach(req => {
      // 접수취소 상태는 카운트에서 제외
      if (req.status === CONFIG.STATUS.CANCELLED) {
        return;
      }
      
      if (req.status === CONFIG.STATUS.REQUESTED) {
        stats.requested++;
      } else if (req.status === CONFIG.STATUS.ORDERING || 
                 req.status === CONFIG.STATUS.COMPLETED_CONFIRMED || 
                 req.status === CONFIG.STATUS.COMPLETED_PENDING) {
        stats.inProgress++;
      } else if (req.status === CONFIG.STATUS.FINISHED) {
        stats.completed++;
      }
    });
    
    // 캐시 저장 (TTL: 60초)
    cacheManager.set(cacheKey, stats, 60);
    
    return stats;
  } catch (error) {
    log('ERROR', 'getRequestStats error: ' + error);
    return { requested: 0, inProgress: 0, completed: 0, total: 0 };
  }
}

/**
 * 사용자의 알림을 조회합니다.
 * @param {string} sessionToken - 세션 토큰
 * @return {Array} 알림 배열
 */
function getNotifications(sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user) {
      log('ERROR', 'getNotifications: User not found');
      return [];
    }
    
    // 현재는 간단한 알림 로직: 사용자의 신청 중 상태 변경된 것들
    const requestModel = new RequestModel();
    
    // 시트 존재 여부 확인
    if (!requestModel.sheet) {
      log('WARN', 'getNotifications: Request sheet not found');
      return [];
    }
    
    const requests = requestModel.findAll({ requesterUserId: user.userId });
    
    // requests가 배열이 아닌 경우 처리
    if (!Array.isArray(requests)) {
      log('ERROR', 'getNotifications: findAll returned non-array: ' + typeof requests);
      return [];
    }
    
    const notifications = [];
    
    // 최근 7일 이내 상태가 변경된 신청들
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    requests.forEach(req => {
      // 최근 7일 이내 상태가 변경된 신청들에 대해 알림 생성
      if (req.lastModifiedDate && new Date(req.lastModifiedDate) > sevenDaysAgo) {
        // 상태별 알림 메시지 생성
        let notification = null;
        
        if (req.status === CONFIG.STATUS.ORDERING) {
          notification = {
            type: 'info',
            title: '접수 완료',
            message: `[${req.requestNo}] ${req.itemName} 발주가 진행 중입니다.`,
            date: req.lastModifiedDate,
            requestNo: req.requestNo
          };
        } else if (req.status === CONFIG.STATUS.COMPLETED_CONFIRMED) {
          notification = {
            type: 'success',
            title: '발주 완료',
            message: `[${req.requestNo}] ${req.itemName} 발주가 완료되었습니다. (납기확인) 수령 확인해주세요.`,
            date: req.lastModifiedDate,
            requestNo: req.requestNo
          };
        } else if (req.status === CONFIG.STATUS.COMPLETED_PENDING) {
          notification = {
            type: 'success',
            title: '발주 완료',
            message: `[${req.requestNo}] ${req.itemName} 발주가 완료되었습니다. (납기미정)`,
            date: req.lastModifiedDate,
            requestNo: req.requestNo
          };
        } else if (req.status === CONFIG.STATUS.FINISHED) {
          notification = {
            type: 'success',
            title: '처리 완료',
            message: `[${req.requestNo}] ${req.itemName} 신청 처리가 완료되었습니다.`,
            date: req.lastModifiedDate,
            requestNo: req.requestNo
          };
        } else if (req.status === CONFIG.STATUS.CANCELLED) {
          notification = {
            type: 'warning',
            title: '신청 취소',
            message: `[${req.requestNo}] ${req.itemName} 신청이 취소되었습니다.`,
            date: req.lastModifiedDate,
            requestNo: req.requestNo
          };
        }
        
        if (notification) {
          notifications.push(notification);
        }
      }
    });
    
    return notifications.slice(0, 10); // 최대 10개
  } catch (error) {
    Logger.log('getNotifications error: ' + error);
    Logger.log('getNotifications error stack: ' + error.stack);
    return []; // 에러 발생 시 빈 배열 반환
  }
}

/**
 * 수령 확인
 * @param {string} requestNo - 신청번호
 * @param {string} sessionToken - 세션 토큰
 * @return {Object} 결과 객체 {success: boolean, message: string}
 */
function confirmReceipt(requestNo, sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }
    
    const service = new RequestService();
    return service.updateStatus(requestNo, CONFIG.STATUS.FINISHED, '신청자 수령 확인', user);
  } catch (error) {
    Logger.log('confirmReceipt error: ' + error);
    return ErrorHandler.handle(error, 'confirmReceipt');
  }
}

/**
 * 접수중인 신청을 취소합니다.
 * @param {string} requestNo - 신청번호
 * @param {string} sessionToken - 세션 토큰
 * @return {Object} 결과 객체 {success: boolean, message: string}
 */
function cancelRequest(requestNo, sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }
    
    const service = new RequestService();
    return service.updateStatus(requestNo, CONFIG.STATUS.CANCELLED, '신청자 취소', user);
  } catch (error) {
    Logger.log('cancelRequest error: ' + error);
    return ErrorHandler.handle(error, 'cancelRequest');
  }
}

// ==========================================
// 관리자 API
// ==========================================

/**
 * 대시보드 통계 조회 (관리자 전용)
 * @param {string} sessionToken - 세션 토큰
 * @return {Object} 통계 객체
 */
function getDashboardStats(sessionToken) {
  try {
    Logger.log('getDashboardStats: START');
    const user = getCurrentUser(sessionToken);
    if (!user || user.role !== CONFIG.ROLES.ADMIN) {
      throw new Error('관리자만 조회할 수 있습니다.');
    }
    
    const requestModel = new RequestModel();
    const allRequests = requestModel.findAll();
    Logger.log('getDashboardStats: Total requests = ' + allRequests.length);
    
    const today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
    Logger.log('getDashboardStats: Today = ' + today);
    
    const stats = {
      today: {
        new: 0,
        requested: 0,
        inProgress: 0,
        delayed: 0,
        completed: 0,
        total: 0
      }
    };
    
    // 날짜 비교를 안전하게 처리
    const todayRequests = allRequests.filter(req => {
      if (!req.requestDate) return false;
      
      try {
        let reqDateStr;
        if (req.requestDate instanceof Date) {
          reqDateStr = Utilities.formatDate(req.requestDate, 'Asia/Seoul', 'yyyy-MM-dd');
        } else {
          // 문자열인 경우 날짜 부분만 추출
          const dateStr = String(req.requestDate);
          if (dateStr.includes('.')) {
            // "2026. 1. 7 오전 9:45:44" 형식
            const parts = dateStr.split(' ')[0].split('.').map(p => p.trim());
            if (parts.length >= 3) {
              const year = parts[0];
              const month = parts[1].padStart(2, '0');
              const day = parts[2].padStart(2, '0');
              reqDateStr = `${year}-${month}-${day}`;
            } else {
              reqDateStr = dateStr.split(' ')[0];
            }
          } else {
            reqDateStr = dateStr.split(' ')[0];
          }
        }
        
        return reqDateStr === today;
      } catch (e) {
        Logger.log('Date comparison error for request: ' + e);
        return false;
      }
    });
    
    Logger.log('getDashboardStats: Today requests = ' + todayRequests.length);
    stats.today.total = todayRequests.length;
    
    todayRequests.forEach(req => {
      if (req.status === '접수중') stats.today.requested++;
      else if (req.status === '접수완료') stats.today.inProgress++;
      else if (req.status === '발주완료(납기확인)' || req.status === '발주완료(납기미정)') {
        stats.today.inProgress++;
        stats.today.completed++;
      }
      else if (req.status === '처리완료') stats.today.completed++;
    });
    
    Logger.log('getDashboardStats: Stats = ' + JSON.stringify(stats));
    return stats;
  } catch (error) {
    Logger.log('getDashboardStats error: ' + error);
    Logger.log('getDashboardStats stack: ' + error.stack);
    // 에러 시 기본 통계 객체 반환 (ErrorHandler 객체 대신)
    return {
      today: {
        new: 0,
        requested: 0,
        inProgress: 0,
        delayed: 0,
        completed: 0,
        total: 0
      }
    };
  }
}

/**
 * 긴급 처리 필요 건 조회 (관리자 전용)
 * @param {string} sessionToken - 세션 토큰
 * @return {Array} 긴급 처리 필요 건 목록
 */
function getUrgentRequests(sessionToken) {
  try {
    Logger.log('getUrgentRequests: START');
    const user = getCurrentUser(sessionToken);
    if (!user || user.role !== CONFIG.ROLES.ADMIN) {
      throw new Error('관리자만 조회할 수 있습니다.');
    }
    
    const requestModel = new RequestModel();
    const requests = requestModel.findAll({ status: CONFIG.STATUS.REQUESTED });
    Logger.log('getUrgentRequests: Found ' + requests.length + ' 접수중 requests');
    
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const oneDayAgoStr = Utilities.formatDate(oneDayAgo, 'Asia/Seoul', 'yyyy-MM-dd');
    Logger.log('getUrgentRequests: One day ago = ' + oneDayAgoStr);
    
    const urgentRequests = requests.filter(req => {
      if (!req.requestDate) return false;
      
      try {
        let reqDateStr;
        if (req.requestDate instanceof Date) {
          reqDateStr = Utilities.formatDate(req.requestDate, 'Asia/Seoul', 'yyyy-MM-dd');
        } else {
          // 문자열인 경우 날짜 부분만 추출
          const dateStr = String(req.requestDate);
          if (dateStr.includes('.')) {
            const parts = dateStr.split(' ')[0].split('.').map(p => p.trim());
            if (parts.length >= 3) {
              const year = parts[0];
              const month = parts[1].padStart(2, '0');
              const day = parts[2].padStart(2, '0');
              reqDateStr = `${year}-${month}-${day}`;
            } else {
              reqDateStr = dateStr.split(' ')[0];
            }
          } else {
            reqDateStr = dateStr.split(' ')[0];
          }
        }
        
        return reqDateStr < oneDayAgoStr;
      } catch (e) {
        Logger.log('Date comparison error: ' + e);
        return false;
      }
    });
    
    Logger.log('getUrgentRequests: Urgent = ' + urgentRequests.length);
    
    // 프론트엔드용 포맷팅
    return urgentRequests.map(req => ({
      requestNo: req.requestNo,
      itemName: req.itemName,
      status: req.status,
      requesterName: req.requesterName,
      requestDate: req.requestDate
    }));
  } catch (error) {
    Logger.log('getUrgentRequests error: ' + error);
    Logger.log('getUrgentRequests stack: ' + error.stack);
    // 에러 시 빈 배열 반환 (ErrorHandler 객체 대신)
    return [];
  }
}

/**
 * 지연 건 조회 (관리자 전용)
 * @param {string} sessionToken - 세션 토큰
 * @return {Array} 지연 건 목록
 */
function getDelayedRequests(sessionToken) {
  try {
    Logger.log('getDelayedRequests: START');
    const user = getCurrentUser(sessionToken);
    if (!user || user.role !== CONFIG.ROLES.ADMIN) {
      throw new Error('관리자만 조회할 수 있습니다.');
    }
    
    const requestModel = new RequestModel();
    const requests = requestModel.findAll();
    Logger.log('getDelayedRequests: Total requests = ' + requests.length);
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = Utilities.formatDate(threeDaysAgo, 'Asia/Seoul', 'yyyy-MM-dd');
    Logger.log('getDelayedRequests: Three days ago = ' + threeDaysAgoStr);
    
    const delayedRequests = [];
    
    requests.forEach(req => {
      if (req.status === CONFIG.STATUS.ORDERING && req.orderDate) {
        try {
          let orderDateStr;
          if (req.orderDate instanceof Date) {
            orderDateStr = Utilities.formatDate(req.orderDate, 'Asia/Seoul', 'yyyy-MM-dd');
          } else {
            // 문자열인 경우 날짜 부분만 추출
            const dateStr = String(req.orderDate);
            if (dateStr.includes('.')) {
              const parts = dateStr.split(' ')[0].split('.').map(p => p.trim());
              if (parts.length >= 3) {
                const year = parts[0];
                const month = parts[1].padStart(2, '0');
                const day = parts[2].padStart(2, '0');
                orderDateStr = `${year}-${month}-${day}`;
              } else {
                orderDateStr = dateStr.split(' ')[0];
              }
            } else {
              orderDateStr = dateStr.split(' ')[0];
            }
          }
          
          if (orderDateStr < threeDaysAgoStr) {
            // 지연 일수 계산
            const orderDate = new Date(orderDateStr);
            const delayDays = Math.floor((new Date() - orderDate) / (1000 * 60 * 60 * 24));
            delayedRequests.push({
              requestNo: req.requestNo,
              itemName: req.itemName,
              requesterName: req.requesterName,
              handler: req.handler,
              delayDays: delayDays
            });
          }
        } catch (e) {
          Logger.log('Date comparison error for orderDate: ' + e);
        }
      }
    });
    
    Logger.log('getDelayedRequests: Delayed = ' + delayedRequests.length);
    return delayedRequests;
  } catch (error) {
    Logger.log('getDelayedRequests error: ' + error);
    Logger.log('getDelayedRequests stack: ' + error.stack);
    // 에러 시 빈 배열 반환 (ErrorHandler 객체 대신)
    return [];
  }
}

/**
 * 전체 신청 목록을 조회합니다. (관리자 전용)
 * @param {Object} filter - 필터 옵션 (status, region, dateFrom, dateTo 등)
 * @param {string} sessionToken - 세션 토큰
 * @return {Array} 신청 목록 배열
 */
function getAllRequests(filter = {}, sessionToken) {
  try {
    log('DEBUG', 'getAllRequests: START');
    
    const user = getCurrentUser(sessionToken);
    if (!user) {
      log('ERROR', 'getAllRequests: No user found');
      return [];
    }
    
    if (user.role !== CONFIG.ROLES.ADMIN) {
      log('ERROR', 'getAllRequests: Not admin, role = ' + user.role);
      return [];
    }
    
    // 캐시 키 생성 (필터 및 페이징 정보 포함)
    const cacheKey = 'all_requests_' + JSON.stringify({
      status: filter.status || '',
      region: filter.region || '',
      dateFrom: filter.dateFrom || '',
      dateTo: filter.dateTo || '',
      page: filter.page || 1,
      pageSize: filter.pageSize || CONFIG.PAGE_SIZE
    });
    
    const cacheManager = new CacheManager();
    
    // 캐시 확인 (TTL: 60초)
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      log('DEBUG', 'getAllRequests: Using cache');
      return cached;
    }
    
    const requestModel = new RequestModel();
    if (!requestModel.sheet) {
      log('WARN', 'getAllRequests: Request sheet not found');
      return [];
    }
    
    // 서버 측 필터링 및 페이징 옵션
    const serverFilter = {
      status: filter.status,
      region: filter.region,
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo
    };
    
    const options = {
      page: filter.page || 1,
      pageSize: filter.pageSize || CONFIG.PAGE_SIZE,
      sortBy: filter.sortBy || 'requestDate',
      sortOrder: filter.sortOrder || 'desc'
    };
    
    log('DEBUG', 'getAllRequests: Calling findAll with server filter and pagination');
    const result = requestModel.findAll(serverFilter, options);
    
    // 결과가 페이징 형식인지 확인
    let requests;
    if (result && result.data && Array.isArray(result.data)) {
      requests = result.data;
    } else if (Array.isArray(result)) {
      requests = result;
    } else {
      log('ERROR', 'getAllRequests: Invalid result format');
      return [];
    }
    
    if (!requests || requests.length === 0) {
      log('DEBUG', 'getAllRequests: No requests found');
      return [];
    }
    
    // 프론트엔드용 포맷팅
    const formatDateField = function(dateValue) {
      if (!dateValue) return '';
      try {
        if (dateValue instanceof Date) {
          return Utilities.formatDate(dateValue, 'Asia/Seoul', 'yyyy. M. d a hh:mm:ss');
        }
        return String(dateValue);
      } catch (e) {
        return String(dateValue);
      }
    };
    
    const formatted = requests.map((req, index) => {
      try {
        return {
          rowIndex: req._rowIndex,
          requestNo: req.requestNo,
          requestDate: formatDateField(req.requestDate),
          requester: req.requesterName,
          requesterName: req.requesterName,
          requesterEmail: req.requesterEmail,
          team: req.team,
          region: req.region,
          itemName: req.itemName,
          modelName: req.modelName,
          serialNo: req.serialNo,
          quantity: req.quantity,
          assetNo: req.assetNo,
          deliveryPlace: req.deliveryPlace,
          phone: req.phone,
          company: req.company,
          remarks: req.remarks,
          status: req.status,
          handler: req.handler || '',
          photoUrl: req.photoUrl,
          handlerRemarks: req.handlerRemarks || '',
          orderDate: formatDateField(req.orderDate),
          expectedDeliveryDate: formatDateField(req.expectedDeliveryDate),
          receiptDate: formatDateField(req.receiptDate),
          completedDate: formatDateField(req.receiptDate || req.orderDate)
        };
      } catch (formatError) {
        log('ERROR', 'getAllRequests: Format error for request ' + index + ': ' + formatError);
        return null;
      }
    }).filter(r => r !== null);
    
    // 반환 직전 확인
    if (!formatted || !Array.isArray(formatted)) {
      log('ERROR', 'getAllRequests: formatted is not an array!');
      return [];
    }
    
    // 캐시 저장 (TTL: 60초)
    cacheManager.set(cacheKey, formatted, 60);
    
    log('DEBUG', 'getAllRequests: SUCCESS - Returning ' + formatted.length + ' items');
    return formatted;
  } catch (error) {
    log('ERROR', 'getAllRequests: EXCEPTION - ' + error.toString());
    return [];
  }
}

/**
 * 신청 건에 담당자를 배정합니다. (관리자 전용)
 * @param {string} requestNo - 신청번호
 * @param {string} handlerEmail - 담당자 이메일
 * @param {string} sessionToken - 세션 토큰
 * @return {Object} 결과 객체 {success: boolean, message: string}
 */
function assignHandler(requestNo, handlerEmail, sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user || user.role !== CONFIG.ROLES.ADMIN) {
      throw new Error('관리자만 배정할 수 있습니다.');
    }
    
    const requestModel = new RequestModel();
    const handler = new UserModel().findByEmail(handlerEmail);
    
    if (!handler) {
      throw new Error('담당자를 찾을 수 없습니다.');
    }
    
    const result = requestModel.update(requestNo, {
      handler: handler.name,
      lastModified: new Date(),
      lastModifiedBy: user.userId
    });
    
    if (result) {
      new LogService().log('담당자 배정: ' + handler.name, requestNo, user.userId);
      return { success: true, message: '담당자가 배정되었습니다.' };
    } else {
      throw new Error('신청 건을 찾을 수 없습니다.');
    }
  } catch (error) {
    Logger.log('assignHandler error: ' + error);
    return ErrorHandler.handle(error, 'assignHandler');
  }
}

/**
 * 신청 건의 상태를 변경합니다.
 * @param {string} requestNo - 신청번호
 * @param {string} newStatus - 새로운 상태
 * @param {string} remarks - 담당자 비고 (선택사항)
 * @param {string} sessionToken - 세션 토큰
 * @param {string} handler - 담당자 (선택사항)
 * @param {string} expectedDeliveryDate - 예상납기일 (선택사항)
 * @return {Object} 결과 객체 {success: boolean, message: string}
 */
function updateRequestStatus(requestNo, newStatus, remarks, sessionToken, handler, expectedDeliveryDate) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user || user.role !== CONFIG.ROLES.ADMIN) {
      throw new Error('관리자만 변경할 수 있습니다.');
    }
    
    const service = new RequestService();
    const result = service.updateStatus(requestNo, newStatus, remarks, user);
    
    // 추가 업데이트 (handler, expectedDeliveryDate)
    if (result.success) {
      const requestModel = new RequestModel();
      const updates = {};
      
      if (handler) {
        updates.handler = handler;
      }
      
      if (expectedDeliveryDate) {
        updates.expectedDeliveryDate = expectedDeliveryDate;
      }
      
      if (Object.keys(updates).length > 0) {
        updates.lastModified = new Date();
        updates.lastModifiedBy = user.userId;
        requestModel.update(requestNo, updates);
      }
      
      // 캐시 무효화 (상태 변경 시)
      const cacheManager = new CacheManager();
      // 신청 건 조회 캐시 제거
      cacheManager.remove('request_' + requestNo);
      // getAllRequests 캐시는 TTL에 의존 (패턴 매칭 어려움)
      // 통계 캐시는 사용자별로 관리되므로 해당 사용자 캐시만 제거
      const request = requestModel.findById(requestNo);
      if (request && request.requesterEmail) {
        cacheManager.remove('request_stats_' + request.requesterEmail);
        cacheManager.remove('my_requests_' + request.requesterEmail);
      }
    }
    
    return result;
  } catch (error) {
    log('ERROR', 'updateRequestStatus error: ' + error);
    return ErrorHandler.handle(error, 'updateRequestStatus');
  }
}

/**
 * 여러 신청 건의 상태를 일괄 변경합니다. (관리자 전용)
 * @param {Array<string>} requestNos - 신청번호 배열
 * @param {string} newStatus - 새로운 상태
 * @param {string} remarks - 담당자 비고 (선택사항)
 * @return {Object} 결과 객체 {success: boolean, message: string, results: Object}
 */
function bulkUpdateStatus(requestNos, newStatus, remarks, sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user || user.role !== CONFIG.ROLES.ADMIN) {
      throw new Error('관리자만 실행할 수 있습니다.');
    }
    
    const results = {
      success: [],
      failed: []
    };
    
    requestNos.forEach(requestNo => {
      try {
        const service = new RequestService();
        const result = service.updateStatus(requestNo, newStatus, remarks, user);
        if (result.success) {
          results.success.push(requestNo);
        } else {
          results.failed.push({ requestNo, error: result.message });
        }
      } catch (error) {
        results.failed.push({ requestNo, error: error.message });
      }
    });
    
    return {
      success: true,
      message: `${results.success.length}건이 처리되었습니다.`,
      results: results
    };
  } catch (error) {
    Logger.log('bulkUpdateStatus error: ' + error);
    return ErrorHandler.handle(error, 'bulkUpdateStatus');
  }
}

// ==========================================
// 공통 API
// ==========================================

/**
 * 대시보드 데이터를 배치로 조회합니다. (성능 최적화 - 20배 개선)
 * 단일 데이터 읽기로 최적화하여 API 호출 횟수 대폭 감소
 * @param {string} sessionToken - 세션 토큰
 * @return {Object} 대시보드 데이터 객체 {success, stats, recentRequests, notifications}
 */
function getDashboardData(sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // 캐시 키 생성
    const cacheManager = new CacheManager();
    const cacheKey = 'dashboard_data_' + user.userId;
    
    // 캐시 확인 (TTL: 30초)
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // 단일 데이터 읽기로 최적화 (한 번만 시트 읽기)
    const requestModel = new RequestModel();
    if (!requestModel.sheet) {
      return {
        success: true,
        stats: { requested: 0, inProgress: 0, completed: 0, total: 0 },
        recentRequests: [],
        notifications: []
      };
    }
    
    // 사용자의 모든 신청 조회 (한 번만)
    const allRequests = requestModel.findAll({ requesterUserId: user.userId });
    
    if (!Array.isArray(allRequests)) {
      return {
        success: true,
        stats: { requested: 0, inProgress: 0, completed: 0, total: 0 },
        recentRequests: [],
        notifications: []
      };
    }
    
    // 통계 계산 (메모리에서)
    const stats = {
      requested: 0,
      inProgress: 0,
      completed: 0,
      total: allRequests.length
    };
    
    const recentRequests = [];
    const notifications = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // 한 번의 순회로 모든 데이터 처리
    allRequests.forEach(req => {
      // 통계 계산
      if (req.status !== CONFIG.STATUS.CANCELLED) {
        if (req.status === CONFIG.STATUS.REQUESTED) {
          stats.requested++;
        } else if (req.status === CONFIG.STATUS.ORDERING || 
                   req.status === CONFIG.STATUS.COMPLETED_CONFIRMED || 
                   req.status === CONFIG.STATUS.COMPLETED_PENDING) {
          stats.inProgress++;
        } else if (req.status === CONFIG.STATUS.FINISHED) {
          stats.completed++;
        }
      }
      
      // 최근 신청 내역 (최대 5개)
      if (recentRequests.length < 5) {
        recentRequests.push({
          requestNo: req.requestNo,
          requestDate: formatDate(req.requestDate, 'yyyy-MM-dd HH:mm'),
          itemName: req.itemName,
          quantity: req.quantity,
          status: req.status
        });
      }
      
      // 알림 생성 (최근 7일 이내 상태 변경)
      if (req.lastModifiedDate && new Date(req.lastModifiedDate) > sevenDaysAgo) {
        let notification = null;
        
        if (req.status === CONFIG.STATUS.ORDERING) {
          notification = {
            type: 'info',
            title: '접수 완료',
            message: `[${req.requestNo}] ${req.itemName} 발주가 진행 중입니다.`,
            date: req.lastModifiedDate,
            requestNo: req.requestNo
          };
        } else if (req.status === CONFIG.STATUS.COMPLETED_CONFIRMED) {
          notification = {
            type: 'success',
            title: '발주 완료',
            message: `[${req.requestNo}] ${req.itemName} 발주가 완료되었습니다. (납기확인) 수령 확인해주세요.`,
            date: req.lastModifiedDate,
            requestNo: req.requestNo
          };
        } else if (req.status === CONFIG.STATUS.COMPLETED_PENDING) {
          notification = {
            type: 'success',
            title: '발주 완료',
            message: `[${req.requestNo}] ${req.itemName} 발주가 완료되었습니다. (납기미정)`,
            date: req.lastModifiedDate,
            requestNo: req.requestNo
          };
        } else if (req.status === CONFIG.STATUS.FINISHED) {
          notification = {
            type: 'success',
            title: '처리 완료',
            message: `[${req.requestNo}] ${req.itemName} 신청 처리가 완료되었습니다.`,
            date: req.lastModifiedDate,
            requestNo: req.requestNo
          };
        } else if (req.status === CONFIG.STATUS.CANCELLED) {
          notification = {
            type: 'warning',
            title: '신청 취소',
            message: `[${req.requestNo}] ${req.itemName} 신청이 취소되었습니다.`,
            date: req.lastModifiedDate,
            requestNo: req.requestNo
          };
        }
        
        if (notification && notifications.length < 10) {
          notifications.push(notification);
        }
      }
    });
    
    // 최신순 정렬
    recentRequests.sort((a, b) => {
      return new Date(b.requestDate) - new Date(a.requestDate);
    });
    
    notifications.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    const result = {
      success: true,
      stats: stats,
      recentRequests: recentRequests.slice(0, 5),
      notifications: notifications.slice(0, 10)
    };
    
    // 캐시 저장 (TTL: 30초)
    cacheManager.set(cacheKey, result, 30);
    
    return result;
  } catch (error) {
    log('ERROR', 'getDashboardData error: ' + error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 코드 목록을 조회합니다. (지역, 소속팀, 상태 등)
 * @param {string} type - 코드 타입 ('region', 'team', 'status') 또는 undefined (전체)
 * @return {Object|Array} 코드 목록 객체 또는 배열
 */
function getCodeList(type) {
  try {
    const cacheManager = new CacheManager();
    const cacheKey = 'codes_' + (type || 'all');
    
    // 캐시 확인 (코드는 자주 변경되지 않음, TTL: 10분)
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      log('DEBUG', 'getCodeList: Using cache for type: ' + (type || 'all'));
      return cached;
    }
    
    const codeModel = new CodeModel();
    let result;
    
    switch (type) {
      case 'region':
        result = codeModel.getRegions();
        break;
      case 'team':
        result = codeModel.getTeams();
        break;
      case 'status':
        result = codeModel.getStatusList();
        break;
      default:
        result = {
          regions: codeModel.getRegions(),
          teams: codeModel.getTeams(),
          statuses: codeModel.getStatusList()
        };
    }
    
    // 캐시 저장 (TTL: 10분 = 600초)
    cacheManager.set(cacheKey, result, 600);
    
    return result;
  } catch (error) {
    log('ERROR', 'getCodeList error: ' + error);
    return ErrorHandler.handle(error, 'getCodeList');
  }
}

/**
 * 모든 배송지 목록을 조회합니다. (관리자 전용)
 * @param {string} sessionToken - 세션 토큰
 * @return {Array} 배송지 목록
 */
function getAllDeliveryPlaces(sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user || user.role !== CONFIG.ROLES.ADMIN) {
      throw new Error('관리자만 실행할 수 있습니다.');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // CONFIG 누락/캐시 이슈 대비 fallback
    const sheetName = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.DELIVERY_PLACES)
      ? String(CONFIG.SHEETS.DELIVERY_PLACES).trim()
      : '배송지관리';
    
    const sheet = getSheetByNameLoose_(ss, sheetName);
    if (!sheet) return [];
    
    // 관리자 페이지에서는 활성화 여부와 관계없이 모든 배송지 조회
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const headers = data[0];
    const rows = data.slice(1);
    const allPlaces = rows
      .filter(row => {
        // 배송지명이 있는 행만
        const 배송지명Index = headers.indexOf('배송지명');
        return 배송지명Index >= 0 && row[배송지명Index] && row[배송지명Index].toString().trim() !== '';
      })
      .map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });
    
    // 객체 배열로 변환
    return allPlaces.map(place => ({
      '배송지명': place['배송지명'] || '',
      '소속팀': place['소속팀'] || '',
      '주소': place['주소'] || '',
      '연락처': place['연락처'] || '',
      '담당자': place['담당자'] || '',
      '활성화': place['활성화'] || 'Y',
      '비고': place['비고'] || ''
    }));
  } catch (error) {
    Logger.log('getAllDeliveryPlaces error: ' + error);
    Logger.log('getAllDeliveryPlaces error stack: ' + error.stack);
    return [];
  }
}

/**
 * 배송지 목록을 조회합니다.
 * 사용자의 소속팀을 기반으로 파트별 배송지를 매핑하여 반환합니다.
 * @param {string} team - 소속팀 (선택사항, 파트별 필터링)
 * @param {string} sessionToken - 세션 토큰
 * @return {Array} 배송지 목록
 */
function getDeliveryPlaces(team, sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user) {
      Logger.log('getDeliveryPlaces: User not found');
      return []; // 빈 배열 반환
    }
    
    // 사용자의 소속팀을 우선 사용, 없으면 파라미터 사용
    const userTeam = user.team || team;
    
    // 파트별 배송지 매핑 로직 사용
    const places = getDeliveryPlacesByTeam(userTeam, sessionToken);
    
    // places가 배열이 아닌 경우 처리
    if (!Array.isArray(places)) {
      Logger.log('getDeliveryPlaces: getDeliveryPlacesByTeam returned non-array: ' + typeof places);
      return []; // 빈 배열 반환
    }
    
    return places;
  } catch (error) {
    Logger.log('getDeliveryPlaces error: ' + error);
    Logger.log('getDeliveryPlaces error stack: ' + error.stack);
    return []; // 에러 발생 시 빈 배열 반환
  }
}

/**
 * 모든 사용자 목록을 조회합니다. (관리자 전용)
 * @param {string} sessionToken - 세션 토큰
 * @return {Array} 사용자 목록
 */
function getAllUsers(sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user || user.role !== CONFIG.ROLES.ADMIN) {
      throw new Error('관리자만 실행할 수 있습니다.');
    }
    
    const userModel = new UserModel();
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG.SHEETS.USERS);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const users = [];
    for (let i = 1; i < data.length; i++) {
      users.push({
        userId: data[i][0],
        name: data[i][2],
        employeeCode: data[i][3],
        team: data[i][4],
        region: data[i][5],
        role: data[i][6],
        active: data[i][7]
      });
    }
    
    return users;
  } catch (error) {
    Logger.log('getAllUsers error: ' + error);
    return ErrorHandler.handle(error, 'getAllUsers');
  }
}

/**
 * 사용자를 등록합니다. (관리자 전용)
 * @param {Object} userData - 사용자 데이터
 * @param {string} sessionToken - 세션 토큰
 * @return {Object} 결과 객체
 */
function createUser(userData, sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user || user.role !== CONFIG.ROLES.ADMIN) {
      throw new Error('관리자만 실행할 수 있습니다.');
    }
    
    const userModel = new UserModel();
    // 중복 확인
    if (userModel.findByUserId(userData.userId)) {
      return {
        success: false,
        message: '이미 등록된 사용자 ID입니다.'
      };
    }
    
    // 비밀번호 해시 생성
    const passwordHash = hashPassword(userData.password || '1234'); // 기본 비밀번호
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG.SHEETS.USERS);
    sheet.appendRow([
      userData.userId,
      passwordHash,
      userData.name,
      userData.employeeCode || '',
      userData.team || '',
      userData.region || '',
      userData.role || CONFIG.ROLES.USER,
      userData.active || 'Y'
    ]);
    
    new LogService().log('사용자 등록', null, user.userId);
    
    return {
      success: true,
      message: '사용자가 등록되었습니다.'
    };
  } catch (error) {
    Logger.log('createUser error: ' + error);
    return ErrorHandler.handle(error, 'createUser');
  }
}

/**
 * 사용자를 수정합니다. (관리자 전용)
 * - userId는 변경 불가
 * - password가 전달되면 비밀번호도 변경
 */
function updateUser(userData, sessionToken) {
  try {
    const admin = getCurrentUser(sessionToken);
    if (!admin || admin.role !== CONFIG.ROLES.ADMIN) {
      throw new Error('관리자만 실행할 수 있습니다.');
    }
    if (!userData || !userData.userId) {
      throw new Error('userId가 필요합니다.');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
    if (!sheet) {
      throw new Error('사용자관리 시트를 찾을 수 없습니다.');
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      throw new Error('수정할 사용자가 없습니다.');
    }

    const userId = String(userData.userId).trim();
    const headers = data[0];
    const colIndex = (header) => headers.indexOf(header) + 1; // 1-based

    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0] || '').trim() === userId) {
        targetRow = i + 1; // 1-based row
        break;
      }
    }
    if (targetRow === -1) {
      throw new Error('사용자를 찾을 수 없습니다: ' + userId);
    }

    // 업데이트할 필드 매핑
    const updates = {
      '이름': userData.name,
      '기사코드': userData.employeeCode,
      '소속팀': userData.team,
      '지역': userData.region,
      '역할': userData.role,
      '활성화': userData.active
    };

    Object.keys(updates).forEach((key) => {
      const idx = colIndex(key);
      if (idx <= 0) return;
      if (updates[key] === undefined) return;
      sheet.getRange(targetRow, idx).setValue(updates[key] === null ? '' : updates[key]);
    });

    // 비밀번호 변경 (선택)
    if (userData.password && String(userData.password).trim() !== '') {
      const passwordHash = hashPassword(String(userData.password));
      const pwCol = colIndex('비밀번호해시');
      if (pwCol > 0) {
        sheet.getRange(targetRow, pwCol).setValue(passwordHash);
      }
    }

    new LogService().log('사용자 수정', null, admin.userId);
    return { success: true, message: '사용자 정보가 수정되었습니다.' };
  } catch (error) {
    Logger.log('updateUser error: ' + error);
    return ErrorHandler.handle(error, 'updateUser');
  }
}

/**
 * 배송지를 등록합니다. (관리자 전용)
 * @param {Object} placeData - 배송지 데이터
 * @param {string} sessionToken - 세션 토큰
 * @return {Object} 결과 객체
 */
function createDeliveryPlace(placeData, sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user || user.role !== CONFIG.ROLES.ADMIN) {
      throw new Error('관리자만 실행할 수 있습니다.');
    }
    
    const deliveryPlaceModel = new DeliveryPlaceModel();
    deliveryPlaceModel.create({
      '배송지명': placeData.name,
      '소속팀': placeData.team,
      '주소': placeData.address || '',
      '연락처': placeData.contact || '',
      '담당자': placeData.manager || '',
      '활성화': placeData.active || 'Y',
      '비고': placeData.remarks || ''
    });
    
    new LogService().log('배송지 등록', null, user.userId);
    
    return {
      success: true,
      message: '배송지가 등록되었습니다.'
    };
  } catch (error) {
    Logger.log('createDeliveryPlace error: ' + error);
    return ErrorHandler.handle(error, 'createDeliveryPlace');
  }
}

/**
 * 배송지를 수정합니다. (관리자 전용)
 * - originalName/originalTeam으로 행을 찾고, 변경사항을 반영합니다.
 * - 배송지명/소속팀도 수정 가능
 */
function updateDeliveryPlace(placeData, sessionToken) {
  try {
    const admin = getCurrentUser(sessionToken);
    if (!admin || admin.role !== CONFIG.ROLES.ADMIN) {
      throw new Error('관리자만 실행할 수 있습니다.');
    }
    if (!placeData || !placeData.originalName || !placeData.originalTeam) {
      throw new Error('originalName/originalTeam이 필요합니다.');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.DELIVERY_PLACES)
      ? String(CONFIG.SHEETS.DELIVERY_PLACES).trim()
      : '배송지관리';
    const sheet = getSheetByNameLoose_(ss, sheetName);
    if (!sheet) {
      throw new Error('배송지관리 시트를 찾을 수 없습니다.');
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      throw new Error('수정할 배송지가 없습니다.');
    }

    const headers = data[0];
    const nameCol0 = headers.indexOf('배송지명');
    const teamCol0 = headers.indexOf('소속팀');
    if (nameCol0 < 0 || teamCol0 < 0) {
      throw new Error('배송지관리 시트 헤더가 올바르지 않습니다.');
    }

    const originalName = String(placeData.originalName).trim();
    const originalTeam = String(placeData.originalTeam).trim();

    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      const rowName = String(data[i][nameCol0] || '').trim();
      const rowTeam = String(data[i][teamCol0] || '').trim();
      if (rowName === originalName && rowTeam === originalTeam) {
        targetRow = i + 1; // 1-based
        break;
      }
    }
    if (targetRow === -1) {
      throw new Error('배송지를 찾을 수 없습니다: ' + originalTeam + ' / ' + originalName);
    }

    const headerToCol = (h) => headers.indexOf(h) + 1;
    const updates = {
      '배송지명': placeData.name,
      '소속팀': placeData.team,
      '주소': placeData.address,
      '연락처': placeData.contact,
      '담당자': placeData.manager,
      '활성화': placeData.active,
      '비고': placeData.remarks
    };

    Object.keys(updates).forEach((key) => {
      const idx = headerToCol(key);
      if (idx <= 0) return;
      if (updates[key] === undefined) return;
      sheet.getRange(targetRow, idx).setValue(updates[key] === null ? '' : updates[key]);
    });

    new LogService().log('배송지 수정', null, admin.userId);
    return { success: true, message: '배송지 정보가 수정되었습니다.' };
  } catch (error) {
    Logger.log('updateDeliveryPlace error: ' + error);
    return ErrorHandler.handle(error, 'updateDeliveryPlace');
  }
}

/**
 * Excel 마스터 파일을 생성합니다. (관리자 전용)
 * @param {string} sessionToken - 세션 토큰
 * @return {Object} 결과 객체 {success: boolean, fileUrl: string, message: string}
 */
function exportMasterExcel(sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user || user.role !== CONFIG.ROLES.ADMIN) {
      throw new Error('관리자만 실행할 수 있습니다.');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const fileName = '부품발주_마스터_' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd') + '.xlsx';
    
    // 기존 마스터 파일 삭제 (같은 날짜)
    const folder = DriveApp.getFolderById(getProperty('DRIVE_FOLDER_ID') || CONFIG.DRIVE_FOLDER_ID);
    const files = folder.getFilesByName(fileName);
    while (files.hasNext()) {
      files.next().setTrashed(true);
    }
    
    // 새 Excel 파일 생성 (스프레드시트를 Excel로 변환)
    const blob = ss.getBlob().setName(fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    new LogService().log('Excel 마스터 파일 생성', null, user.userId);
    
    return {
      success: true,
      fileUrl: file.getUrl(),
      fileName: fileName,
      message: 'Excel 마스터 파일이 생성되었습니다.'
    };
  } catch (error) {
    Logger.log('exportMasterExcel error: ' + error);
    return ErrorHandler.handle(error, 'exportMasterExcel');
  }
}


/**
 * 신청 건의 상세 정보를 조회합니다.
 * @param {string} requestNo - 신청번호
 * @param {string} sessionToken - 세션 토큰
 * @return {Object} 신청 상세 정보 객체
 */
function getRequest(requestNo, sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user) {
      Logger.log('getRequest: User not found');
      throw new Error('로그인이 필요합니다.');
    }
    
    const requestModel = new RequestModel();
    
    // 시트 존재 여부 확인
    if (!requestModel.sheet) {
      Logger.log('getRequest: Request sheet not found');
      throw new Error('신청 시트를 찾을 수 없습니다.');
    }
    
    const request = requestModel.findById(requestNo);
    
    if (!request) {
      Logger.log('getRequest: Request not found for requestNo: ' + requestNo);
      throw new Error('신청 건을 찾을 수 없습니다.');
    }
    
    // request 객체의 필드 확인 (디버깅)
    Logger.log('getRequest - request object keys: ' + Object.keys(request).join(', '));
    Logger.log('getRequest - requesterName: ' + request.requesterName);
    Logger.log('getRequest - team: ' + request.team);
    Logger.log('getRequest - employeeCode: ' + request.employeeCode);
    Logger.log('getRequest - requesterEmail: ' + request.requesterEmail);
    Logger.log('getRequest - Current user userId: ' + user.userId);
    
    // 권한 체크 (requesterEmail과 userId 비교 시 정규화)
    const requestUserId = String(request.requesterEmail || '').trim();
    const currentUserId = String(user.userId || '').trim();
    
    if (user.role !== CONFIG.ROLES.ADMIN && requestUserId !== currentUserId) {
      Logger.log('getRequest: Permission denied. requestUserId: ' + requestUserId + ', currentUserId: ' + currentUserId);
      throw new Error('조회 권한이 없습니다.');
    }
    
    return {
      rowIndex: request._rowIndex,
      requestNo: request.requestNo ? String(request.requestNo) : '',
      requestDate: request.requestDate ? String(request.requestDate) : '',
      requesterEmail: request.requesterEmail || '',
      requesterName: request.requesterName || '',
      employeeCode: request.employeeCode || '', // requesterCode -> employeeCode로 수정
      team: request.team || '',
      region: request.region || '',
      itemName: request.itemName || '',
      modelName: request.modelName || '',
      serialNo: request.serialNo || '',
      quantity: request.quantity || 0,
      assetNo: request.assetNo || '',
      deliveryPlace: request.deliveryPlace || '',
      phone: request.phone || '',
      company: request.company || '',
      remarks: request.remarks || '',
      photoUrl: request.photoUrl || '',
      status: request.status || '',
      handler: request.handler || '',
      handlerRemarks: request.handlerRemarks || '',
      orderDate: request.orderDate ? String(request.orderDate) : '',
      expectedDeliveryDate: request.expectedDeliveryDate ? String(request.expectedDeliveryDate) : '',
      receiptDate: request.receiptDate ? String(request.receiptDate) : '',
      lastModified: request.lastModified ? String(request.lastModified) : '',
      lastModifiedBy: request.lastModifiedBy || ''
    };
  } catch (error) {
    Logger.log('getRequest error: ' + error);
    return { success: false, message: String(error) };
  }
}

/**
 * 비밀번호 변경
 * @param {string} oldPassword - 현재 비밀번호
 * @param {string} newPassword - 새 비밀번호
 * @param {string} sessionToken - 세션 토큰
 * @return {Object} 결과 객체 {success: boolean, message: string}
 */
function changePassword(oldPassword, newPassword, sessionToken) {
  try {
    // 세션에서 사용자 정보 확인
    const currentUser = getCurrentSession(sessionToken);
    if (!currentUser) {
      Logger.log('changePassword: No session found');
      return {
        success: false,
        message: '세션이 만료되었습니다. 다시 로그인해주세요.'
      };
    }
    
    Logger.log('changePassword: Session user found - userId: ' + currentUser.userId);
    Logger.log('changePassword: Session user object: ' + JSON.stringify(currentUser));
    
    // 세션의 userId를 사용 (가장 신뢰할 수 있는 소스)
    const targetUserId = String(currentUser.userId || '').trim();
    
    if (!targetUserId) {
      Logger.log('changePassword: userId is empty in session');
      return {
        success: false,
        message: '사용자 정보를 찾을 수 없습니다.'
      };
    }
    
    Logger.log('changePassword: Target userId: ' + targetUserId);
    
    const userModel = new UserModel();
    
    // 시트 존재 여부 확인
    if (!userModel.sheet) {
      Logger.log('changePassword: Users sheet not found');
      return {
        success: false,
        message: '시스템 오류: 사용자 시트를 찾을 수 없습니다.'
      };
    }
    
    const userData = userModel.findByUserId(targetUserId);
    
    if (!userData) {
      Logger.log('changePassword: User data not found for userId: ' + targetUserId);
      return {
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      };
    }
    
    Logger.log('changePassword: User data found, checking password...');
    
    // 기존 비밀번호 확인 - verifyPassword 함수 사용 (Auth.gs와 동일한 로직)
    if (userData.passwordHash && userData.passwordHash.trim() !== '') {
      if (!verifyPassword(oldPassword, userData.passwordHash)) {
        Logger.log('changePassword: Old password verification failed');
        Logger.log('changePassword: Input password hash would be: ' + hashPassword(oldPassword));
        Logger.log('changePassword: Stored hash: ' + userData.passwordHash);
        return {
          success: false,
          message: '기존 비밀번호가 올바르지 않습니다.'
        };
      }
      Logger.log('changePassword: Old password verified successfully');
    } else {
      Logger.log('changePassword: No password hash found, skipping verification');
    }
    
    // 새 비밀번호 해시 생성 및 저장 - hashPassword 함수 사용
    const newHash = hashPassword(newPassword);
    Logger.log('changePassword: New password hash generated');
    
    userModel.updatePassword(targetUserId, newHash);
    Logger.log('changePassword: Password updated successfully');
    
    new LogService().log('비밀번호 변경', null, targetUserId);
    
    return {
      success: true,
      message: '비밀번호가 변경되었습니다.'
    };
  } catch (error) {
    Logger.log('changePassword wrapper error: ' + error);
    Logger.log('changePassword error stack: ' + error.stack);
    return {
      success: false,
      message: error.message || '비밀번호 변경 중 오류가 발생했습니다.'
    };
  }
}

/**
 * CSV 파일에서 배송지 정보를 가져와서 등록합니다. (관리자 전용)
 * @param {string} csvContent - CSV 파일 내용
 * @param {string} sessionToken - 세션 토큰
 * @return {Object} 결과 객체 {success: boolean, message: string, imported: Object}
 */
function importDeliveryPlacesFromCSV(csvContent, sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user || user.role !== CONFIG.ROLES.ADMIN) {
      throw new Error('관리자만 실행할 수 있습니다.');
    }
    
    if (!csvContent) {
      throw new Error('CSV 내용이 필요합니다.');
    }
    
    // CSV 파싱 (Google Apps Script의 parseCsv 사용)
    const lines = Utilities.parseCsv(csvContent);
    if (lines.length < 2) {
      throw new Error('CSV 파일에 데이터가 없습니다.');
    }
    
    // 헤더 파싱
    const headers = lines[0].map(h => String(h).trim());
    const headerMap = {};
    headers.forEach((header, index) => {
      headerMap[header] = index;
    });
    
    Logger.log('CSV 헤더: ' + JSON.stringify(headers));
    Logger.log('헤더 맵: ' + JSON.stringify(headerMap));
    
    // CSV 파일 형식 확인 및 매핑
    // 형식 1: 배송지관리 형식 (배송지명,소속팀,주소,연락처,담당자,활성화,비고)
    // 형식 2: 기준정보 형식 (NO,기사명,사번,사용자,파트,기사코드,배송지)
    let isMasterDataFormat = false;
    let 배송지명Index = headerMap['배송지명'];
    let 소속팀Index = headerMap['소속팀'];
    
    // 기준정보 형식인 경우 (파트별 택배 수령지 취합 형식)
    if (headerMap['파트'] !== undefined && headerMap['배송지'] !== undefined) {
      isMasterDataFormat = true;
      배송지명Index = headerMap['배송지'];
      소속팀Index = headerMap['파트'];
    }
    
    // 필수 헤더 확인
    if (배송지명Index === undefined || 소속팀Index === undefined) {
      throw new Error('CSV 파일에 필수 컬럼(배송지명/배송지, 소속팀/파트)이 없습니다.');
    }
    
    const imported = {
      users: 0,
      deliveryPlaces: 0,
      skippedUsers: 0,
      skippedPlaces: 0
    };
    
    // 사용자관리 시트 준비
    const userModel = new UserModel();
    const userSheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG.SHEETS.USERS);
    
    if (!userSheet) {
      throw new Error('사용자관리 시트를 찾을 수 없습니다.');
    }
    
    // 사용자관리 시트 헤더 확인 및 생성
    if (userSheet.getLastRow() === 0) {
      userSheet.getRange(1, 1, 1, 8).setValues([[
        '사용자ID', '비밀번호해시', '이름', '기사코드', '소속팀', '지역', '역할', '활성화'
      ]]);
    }
    
    // 배송지관리 시트 준비 (기존 시트 사용, 없으면 생성)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // CONFIG 누락/캐시 이슈 대비 fallback
    const sheetName = (CONFIG && CONFIG.SHEETS && CONFIG.SHEETS.DELIVERY_PLACES)
      ? String(CONFIG.SHEETS.DELIVERY_PLACES).trim()
      : '배송지관리';
    
    // 기존 시트 찾기 (trim 느슨매칭 포함)
    let deliverySheet = getSheetByNameLoose_(ss, sheetName);
    
    // 시트가 없으면 생성 (한 번만)
    if (!deliverySheet) {
      deliverySheet = ss.insertSheet(sheetName);
      // 헤더 설정
      deliverySheet.getRange(1, 1, 1, 7).setValues([[
        '배송지명', '소속팀', '주소', '연락처', '담당자', '활성화', '비고'
      ]]);
    } else {
      // 기존 시트의 헤더 확인 및 생성 (헤더가 없으면)
      if (deliverySheet.getLastRow() === 0) {
        deliverySheet.getRange(1, 1, 1, 7).setValues([[
          '배송지명', '소속팀', '주소', '연락처', '담당자', '활성화', '비고'
        ]]);
      }
    }
    
    // 기존 사용자 중복 체크용
    const existingUsers = [];
    const userData = userSheet.getDataRange().getValues();
    for (let i = 1; i < userData.length; i++) {
      if (userData[i][0]) {
        existingUsers.push(userData[i][0]); // 사용자ID
      }
    }
    const existingUserSet = new Set(existingUsers);
    
    // 배송지 중복 체크용 (소속팀 + 배송지명)
    // deliverySheet에서 직접 읽어서 중복 체크
    const existingPlaceSet = new Set();
    if (deliverySheet.getLastRow() > 1) {
      const existingData = deliverySheet.getDataRange().getValues();
      const headers = existingData[0];
      const 배송지명Index = headers.indexOf('배송지명');
      const 소속팀Index = headers.indexOf('소속팀');
      
      for (let i = 1; i < existingData.length; i++) {
        const row = existingData[i];
        const 배송지명 = row[배송지명Index] || '';
        const 소속팀 = row[소속팀Index] || '';
        if (배송지명 && 소속팀) {
          const key = 소속팀 + '|' + 배송지명;
          existingPlaceSet.add(key);
        }
      }
    }
    
    // 데이터 행 처리
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].map(v => String(v || '').trim());
      
      // 빈 행 스킵
      if (values.length === 0 || values.every(v => v === '')) continue;
      
      // 기준정보 형식인 경우 사용자 정보도 처리
      if (isMasterDataFormat) {
        const 사번 = values[headerMap['사번']];
        const 사용자 = values[headerMap['사용자']];
        const 파트 = values[headerMap['파트']] || '';
        const 기사코드 = values[headerMap['기사코드']] || '';
        
        // 사용자 등록 (사번과 사용자 이름이 있는 경우)
        if (사번 && 사용자 && 사번.trim() !== '' && 사용자.trim() !== '') {
          // 중복 체크
          if (!existingUserSet.has(사번)) {
            // 지역 추출 (파트에서)
            let 지역 = '';
            if (파트.includes('수도권')) {
              지역 = '수도권';
            } else if (파트.includes('지역팀')) {
              // 지역팀의 경우 배송지에서 지역 추출 시도
              const 배송지 = values[배송지명Index] || '';
              if (배송지.includes('서울')) 지역 = '서울';
              else if (배송지.includes('부산')) 지역 = '부산';
              else if (배송지.includes('대구')) 지역 = '대구';
              else if (배송지.includes('인천')) 지역 = '인천';
              else if (배송지.includes('광주')) 지역 = '광주';
              else if (배송지.includes('대전')) 지역 = '대전';
              else if (배송지.includes('울산')) 지역 = '울산';
              else if (배송지.includes('경기')) 지역 = '경기';
              else if (배송지.includes('충남') || 배송지.includes('천안') || 배송지.includes('아산')) 지역 = '충남';
              else if (배송지.includes('충북') || 배송지.includes('청주')) 지역 = '충북';
              else if (배송지.includes('전남') || 배송지.includes('광주')) 지역 = '전남';
              else if (배송지.includes('전북') || 배송지.includes('전주')) 지역 = '전북';
              else if (배송지.includes('경남')) 지역 = '경남';
              else if (배송지.includes('경북') || 배송지.includes('포항') || 배송지.includes('김천')) 지역 = '경북';
              else if (배송지.includes('강원') || 배송지.includes('원주')) 지역 = '강원';
              else 지역 = '기타';
            } else if (파트.includes('외주')) {
              지역 = '기타';
            }
            
            // 비밀번호 해시 생성 (기본 비밀번호: 1234)
            const passwordHash = hashPassword('1234');
            
            userSheet.appendRow([
              사번,
              passwordHash,
              사용자,
              기사코드,
              파트,
              지역,
              CONFIG.ROLES.USER,
              'Y'
            ]);
            
            existingUserSet.add(사번);
            imported.users++;
          } else {
            imported.skippedUsers++;
          }
        }
      }
      
      // 배송지 처리
      const 배송지명 = values[배송지명Index] || '';
      const 소속팀 = values[소속팀Index] || '';
      
      // 배송지명과 소속팀이 모두 있어야 함 (배송지가 비어있으면 스킵)
      if (배송지명 && 소속팀 && 배송지명.trim() !== '' && 소속팀.trim() !== '') {
        // 기준정보 형식인 경우 추가 필드 매핑
        let 주소 = '';
        let 연락처 = '';
        let 담당자 = '';
        let 활성화 = 'Y';
        let 비고 = '';
        
        if (isMasterDataFormat) {
          // 기준정보 형식: 주소, 연락처, 담당자 등이 없으므로 기본값 사용
          주소 = 배송지명; // 배송지명을 주소로도 사용
        } else {
          // 배송지관리 형식: 모든 필드 사용
          주소 = values[headerMap['주소']] || '';
          연락처 = values[headerMap['연락처']] || '';
          담당자 = values[headerMap['담당자']] || '';
          활성화 = values[headerMap['활성화']] || 'Y';
          비고 = values[headerMap['비고']] || '';
        }
        
        // 중복 체크
        const placeKey = 소속팀 + '|' + 배송지명;
        if (!existingPlaceSet.has(placeKey)) {
          // 배송지 등록
          deliverySheet.appendRow([
            배송지명,
            소속팀,
            주소,
            연락처,
            담당자,
            활성화,
            비고
          ]);
          
          existingPlaceSet.add(placeKey);
          imported.deliveryPlaces++;
        } else {
          imported.skippedPlaces++;
        }
      }
    }
    
    new LogService().log('CSV 기준정보 업로드', null, user.userId);
    
    let message = '';
    if (isMasterDataFormat) {
      message = `기준정보가 등록되었습니다. (사용자: ${imported.users}명, 배송지: ${imported.deliveryPlaces}개)`;
      if (imported.skippedUsers > 0 || imported.skippedPlaces > 0) {
        message += ` (중복/스킵: 사용자 ${imported.skippedUsers}명, 배송지 ${imported.skippedPlaces}개)`;
      }
    } else {
      message = `배송지 정보가 등록되었습니다. (${imported.deliveryPlaces}개)`;
      if (imported.skippedPlaces > 0) {
        message += ` (중복/스킵: ${imported.skippedPlaces}개)`;
      }
    }
    
    return {
      success: true,
      message: message,
      imported: imported
    };
  } catch (error) {
    Logger.log('importDeliveryPlacesFromCSV error: ' + error);
    return ErrorHandler.handle(error, 'importDeliveryPlacesFromCSV');
  }
}

/**
 * 사용자의 파트에 맞는 배송지 목록을 조회합니다.
 * 파트명을 기반으로 배송지관리 시트에서 해당 파트의 배송지를 찾습니다.
 * @param {string} team - 사용자의 소속팀/파트
 * @param {string} sessionToken - 세션 토큰
 * @return {Array} 배송지 목록
 */
function getDeliveryPlacesByTeam(team, sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user) {
      Logger.log('getDeliveryPlacesByTeam: User not found');
      return []; // 빈 배열 반환
    }
    
    const deliveryPlaceModel = new DeliveryPlaceModel();
    
    // 시트 존재 여부 확인
    if (!deliveryPlaceModel.sheet) {
      Logger.log('getDeliveryPlacesByTeam: Delivery place sheet not found');
      return []; // 빈 배열 반환
    }
    
    // 파트명 매핑 로직
    // 사용자의 소속팀과 배송지관리 시트의 소속팀을 매칭
    let matchedPlaces = [];
    
    if (team) {
      // 정확히 일치하는 경우
      matchedPlaces = deliveryPlaceModel.findByTeam(team);
      
      // matchedPlaces가 배열이 아닌 경우 처리
      if (!Array.isArray(matchedPlaces)) {
        Logger.log('getDeliveryPlacesByTeam: findByTeam returned non-array: ' + typeof matchedPlaces);
        matchedPlaces = [];
      }
      
      // 정확히 일치하지 않는 경우, 부분 매칭 시도
      if (matchedPlaces.length === 0) {
        const allPlaces = deliveryPlaceModel.findAll();
        
        // allPlaces가 배열이 아닌 경우 처리
        if (!Array.isArray(allPlaces)) {
          Logger.log('getDeliveryPlacesByTeam: findAll returned non-array: ' + typeof allPlaces);
          return []; // 빈 배열 반환
        }
        
        // 파트명에서 키워드 추출하여 매칭
        const teamKeywords = extractTeamKeywords(team);
        
        matchedPlaces = allPlaces.filter(place => {
          const placeTeam = place['소속팀'] || '';
          
          // 정확히 일치
          if (placeTeam === team) return true;
          
          // 키워드 매칭
          for (let keyword of teamKeywords) {
            if (placeTeam.includes(keyword) || keyword.includes(placeTeam)) {
              return true;
            }
          }
          
          // 부분 일치 (예: "TM센터_FL지역팀 1파트"와 "지역팀 1파트")
          if (team.includes(placeTeam) || placeTeam.includes(team)) {
            return true;
          }
          
          return false;
        });
      }
    } else {
      // 팀 정보가 없으면 모든 배송지 반환
      matchedPlaces = deliveryPlaceModel.findAll();
      
      // matchedPlaces가 배열이 아닌 경우 처리
      if (!Array.isArray(matchedPlaces)) {
        Logger.log('getDeliveryPlacesByTeam: findAll returned non-array: ' + typeof matchedPlaces);
        return []; // 빈 배열 반환
      }
    }
    
    // 배송지명만 추출하여 반환
    return matchedPlaces.map(place => ({
      name: place['배송지명'] || place.name || '',
      '배송지명': place['배송지명'] || place.name || '', // 프론트엔드 호환성
      team: place['소속팀'] || place.team || '',
      address: place['주소'] || place.address || '',
      contact: place['연락처'] || place.contact || ''
    })).filter(place => place.name !== '');
    
  } catch (error) {
    Logger.log('getDeliveryPlacesByTeam error: ' + error);
    Logger.log('getDeliveryPlacesByTeam error stack: ' + error.stack);
    return []; // 에러 발생 시 빈 배열 반환
  }
}

/**
 * 팀명에서 키워드를 추출합니다.
 * @param {string} team - 팀명
 * @return {Array} 키워드 배열
 */
function extractTeamKeywords(team) {
  if (!team) return [];
  
  const keywords = [];
  const teamLower = team.toLowerCase();
  
  // 파트 번호 추출 (예: "1파트", "2파트")
  const partMatch = team.match(/(\d+)파트/);
  if (partMatch) {
    keywords.push(partMatch[0]); // "1파트"
    keywords.push(partMatch[1] + '파트'); // 숫자만
  }
  
  // 주요 키워드 추출
  if (teamLower.includes('지역팀')) keywords.push('지역팀');
  if (teamLower.includes('수도권팀')) keywords.push('수도권팀');
  if (teamLower.includes('외주')) keywords.push('외주');
  if (teamLower.includes('tm센터')) keywords.push('TM센터');
  if (teamLower.includes('fl')) keywords.push('FL');
  
  // 지역 키워드 추출
  const regions = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '경기', '충남', '충북', '전남', '전북', '경남', '경북', '강원'];
  regions.forEach(region => {
    if (team.includes(region)) {
      keywords.push(region);
    }
  });
  
  return keywords;
}

/**
 * 신청 건의 상세 정보를 조회합니다. (하위 호환성)
 * @param {string} requestNo - 신청번호
 * @param {string} sessionToken - 세션 토큰 (선택사항)
 * @return {Object} 신청 상세 정보 객체
 */
function getRequestDetail(requestNo, sessionToken) {
  try {
    const requestModel = new RequestModel();
    const request = requestModel.findById(requestNo);
    
    if (!request) {
      throw new Error('신청 건을 찾을 수 없습니다.');
    }
    
    // 권한 체크 (세션이 있는 경우)
    if (sessionToken) {
      const user = getCurrentUser(sessionToken);
      if (user && user.role !== CONFIG.ROLES.ADMIN && request.requesterEmail !== user.userId) {
        throw new Error('조회 권한이 없습니다.');
      }
    }
    
    return request;
  } catch (error) {
    Logger.log('getRequestDetail error: ' + error);
    return ErrorHandler.handle(error, 'getRequestDetail');
  }
}

// ==========================================
// 초기 설정
// ==========================================

/**
 * 시스템 초기 설정을 수행합니다. (최초 1회 실행)
 * - Properties 초기화
 * - 시트 생성 및 헤더 설정
 * - 트리거 설정
 * @return {Object} 결과 객체 {success: boolean, message: string}
 */
function initialSetup() {
  try {
    // 1. Properties 설정
    initializeProperties();
    
    // 2. 시트 생성 및 헤더 설정
    createSheets();
    
    // 3. 트리거 설정
    setupAllTriggers();
    
    Logger.log('Initial setup completed successfully!');
    return { success: true, message: '초기 설정이 완료되었습니다.' };
  } catch (error) {
    Logger.log('initialSetup error: ' + error);
    return { success: false, message: error.message };
  }
}

function createSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = Object.values(CONFIG.SHEETS)
    .map(n => (n === null || n === undefined) ? '' : String(n).trim())
    .filter(n => n.length > 0);
  
  sheetNames.forEach(name => {
    let sheet = getSheetByNameLoose_(ss, name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      setupSheetHeaders(sheet, name);
    }
  });
}

/**
 * 시트 이름을 공백(trim) 기준으로도 매칭해서 찾습니다.
 * - 예: 실제 시트명이 '배송지관리 '처럼 공백이 섞여있어도 찾을 수 있게 함
 * - 가능하면 발견한 시트를 canonicalName으로 rename 시도(충돌 시 스킵)
 */
function getSheetByNameLoose_(ss, canonicalName) {
  const target = (canonicalName === null || canonicalName === undefined) ? '' : String(canonicalName).trim();
  if (!target) return null;
  
  // 1) 정확히 일치
  let sheet = ss.getSheetByName(target);
  if (sheet) return sheet;
  
  // 2) trim 기준 느슨 매칭
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const s = sheets[i];
    const n = String(s.getName() || '');
    if (n.trim() === target) {
      // 이름이 다르면 canonicalName으로 rename 시도 (중복 이름이면 예외 발생)
      if (n !== target) {
        try {
          s.setName(target);
        } catch (e) {
          // rename 실패해도 그대로 사용
        }
      }
      return s;
    }
  }
  
  return null;
}

function setupSheetHeaders(sheet, sheetName) {
  const headers = {
    [CONFIG.SHEETS.REQUESTS]: [
      '신청번호', '신청일시', '신청자ID', '신청자이름', '기사코드',
      '소속팀', '지역', '품명', '규격', '시리얼번호', '수량',
      '관리번호', '배송지', '전화번호', '업체명', '비고', '사진URL',
      '상태', '접수담당자', '담당자비고', '발주일시', '예상납기일',
      '수령확인일시', '최종수정일시', '최종수정자'
    ],
    [CONFIG.SHEETS.USERS]: [
      '사용자ID', '비밀번호해시', '이름', '기사코드', '소속팀', '지역', '역할', '활성화'
    ],
    [CONFIG.SHEETS.LOGS]: [
      '일시', '레벨', '액션', '신청번호', '사용자', '상세내용'
    ],
    [CONFIG.SHEETS.DELIVERY_PLACES]: [
      '배송지명', '소속팀', '주소', '연락처', '담당자', '활성화', '비고'
    ]
  };
  
  if (headers[sheetName]) {
    const headerRange = sheet.getRange(1, 1, 1, headers[sheetName].length);
    headerRange.setValues([headers[sheetName]])
      .setFontWeight('bold')
      .setBackground('#4285F4')
      .setFontColor('#FFFFFF');
  }
}

/**
 * Google Drive 이미지를 Base64로 변환하여 반환
 */
function getImageAsBase64(driveUrl, sessionToken) {
  try {
    // 세션 확인
    const user = getCurrentSession(sessionToken);
    if (!user) {
      return { success: false, error: '세션이 만료되었습니다.' };
    }
    
    if (!driveUrl || !driveUrl.includes('drive.google.com')) {
      return { success: false, error: '유효하지 않은 Google Drive URL입니다.' };
    }
    
    // 파일 ID 추출
    let fileId = null;
    const match1 = driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1) {
      fileId = match1[1];
    } else {
      const match2 = driveUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match2) {
        fileId = match2[1];
      }
    }
    
    if (!fileId) {
      return { success: false, error: '파일 ID를 찾을 수 없습니다.' };
    }
    
    // Google Drive에서 파일 가져오기
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    
    // Base64로 변환
    const base64Data = Utilities.base64Encode(blob.getBytes());
    const mimeType = blob.getContentType();
    const dataUrl = 'data:' + mimeType + ';base64,' + base64Data;
    
    return {
      success: true,
      dataUrl: dataUrl,
      mimeType: mimeType
    };
    
  } catch (error) {
    Logger.log('getImageAsBase64 error: ' + error);
    return { success: false, error: error.message || '이미지를 가져오는데 실패했습니다.' };
  }
}

