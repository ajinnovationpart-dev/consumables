<!--
  목적: 부품발주시스템 성능 최적화 가이드. Google Sheets 접근·캐시·클라이언트 최적화.
  대상: Apps Script + Google Sheets 기준. React+Node(로컬 Excel)는 데이터 레이어가 다름.
-->

# 성능 최적화 가이드

## 📊 현재 성능 이슈 분석

### 1. Google Sheets 접근 최적화 필요

#### 문제점
- **전체 데이터를 매번 읽기**: `getDataRange().getValues()`가 모든 함수에서 전체 시트를 읽어옴
- **서버 측 필터링 부재**: 클라이언트에서 필터링하여 불필요한 데이터 전송
- **중복 시트 접근**: 같은 시트를 여러 번 접근하는 경우가 많음

#### 현재 코드 예시
```javascript
// Models.gs - findAll()
const data = this.sheet.getDataRange().getValues(); // 전체 데이터 읽기
const filtered = objects.filter(obj => this._matchFilter(obj, filter)); // 메모리에서 필터링

// Models.gs - findById()
const data = this.sheet.getDataRange().getValues(); // 또 전체 데이터 읽기
for (let i = 1; i < data.length; i++) { // 순차 검색
  if (String(data[i][0]) === requestNoStr) {
    return this._rowToObject(headers, data[i], i + 1);
  }
}

// Models.gs - update()
const data = this.sheet.getDataRange().getValues(); // 또 전체 데이터 읽기
// ... 업데이트 로직
this.sheet.getRange(i + 1, colIndex + 1).setValue(updates[key]); // 개별 셀 업데이트
```

#### 개선 방안

##### 1.1 서버 측 페이징 및 필터링 구현
```javascript
// Models.gs - 개선된 findAll
findAll(filter = {}, options = {}) {
  if (!this.sheet) return [];
  
  const data = this.sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const rows = data.slice(1);
  
  // 서버 측 필터링 (클라이언트 전송 전)
  let filtered = rows
    .map((row, index) => this._rowToObject(headers, row, index + 2))
    .filter(obj => this._matchFilter(obj, filter));
  
  // 정렬
  if (options.sortBy) {
    filtered = this._sort(filtered, options.sortBy, options.sortOrder || 'desc');
  }
  
  // 서버 측 페이징
  if (options.page && options.pageSize) {
    const startIndex = (options.page - 1) * options.pageSize;
    const endIndex = startIndex + options.pageSize;
    filtered = filtered.slice(startIndex, endIndex);
  }
  
  return {
    data: filtered,
    total: filtered.length,
    page: options.page || 1,
    pageSize: options.pageSize || filtered.length
  };
}
```

##### 1.2 배치 업데이트 최적화
```javascript
// Models.gs - 개선된 update
update(requestNo, updates) {
  if (!this.sheet) return false;
  
  // 전체 데이터 읽기 (1회만)
  const data = this.sheet.getDataRange().getValues();
  const requestNoStr = String(requestNo);
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === requestNoStr) {
      // 배치 업데이트 (여러 셀을 한 번에)
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
      
      // 한 번에 업데이트
      updatesArray.forEach(update => {
        update.range.setValue(update.value);
      });
      
      return true;
    }
  }
  return false;
}
```

##### 1.3 인덱스 기반 검색 (선택적)
```javascript
// Models.gs - 인덱스 캐싱
constructor() {
  this.sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(CONFIG.SHEETS.REQUESTS);
  this._indexCache = null; // 인덱스 캐시
  this._indexCacheTime = 0;
  this._indexCacheTTL = 60000; // 1분
}

_findByRequestNo(requestNo) {
  // 인덱스 캐시 확인
  const now = new Date().getTime();
  if (!this._indexCache || (now - this._indexCacheTime) > this._indexCacheTTL) {
    this._buildIndex();
  }
  
  return this._indexCache[String(requestNo)] || null;
}

_buildIndex() {
  const data = this.sheet.getDataRange().getValues();
  this._indexCache = {};
  
  for (let i = 1; i < data.length; i++) {
    const requestNo = String(data[i][0]);
    this._indexCache[requestNo] = i + 1; // 행 번호 저장
  }
  
  this._indexCacheTime = new Date().getTime();
}
```

---

### 2. 캐싱 전략 구현

#### 문제점
- **CacheManager가 정의되어 있지만 사용되지 않음**
- 모든 데이터를 매번 Google Sheets에서 읽어옴
- 코드 데이터, 사용자 목록 등 변경 빈도가 낮은 데이터도 캐싱 없음

#### 개선 방안

##### 2.1 getAllRequests 캐싱
```javascript
// Code.gs - 개선된 getAllRequests
function getAllRequests(filter = {}, sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user || user.role !== CONFIG.ROLES.ADMIN) {
      return [];
    }
    
    // 캐시 키 생성 (필터 포함)
    const cacheKey = 'all_requests_' + JSON.stringify(filter);
    const cacheManager = new CacheManager();
    
    // 캐시 확인
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      Logger.log('getAllRequests: Using cache');
      return cached;
    }
    
    // 데이터 조회
    const requestModel = new RequestModel();
    if (!requestModel.sheet) return [];
    
    // 서버 측 필터링 및 페이징
    const options = {
      page: filter.page || 1,
      pageSize: filter.pageSize || CONFIG.PAGE_SIZE,
      sortBy: filter.sortBy || 'requestDate',
      sortOrder: filter.sortOrder || 'desc'
    };
    
    const result = requestModel.findAll(filter, options);
    
    // 포맷팅
    const formatted = result.data.map(req => ({
      // ... 포맷팅 로직
    }));
    
    // 캐시 저장 (TTL: 1분)
    cacheManager.set(cacheKey, formatted, 60);
    
    return formatted;
  } catch (error) {
    Logger.log('getAllRequests error: ' + error);
    return [];
  }
}
```

##### 2.2 코드 데이터 캐싱
```javascript
// Code.gs - getCodes 함수 개선
function getCodes(sessionToken) {
  const cacheManager = new CacheManager();
  const cacheKey = 'codes_all';
  
  // 캐시 확인 (코드는 자주 변경되지 않음)
  const cached = cacheManager.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // 코드 조회
  const codeModel = new CodeModel();
  const codes = codeModel.findAll();
  
  // 캐시 저장 (TTL: 10분)
  cacheManager.set(cacheKey, codes, 600);
  
  return codes;
}
```

##### 2.3 사용자 목록 캐싱
```javascript
// Code.gs - getAllUsers 개선
function getAllUsers(sessionToken) {
  const user = getCurrentUser(sessionToken);
  if (!user || user.role !== CONFIG.ROLES.ADMIN) {
    return [];
  }
  
  const cacheManager = new CacheManager();
  const cacheKey = 'users_all';
  
  const cached = cacheManager.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  const userModel = new UserModel();
  const users = userModel.findAll();
  
  // 캐시 저장 (TTL: 5분)
  cacheManager.set(cacheKey, users, 300);
  
  return users;
}
```

##### 2.4 캐시 무효화 전략
```javascript
// Code.gs - 데이터 변경 시 캐시 무효화
function createRequest(requestData, sessionToken) {
  // ... 요청 생성 로직
  
  // 관련 캐시 무효화
  const cacheManager = new CacheManager();
  cacheManager.remove('all_requests_*'); // 와일드카드 지원 필요 시 별도 구현
  cacheManager.remove('request_stats_' + user.userId);
  cacheManager.remove('my_requests_' + user.userId);
  
  return result;
}

function updateRequestStatus(requestNo, status, handler, expectedDeliveryDate, sessionToken) {
  // ... 상태 업데이트 로직
  
  // 캐시 무효화
  const cacheManager = new CacheManager();
  cacheManager.remove('all_requests_*');
  cacheManager.remove('request_stats_*');
  cacheManager.remove('my_requests_*');
  cacheManager.remove('request_' + requestNo);
  
  return result;
}
```

---

### 3. API 호출 최적화

#### 문제점
- **순차 호출**: 여러 API를 순차적으로 호출
- **중복 호출**: 같은 데이터를 여러 번 요청
- **불필요한 데이터 전송**: 전체 데이터를 한 번에 전송

#### 개선 방안

##### 3.1 배치 API 구현
```javascript
// Code.gs - 배치 데이터 조회 API
function getDashboardData(sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user) return { error: 'Unauthorized' };
    
    // 병렬 조회
    const [stats, recentRequests, notifications] = [
      getRequestStats(sessionToken),
      getMyRequests({ limit: 5 }, sessionToken),
      getNotifications(sessionToken)
    ];
    
    return {
      success: true,
      stats: stats,
      recentRequests: recentRequests,
      notifications: notifications
    };
  } catch (error) {
    Logger.log('getDashboardData error: ' + error);
    return { error: error.toString() };
  }
}
```

##### 3.2 클라이언트 측 요청 최적화
```javascript
// UserDashboard.html - 개선된 초기화
window.onload = async function() {
  try {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      window.location.href = '?page=login';
      return;
    }

    showLoading('대시보드 로딩 중...');

    // 사용자 정보 캐시 확인
    let user = sessionStorage.getItem('currentUser');
    if (user) {
      user = JSON.parse(user);
    } else {
      user = await callServer('getCurrentUser', sessionToken);
      if (user) {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
      }
    }

    if (!user) {
      hideLoading();
      window.location.href = '?page=login';
      return;
    }

    displayUserInfo(user);

    // ✅ 배치 API 사용 (1회 호출로 모든 데이터 조회)
    const dashboardData = await callServer('getDashboardData', sessionToken);
    
    if (dashboardData.success) {
      displayStats(dashboardData.stats || {});
      displayRecentRequests(dashboardData.recentRequests || []);
      displayNotifications(dashboardData.notifications || []);
    }

    hideLoading();
  } catch (error) {
    console.error('Dashboard init error:', error);
    hideLoading();
    handleError(error);
  }
};
```

##### 3.3 서버 측 필터링으로 데이터 전송량 감소
```javascript
// Code.gs - getAllRequests 개선 (서버 측 필터링)
function getAllRequests(filter = {}, sessionToken) {
  try {
    const user = getCurrentUser(sessionToken);
    if (!user || user.role !== CONFIG.ROLES.ADMIN) {
      return [];
    }
    
    const requestModel = new RequestModel();
    if (!requestModel.sheet) return [];
    
    // ✅ 서버 측에서 필터링 (클라이언트로 불필요한 데이터 전송 방지)
    const serverFilter = {
      status: filter.status,
      region: filter.region,
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo
    };
    
    // 서버 측 페이징
    const options = {
      page: filter.page || 1,
      pageSize: filter.pageSize || CONFIG.PAGE_SIZE,
      sortBy: 'requestDate',
      sortOrder: 'desc'
    };
    
    const result = requestModel.findAll(serverFilter, options);
    
    // 포맷팅
    const formatted = result.data.map(req => ({
      // ... 포맷팅
    }));
    
    return formatted;
  } catch (error) {
    Logger.log('getAllRequests error: ' + error);
    return [];
  }
}
```

---

### 4. 로깅 최적화

#### 문제점
- **과도한 로깅**: 모든 함수에서 상세 로그 출력
- **프로덕션 환경에서도 로그 출력**: 성능 저하

#### 개선 방안

##### 4.1 조건부 로깅
```javascript
// Config.gs - 로깅 설정 추가
const CONFIG = {
  // ... 기존 설정
  DEBUG: {
    ENABLED: false, // 프로덕션에서는 false
    LOG_LEVEL: 'ERROR' // ERROR, WARN, INFO, DEBUG
  }
};

// Utils.gs - 로깅 헬퍼 함수
function log(level, message) {
  if (!CONFIG.DEBUG.ENABLED) return;
  
  const levels = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
  const currentLevel = levels[CONFIG.DEBUG.LOG_LEVEL] || 0;
  const messageLevel = levels[level] || 0;
  
  if (messageLevel <= currentLevel) {
    Logger.log(`[${level}] ${message}`);
  }
}

// 사용 예시
function getAllRequests(filter = {}, sessionToken) {
  try {
    log('DEBUG', 'getAllRequests: START'); // DEBUG 레벨만 출력
    // ... 로직
    log('ERROR', 'getAllRequests error: ' + error); // ERROR는 항상 출력
  } catch (error) {
    log('ERROR', 'getAllRequests: EXCEPTION - ' + error.toString());
    return [];
  }
}
```

##### 4.2 성능 측정 로깅 제거
```javascript
// 프로덕션에서는 성능 측정 로그 제거
function getAllRequests(filter = {}, sessionToken) {
  // const startTime = new Date().getTime(); // 제거 또는 조건부
  try {
    // ... 로직
    // Logger.log('getAllRequests: SUCCESS - ' + (new Date().getTime() - startTime) + 'ms'); // 제거
    return formatted;
  } catch (error) {
    // Logger.log('getAllRequests: EXCEPTION'); // ERROR 레벨만
    return [];
  }
}
```

---

### 5. 데이터 포맷팅 최적화

#### 문제점
- **매번 날짜 포맷팅**: 같은 데이터를 여러 번 포맷팅
- **불필요한 변환**: 클라이언트에서 다시 포맷팅

#### 개선 방안

##### 5.1 포맷팅 캐싱
```javascript
// Utils.gs - 포맷팅 캐시
const formatCache = {};

function formatDateCached(date, format = 'yyyy-MM-dd') {
  if (!date) return '';
  
  const cacheKey = String(date) + '_' + format;
  if (formatCache[cacheKey]) {
    return formatCache[cacheKey];
  }
  
  const formatted = Utilities.formatDate(new Date(date), 'Asia/Seoul', format);
  formatCache[cacheKey] = formatted;
  
  return formatted;
}
```

##### 5.2 클라이언트 측 포맷팅
```javascript
// 서버에서는 원시 데이터만 전송
// 클라이언트에서 포맷팅 (더 빠름)
function getAllRequests(filter = {}, sessionToken) {
  // ... 데이터 조회
  
  // 포맷팅 최소화 (클라이언트에서 처리)
  const formatted = result.data.map(req => ({
    requestNo: req.requestNo,
    requestDate: req.requestDate, // Date 객체 또는 ISO 문자열
    status: req.status,
    // ... 기타 필드
  }));
  
  return formatted;
}

// 클라이언트 측 포맷팅
function formatRequestDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
```

---

### 6. 프론트엔드 최적화

#### 문제점
- **DOM 조작 비효율**: innerHTML을 매번 재생성
- **이벤트 리스너 중복**: 동적으로 생성된 요소에 이벤트 리스너가 없음

#### 개선 방안

##### 6.1 가상 DOM 또는 템플릿 사용
```javascript
// AdminPage.html - 템플릿 기반 렌더링
function renderAdminRequestsTable(requests) {
  const tbody = document.getElementById('adminRequestsBody');
  const template = document.getElementById('requestRowTemplate');
  
  // 기존 내용 제거 (효율적)
  tbody.innerHTML = '';
  
  // DocumentFragment 사용 (DOM 조작 최소화)
  const fragment = document.createDocumentFragment();
  
  requests.forEach(req => {
    const clone = template.content.cloneNode(true);
    clone.querySelector('.request-no').textContent = req.requestNo;
    clone.querySelector('.status').innerHTML = createStatusBadge(req.status);
    // ... 기타 필드 설정
    
    fragment.appendChild(clone);
  });
  
  tbody.appendChild(fragment);
}

// HTML에 템플릿 추가
<template id="requestRowTemplate">
  <tr>
    <td><input type="checkbox" class="request-check"></td>
    <td class="request-no"></td>
    <td class="status"></td>
    <!-- ... 기타 셀 -->
  </tr>
</template>
```

##### 6.2 이벤트 위임 사용
```javascript
// 개별 이벤트 리스너 대신 이벤트 위임
document.getElementById('adminRequestsBody').addEventListener('click', function(e) {
  if (e.target.classList.contains('btn-detail')) {
    const requestNo = e.target.dataset.requestNo;
    showDetail(requestNo);
  }
  
  if (e.target.classList.contains('request-check')) {
    updateSelection();
  }
});
```

---

### 7. 우선순위별 개선 계획

#### 🔴 긴급 (즉시 적용)
1. **서버 측 필터링 및 페이징 구현** (Code.gs, Models.gs)
   - 예상 개선: 50-70% 성능 향상
   - 작업 시간: 2-3시간

2. **getAllRequests 캐싱** (Code.gs)
   - 예상 개선: 80-90% 응답 시간 단축 (캐시 히트 시)
   - 작업 시간: 1시간

3. **로깅 최적화** (전체)
   - 예상 개선: 10-20% 성능 향상
   - 작업 시간: 1시간

#### 🟡 중요 (단기)
4. **배치 API 구현** (Code.gs, 프론트엔드)
   - 예상 개선: 30-40% 네트워크 요청 감소
   - 작업 시간: 2-3시간

5. **코드 데이터 캐싱** (Code.gs)
   - 예상 개선: 60-70% 응답 시간 단축
   - 작업 시간: 30분

6. **배치 업데이트 최적화** (Models.gs)
   - 예상 개선: 40-50% 업데이트 시간 단축
   - 작업 시간: 1-2시간

#### 🟢 선택적 (중기)
7. **인덱스 기반 검색** (Models.gs)
   - 예상 개선: 70-80% 검색 시간 단축
   - 작업 시간: 2-3시간

8. **프론트엔드 템플릿 최적화** (전체 HTML)
   - 예상 개선: 20-30% 렌더링 시간 단축
   - 작업 시간: 3-4시간

9. **클라이언트 측 포맷팅** (프론트엔드)
   - 예상 개선: 10-15% 서버 부하 감소
   - 작업 시간: 1-2시간

---

### 8. 예상 성능 개선 효과

#### 현재 상태 (가정)
- getAllRequests: 3-5초 (1000건 기준)
- 대시보드 로드: 2-3초
- 페이지 전환: 1-2초

#### 개선 후 예상
- getAllRequests: **0.5-1초** (캐시 히트 시), **1-2초** (캐시 미스 시)
- 대시보드 로드: **0.5-1초** (배치 API 사용)
- 페이지 전환: **0.3-0.5초** (캐싱 및 최적화)

#### 전체 성능 향상
- **60-80% 성능 개선** 예상
- **사용자 경험 대폭 향상**
- **서버 부하 50-70% 감소**

---

### 9. 구현 시 주의사항

1. **캐시 무효화**: 데이터 변경 시 관련 캐시를 반드시 무효화
2. **점진적 적용**: 한 번에 모든 최적화를 적용하지 말고 단계적으로
3. **성능 측정**: 각 최적화 전후로 성능 측정 및 비교
4. **에러 처리**: 캐시 실패 시 원본 데이터 조회로 폴백
5. **테스트**: 각 최적화 후 충분한 테스트 수행

---

### 10. 참고 자료

- [Google Apps Script 최적화 가이드](https://developers.google.com/apps-script/guides/support/best-practices)
- [Google Sheets API 성능 최적화](https://developers.google.com/sheets/api/guides/performance)
- [CacheService 문서](https://developers.google.com/apps-script/reference/cache/cache-service)
