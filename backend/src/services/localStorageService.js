import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { config, getExcelPath, getAttachmentFolderForRequest } from '../config.js';

const SHEETS = {
  REQUESTS: '신청내역',
  USERS: '사용자관리',
  CODES: '코드관리',
  DELIVERY_PLACES: '배송지관리',
  LOGS: '로그',
};

const REQUEST_HEADERS_KO = [
  '신청번호', '신청일시', '신청자이메일', '신청자이름', '기사코드', '소속팀', '지역',
  '품명', '모델명', '시리얼번호', '수량', '관리번호', '수령지', '전화번호', '업체명',
  '비고', '사진URL', '상태', '접수담당자', '담당자비고', '발주일시', '예상납기일',
  '수령확인일시', '최종수정일시', '최종수정자',
];

const KEY_TO_KO = {
  requestNo: '신청번호', requestDate: '신청일시', requesterEmail: '신청자이메일',
  requesterName: '신청자이름', employeeCode: '기사코드', team: '소속팀', region: '지역',
  itemName: '품명', modelName: '모델명', serialNo: '시리얼번호', quantity: '수량',
  assetNo: '관리번호', deliveryPlace: '수령지', phone: '전화번호', company: '업체명',
  remarks: '비고', photoUrl: '사진URL', status: '상태', handler: '접수담당자',
  handlerRemarks: '담당자비고', orderDate: '발주일시', expectedDeliveryDate: '예상납기일',
  receiptDate: '수령확인일시', lastModified: '최종수정일시', lastModifiedBy: '최종수정자',
};

const KO_TO_KEY = {};
Object.entries(KEY_TO_KO).forEach(([k, v]) => { KO_TO_KEY[v] = k; });

/** Excel 실제 컬럼명이 코드와 다를 때 매핑 (기존 파일 호환) */
const HEADER_ALIASES = {
  '신청자이머': '신청자이메일',
  '신청자 아이디': '신청자이메일',
  '접수담당지': '접수담당자',
  '수령확인': '수령확인일시',
  '최종수정일': '최종수정일시',
};

function ensureDir(dirPath) {
  return fs.mkdir(dirPath, { recursive: true });
}

/** Excel 날짜(숫자) → 표시용 문자열 (API 응답 일관) */
function excelDateToStr(val) {
  if (val == null || val === '') return '';
  if (typeof val === 'number' && val > 0) {
    const date = new Date((val - 25569) * 86400 * 1000);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 19).replace('T', ' ');
  }
  return String(val);
}

/** 워크북에서 시트 찾기 (이름 공백/오타 허용) */
function getSheet(wb, exactName) {
  if (wb.Sheets[exactName]) return wb.Sheets[exactName];
  const names = (wb.SheetNames || []).map((n) => (typeof n === 'string' ? n.trim() : String(n)));
  const idx = names.findIndex((n) => n === exactName || n.includes(exactName) || exactName.includes(n));
  if (idx >= 0 && wb.SheetNames[idx]) return wb.Sheets[wb.SheetNames[idx]];
  return null;
}

/** Excel 파일이 없으면 기본 시트 구조로 생성 */
export async function ensureExcelExists() {
  const excelPath = getExcelPath();
  if (fsSync.existsSync(excelPath)) return;
  await ensureDir(path.dirname(excelPath));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([REQUEST_HEADERS_KO]), SHEETS.REQUESTS);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['사용자ID', '비밀번호해시', '이름', '기사코드', '소속팀', '지역', '역할', '활성화']]), SHEETS.USERS);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['코드', '지역명', '사용여부', '정렬순서']]), SHEETS.CODES);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['배송지명', '소속팀', '주소', '연락처', '담당자', '활성화', '비고']]), SHEETS.DELIVERY_PLACES);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['일시', '레벨', '액션', '신청번호', '사용자', '상세내용']]), SHEETS.LOGS);
  XLSX.writeFile(wb, excelPath);
}

export async function getRequests(filter = {}) {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) {
    console.warn('[getRequests] Excel 파일 없음:', excelPath);
    return [];
  }
  try {
    const wb = XLSX.readFile(excelPath, { cellDates: false });
    const sheet = getSheet(wb, SHEETS.REQUESTS) || wb.Sheets[wb.SheetNames?.[0]];
    if (!sheet) {
      console.warn('[getRequests] 시트 없음. 시트이름:', wb.SheetNames);
      return [];
    }
    let list = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const dateKeys = ['requestDate', 'orderDate', 'expectedDeliveryDate', 'receiptDate', 'lastModified'];
    list = list.map((row) => {
      const out = {};
      Object.entries(row).forEach(([k, v]) => {
        const ko = (typeof k === 'string' && k.trim()) ? (HEADER_ALIASES[k.trim()] || k) : k;
        const key = KO_TO_KEY[ko] || ko;
        out[key] = dateKeys.includes(key) ? excelDateToStr(v) : v;
      });
      return out;
    });
    if (filter.requesterEmail) list = list.filter((r) => String(r.requesterEmail || '').trim() === String(filter.requesterEmail || '').trim());
    if (filter.status) list = list.filter((r) => r.status === filter.status);
    if (filter.assetNo) list = list.filter((r) => String(r.assetNo || '').trim() === String(filter.assetNo || '').trim());
    list.sort((a, b) => String(b.requestDate ?? '').localeCompare(String(a.requestDate ?? '')));
    return list;
  } catch (err) {
    console.error('[getRequests] Excel 읽기 실패:', excelPath, err.message);
    throw err;
  }
}

export async function getRequestById(requestNo) {
  const list = await getRequests({});
  return list.find((r) => String(r.requestNo) === String(requestNo)) || null;
}

export async function createRequest(data) {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) await ensureExcelExists();
  const wb = XLSX.readFile(excelPath);
  let sheet = wb.Sheets[SHEETS.REQUESTS];
  if (!sheet) {
    sheet = XLSX.utils.aoa_to_sheet([REQUEST_HEADERS_KO]);
    wb.Sheets[SHEETS.REQUESTS] = sheet;
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const row = {};
  REQUEST_HEADERS_KO.forEach((h) => {
    const key = KO_TO_KEY[h];
    row[h] = data[key] !== undefined ? data[key] : '';
  });
  rows.push(row);
  wb.Sheets[SHEETS.REQUESTS] = XLSX.utils.json_to_sheet(rows);
  await fs.mkdir(path.dirname(excelPath), { recursive: true });
  XLSX.writeFile(wb, excelPath);
  return data;
}

export async function updateRequest(requestNo, updates) {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) return false;
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[SHEETS.REQUESTS];
  if (!sheet) return false;
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const idx = rows.findIndex((r) => String(r['신청번호']) === String(requestNo));
  if (idx === -1) return false;
  Object.entries(updates).forEach(([key, value]) => {
    const ko = KEY_TO_KO[key];
    if (ko) rows[idx][ko] = value;
  });
  wb.Sheets[SHEETS.REQUESTS] = XLSX.utils.json_to_sheet(rows);
  XLSX.writeFile(wb, getExcelPath());
  return true;
}

export async function getUsers() {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) return [];
  try {
    const wb = XLSX.readFile(excelPath, { cellDates: false });
    const sheet = getSheet(wb, SHEETS.USERS);
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } catch (err) {
    console.error('[getUsers] Excel 읽기 실패:', err.message);
    return [];
  }
}

export async function getUserById(userId) {
  const users = await getUsers();
  return users.find((u) => String(u['사용자ID'] || u.userId || '').trim() === String(userId).trim()) || null;
}

export async function updateUserPassword(userId, passwordHash) {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) return false;
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[SHEETS.USERS];
  if (!sheet) return false;
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const idx = rows.findIndex((r) => String(r['사용자ID']).trim() === String(userId).trim());
  if (idx === -1) return false;
  rows[idx]['비밀번호해시'] = passwordHash;
  wb.Sheets[SHEETS.USERS] = XLSX.utils.json_to_sheet(rows);
  XLSX.writeFile(wb, getExcelPath());
  return true;
}

const USER_HEADERS_KO = ['사용자ID', '비밀번호해시', '이름', '기사코드', '소속팀', '지역', '역할', '활성화'];
const DELIVERY_HEADERS_KO = ['배송지명', '소속팀', '주소', '연락처', '담당자', '활성화', '비고'];

export async function createUser(data, passwordHash) {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) await ensureExcelExists();
  const wb = XLSX.readFile(excelPath);
  let sheet = wb.Sheets[SHEETS.USERS];
  if (!sheet) {
    sheet = XLSX.utils.aoa_to_sheet([USER_HEADERS_KO]);
    wb.Sheets[SHEETS.USERS] = sheet;
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const existing = rows.find((r) => String(r['사용자ID'] || '').trim() === String(data.userId || '').trim());
  if (existing) throw new Error('이미 존재하는 사용자 ID입니다.');
  const newRow = {
    사용자ID: (data.userId || '').toString().trim(),
    비밀번호해시: passwordHash || '',
    이름: (data.name || '').toString().trim(),
    기사코드: (data.employeeCode || '').toString().trim(),
    소속팀: (data.team || '').toString().trim(),
    지역: (data.region || '').toString().trim(),
    역할: (data.role || '신청자').toString().trim(),
    활성화: (data.active === 'N' ? 'N' : 'Y').toString().trim(),
  };
  rows.push(newRow);
  wb.Sheets[SHEETS.USERS] = XLSX.utils.json_to_sheet(rows);
  await fs.mkdir(path.dirname(excelPath), { recursive: true });
  XLSX.writeFile(wb, excelPath);
  return newRow;
}

export async function updateUser(userId, data, passwordHash) {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) return false;
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[SHEETS.USERS];
  if (!sheet) return false;
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const idx = rows.findIndex((r) => String(r['사용자ID'] || '').trim() === String(userId).trim());
  if (idx === -1) return false;
  if (data.name !== undefined) rows[idx]['이름'] = String(data.name).trim();
  if (data.employeeCode !== undefined) rows[idx]['기사코드'] = String(data.employeeCode).trim();
  if (data.team !== undefined) rows[idx]['소속팀'] = String(data.team).trim();
  if (data.region !== undefined) rows[idx]['지역'] = String(data.region).trim();
  if (data.role !== undefined) rows[idx]['역할'] = String(data.role).trim();
  if (data.active !== undefined) rows[idx]['활성화'] = data.active === 'N' ? 'N' : 'Y';
  if (passwordHash) rows[idx]['비밀번호해시'] = passwordHash;
  wb.Sheets[SHEETS.USERS] = XLSX.utils.json_to_sheet(rows);
  XLSX.writeFile(wb, excelPath);
  return true;
}

export async function getRegions() {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) return [{ code: 'SEL', name: '서울' }, { code: 'BSN', name: '부산' }];
  try {
    const wb = XLSX.readFile(excelPath, { cellDates: false });
    const sheet = getSheet(wb, SHEETS.CODES);
    if (!sheet) return [{ code: 'SEL', name: '서울' }, { code: 'BSN', name: '부산' }];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });
    const regions = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((c) => c === undefined || c === null || c === '')) continue;
      if (i === 0) continue; // 헤더 행 스킵
      if (row[2] === 'Y') regions.push({ code: row[0], name: row[1] });
    }
    return regions.length ? regions : [{ code: 'SEL', name: '서울' }, { code: 'BSN', name: '부산' }];
  } catch (err) {
    console.error('[getRegions] Excel 읽기 실패:', err.message);
    return [{ code: 'SEL', name: '서울' }, { code: 'BSN', name: '부산' }];
  }
}

export async function getTeams() {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) return [];
  try {
    const wb = XLSX.readFile(excelPath, { cellDates: false });
    const sheet = getSheet(wb, SHEETS.CODES);
    if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });
  const teams = [];
  let pastEmpty = false;
  for (const row of rows) {
    if (!row || row.every((c) => !c)) {
      pastEmpty = true;
      continue;
    }
    if (pastEmpty && row[3] === 'Y') teams.push({ code: row[0], name: row[1], region: row[2] });
  }
  return teams;
  } catch (err) {
    console.error('[getTeams] Excel 읽기 실패:', err.message);
    return [];
  }
}

export async function getDeliveryPlaces(team = null) {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) return [];
  try {
    const wb = XLSX.readFile(excelPath, { cellDates: false });
    const sheet = getSheet(wb, SHEETS.DELIVERY_PLACES);
    if (!sheet) return [];
  let list = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const headers = list.length ? Object.keys(list[0]) : [];
  const activeIdx = headers.indexOf('활성화');
  if (activeIdx >= 0) list = list.filter((r) => r[headers[activeIdx]] === 'Y');
  const teamIdx = headers.indexOf('소속팀');
  if (team && teamIdx >= 0) list = list.filter((r) => r[headers[teamIdx]] === team);
  return list;
  } catch (err) {
    console.error('[getDeliveryPlaces] Excel 읽기 실패:', err.message);
    return [];
  }
}

/** 관리자용: 활성화 필터 없이 전체 배송지 목록 */
export async function getDeliveryPlacesAll() {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) return [];
  try {
    const wb = XLSX.readFile(excelPath, { cellDates: false });
    const sheet = getSheet(wb, SHEETS.DELIVERY_PLACES);
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } catch (err) {
    console.error('[getDeliveryPlacesAll] Excel 읽기 실패:', err.message);
    return [];
  }
}

export async function createDeliveryPlace(data) {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) await ensureExcelExists();
  const wb = XLSX.readFile(excelPath);
  let sheet = wb.Sheets[SHEETS.DELIVERY_PLACES];
  if (!sheet) {
    sheet = XLSX.utils.aoa_to_sheet([DELIVERY_HEADERS_KO]);
    wb.Sheets[SHEETS.DELIVERY_PLACES] = sheet;
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const row = {
    배송지명: (data.name || data.배송지명 || '').toString().trim(),
    소속팀: (data.team || data.소속팀 || '').toString().trim(),
    주소: (data.address || data.주소 || '').toString().trim(),
    연락처: (data.contact || data.연락처 || '').toString().trim(),
    담당자: (data.manager || data.담당자 || '').toString().trim(),
    활성화: (data.active === 'N' ? 'N' : 'Y').toString().trim(),
    비고: (data.remarks || data.비고 || '').toString().trim(),
  };
  rows.push(row);
  wb.Sheets[SHEETS.DELIVERY_PLACES] = XLSX.utils.json_to_sheet(rows);
  await fs.mkdir(path.dirname(excelPath), { recursive: true });
  XLSX.writeFile(wb, excelPath);
  return row;
}

export async function updateDeliveryPlace(originalName, originalTeam, data) {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) return false;
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[SHEETS.DELIVERY_PLACES];
  if (!sheet) return false;
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const nameKey = Object.keys(rows[0] || {}).find((k) => k.includes('배송지') || k === '배송지명') || '배송지명';
  const teamKey = Object.keys(rows[0] || {}).find((k) => k.includes('소속') || k === '소속팀') || '소속팀';
  const idx = rows.findIndex(
    (r) =>
      String(r[nameKey] || '').trim() === String(originalName).trim() &&
      String(r[teamKey] || '').trim() === String(originalTeam).trim()
  );
  if (idx === -1) return false;
  const keys = Object.keys(rows[idx]);
  if (data.name !== undefined) rows[idx][nameKey] = String(data.name).trim();
  if (data.team !== undefined) rows[idx][teamKey] = String(data.team).trim();
  const addrKey = keys.find((k) => k === '주소');
  const contactKey = keys.find((k) => k === '연락처');
  const managerKey = keys.find((k) => k === '담당자');
  const activeKey = keys.find((k) => k === '활성화');
  const remarksKey = keys.find((k) => k === '비고');
  if (addrKey && data.address !== undefined) rows[idx][addrKey] = String(data.address).trim();
  if (contactKey && data.contact !== undefined) rows[idx][contactKey] = String(data.contact).trim();
  if (managerKey && data.manager !== undefined) rows[idx][managerKey] = String(data.manager).trim();
  if (activeKey && data.active !== undefined) rows[idx][activeKey] = data.active === 'N' ? 'N' : 'Y';
  if (remarksKey && data.remarks !== undefined) rows[idx][remarksKey] = String(data.remarks).trim();
  wb.Sheets[SHEETS.DELIVERY_PLACES] = XLSX.utils.json_to_sheet(rows);
  XLSX.writeFile(wb, excelPath);
  return true;
}

/** CSV 본문 파싱 후 배송지(및 선택적 사용자) 일괄 반영. defaultPasswordHash: 새 사용자 기본 비밀번호 해시(선택). 반환: { success, message, imported } */
export async function importFromCSV(csvContent, defaultPasswordHash = '') {
  const lines = (csvContent || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) throw new Error('CSV에 헤더와 데이터가 필요합니다.');

  const parseLine = (line) => {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (!inQuotes && (c === ',' || c === '\t')) {
        out.push(cur.trim());
        cur = '';
        continue;
      }
      cur += c;
    }
    out.push(cur.trim());
    return out;
  };

  const header = parseLine(lines[0]);
  const lower = header.map((h) => String(h).toLowerCase());
  const isDeliveryFormat =
    header.some((h) => String(h).includes('배송지') && String(h).includes('명')) ||
    (lower.includes('소속팀') && (lower.includes('주소') || lower.includes('연락처')));
  const isMasterFormat =
    header.some((h) => String(h).includes('기사명') || String(h).includes('사번')) &&
    header.some((h) => String(h).includes('배송지') || String(h).includes('수령지'));

  let importedUsers = 0;
  let skippedUsers = 0;
  let importedPlaces = 0;
  let skippedPlaces = 0;
  const existingUsers = await getUsers();
  const existingUserIds = new Set(existingUsers.map((u) => String(u['사용자ID'] || u.userId || '').trim()));
  const existingPlaces = await getDeliveryPlacesAll();
  const placeKey = (name, team) => `${String(name).trim()}|${String(team).trim()}`;
  const existingPlaceSet = new Set(
    existingPlaces.map((r) => {
      const n = r['배송지명'] ?? r.name ?? '';
      const t = r['소속팀'] ?? r.team ?? '';
      return placeKey(n, t);
    })
  );

  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) await ensureExcelExists();
  const wb = XLSX.readFile(excelPath);
  const userSheet = wb.Sheets[SHEETS.USERS];
  const deliverySheet = wb.Sheets[SHEETS.DELIVERY_PLACES];
  let userRows = userSheet ? XLSX.utils.sheet_to_json(userSheet, { defval: '' }) : [];
  let deliveryRows = deliverySheet ? XLSX.utils.sheet_to_json(deliverySheet, { defval: '' }) : [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    if (cells.every((c) => !c)) continue;

    if (isDeliveryFormat) {
      const name = cells[header.findIndex((h) => String(h).includes('배송지'))] ?? cells[0];
      const team = cells[header.findIndex((h) => String(h).includes('소속'))] ?? cells[1];
      const address = cells[header.findIndex((h) => h === '주소')] ?? cells[2] ?? '';
      const contact = cells[header.findIndex((h) => h === '연락처')] ?? cells[3] ?? '';
      const manager = cells[header.findIndex((h) => h === '담당자')] ?? cells[4] ?? '';
      const active = (cells[header.findIndex((h) => h === '활성화')] ?? cells[5] ?? 'Y').toString().trim().toUpperCase() === 'N' ? 'N' : 'Y';
      const remarks = cells[header.findIndex((h) => h === '비고')] ?? cells[6] ?? '';
      if (!name && !team) continue;
      const key = placeKey(name, team);
      if (existingPlaceSet.has(key)) {
        skippedPlaces++;
        continue;
      }
      existingPlaceSet.add(key);
      deliveryRows.push({
        배송지명: String(name).trim(),
        소속팀: String(team).trim(),
        주소: String(address).trim(),
        연락처: String(contact).trim(),
        담당자: String(manager).trim(),
        활성화: active,
        비고: String(remarks).trim(),
      });
      importedPlaces++;
    } else if (isMasterFormat) {
      const no = cells[0];
      const driverName = cells[header.findIndex((h) => String(h).includes('기사명'))] ?? cells[1];
      const empCode = cells[header.findIndex((h) => String(h).includes('사번'))] ?? cells[2];
      const userId = cells[header.findIndex((h) => String(h).includes('사용자'))] ?? empCode ?? no;
      const team = cells[header.findIndex((h) => String(h).includes('파트') || String(h).includes('소속'))] ?? cells[4] ?? '';
      const placeName = cells[header.findIndex((h) => String(h).includes('배송지') || String(h).includes('수령지'))] ?? cells[6] ?? '';
      if (userId && !existingUserIds.has(String(userId).trim())) {
        existingUserIds.add(String(userId).trim());
        userRows.push({
          사용자ID: String(userId).trim(),
          비밀번호해시: defaultPasswordHash || '',
          이름: String(driverName || userId).trim(),
          기사코드: String(empCode).trim(),
          소속팀: String(team).trim(),
          지역: '',
          역할: '신청자',
          활성화: 'Y',
        });
        importedUsers++;
      } else if (userId) skippedUsers++;
      if (placeName && team) {
        const key = placeKey(placeName, team);
        if (!existingPlaceSet.has(key)) {
          existingPlaceSet.add(key);
          deliveryRows.push({
            배송지명: String(placeName).trim(),
            소속팀: String(team).trim(),
            주소: '',
            연락처: '',
            담당자: '',
            활성화: 'Y',
            비고: '',
          });
          importedPlaces++;
        } else skippedPlaces++;
      }
    }
  }

  wb.Sheets[SHEETS.USERS] = XLSX.utils.json_to_sheet(userRows);
  wb.Sheets[SHEETS.DELIVERY_PLACES] = XLSX.utils.json_to_sheet(deliveryRows);
  XLSX.writeFile(wb, excelPath);
  return {
    success: true,
    message: `기준정보가 등록되었습니다. (사용자: ${importedUsers}명, 배송지: ${importedPlaces}개)`,
    imported: {
      users: importedUsers,
      deliveryPlaces: importedPlaces,
      skippedUsers,
      skippedPlaces,
    },
  };
}

/** 전체 시트를 담은 Excel 마스터 파일 버퍼 생성 */
export async function exportMasterExcel() {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) await ensureExcelExists();
  const wb = XLSX.readFile(excelPath, { cellDates: false });
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const fileName = `소모품발주_마스터_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { buffer, fileName };
}

export async function appendLog(level, action, requestNo, userEmail, details) {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) return;
  const wb = XLSX.readFile(excelPath);
  let sheet = wb.Sheets[SHEETS.LOGS];
  if (!sheet) {
    sheet = XLSX.utils.aoa_to_sheet([['일시', '레벨', '액션', '신청번호', '사용자', '상세내용']]);
    wb.Sheets[SHEETS.LOGS] = sheet;
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  rows.push({
    일시: new Date().toISOString(),
    레벨: level,
    액션: action,
    신청번호: requestNo || '',
    사용자: userEmail || '',
    상세내용: details || '',
  });
  wb.Sheets[SHEETS.LOGS] = XLSX.utils.json_to_sheet(rows);
  XLSX.writeFile(wb, getExcelPath());
}

/**
 * 첨부 파일 저장: 첨부 파일\{신청번호}\ 폴더에 이미지 저장
 * @param {string} requestNo - 신청번호
 * @param {Buffer} buffer - 이미지 바이너리
 * @param {string} contentType - image/jpeg 등
 * @returns {string} 저장된 파일의 로컬 경로 (또는 상대 경로) - 프론트에서 보여줄 수 있도록
 */
export async function uploadPhoto(requestNo, buffer, contentType) {
  const folderPath = getAttachmentFolderForRequest(requestNo);
  await ensureDir(folderPath);
  const ext = (contentType || 'image/jpeg').includes('png') ? 'png' : 'jpg';
  const fileName = `${requestNo}_${Date.now()}.${ext}`;
  const filePath = path.join(folderPath, fileName);
  await fs.writeFile(filePath, buffer);

  // 프론트에서 /api/attachments/{requestNo}/{fileName} 로 요청 가능하도록 상대 경로 반환
  return `${requestNo}/${fileName}`;
}
