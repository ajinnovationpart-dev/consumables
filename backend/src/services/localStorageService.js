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

function ensureDir(dirPath) {
  return fs.mkdir(dirPath, { recursive: true });
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
  if (!fsSync.existsSync(excelPath)) return [];
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[SHEETS.REQUESTS];
  if (!sheet) return [];
  let list = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  list = list.map((row) => {
    const out = {};
    Object.entries(row).forEach(([k, v]) => {
      const key = KO_TO_KEY[k] || k;
      out[key] = v;
    });
    return out;
  });
  if (filter.requesterEmail) list = list.filter((r) => r.requesterEmail === filter.requesterEmail);
  if (filter.status) list = list.filter((r) => r.status === filter.status);
  if (filter.assetNo) list = list.filter((r) => String(r.assetNo || '').trim() === String(filter.assetNo || '').trim());
  list.sort((a, b) => (b.requestDate || '').localeCompare(a.requestDate || ''));
  return list;
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
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[SHEETS.USERS];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
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

export async function getRegions() {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) return [{ code: 'SEL', name: '서울' }, { code: 'BSN', name: '부산' }];
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[SHEETS.CODES];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });
  const regions = [];
  for (const row of rows) {
    if (!row || row.every((c) => !c)) break;
    if (row[2] === 'Y') regions.push({ code: row[0], name: row[1] });
  }
  return regions.length ? regions : [{ code: 'SEL', name: '서울' }, { code: 'BSN', name: '부산' }];
}

export async function getTeams() {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) return [];
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[SHEETS.CODES];
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
}

export async function getDeliveryPlaces(team = null) {
  const excelPath = getExcelPath();
  if (!fsSync.existsSync(excelPath)) return [];
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[SHEETS.DELIVERY_PLACES];
  if (!sheet) return [];
  let list = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const headers = list.length ? Object.keys(list[0]) : [];
  const activeIdx = headers.indexOf('활성화');
  if (activeIdx >= 0) list = list.filter((r) => r[headers[activeIdx]] === 'Y');
  const teamIdx = headers.indexOf('소속팀');
  if (team && teamIdx >= 0) list = list.filter((r) => r[headers[teamIdx]] === team);
  return list;
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
