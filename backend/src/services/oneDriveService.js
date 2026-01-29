import {
  getFileContent,
  uploadFileContent,
  getItemByPath,
  uploadFileToFolder,
  ensureAppFolder,
  createFolder,
} from '../graph.js';
import { config } from '../config.js';

const FILES = {
  REQUESTS: '신청내역.csv',
  USERS: '사용자관리.csv',
  CODES: '코드관리.csv',
  DELIVERY_PLACES: '배송지관리.csv',
  LOGS: '로그.csv',
};
const PHOTOS_FOLDER = '사진첨부';

function parseCsv(text) {
  if (!text || !text.trim()) return { headers: [], rows: [] };
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = [];
  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (!line.trim()) {
      rows.push([]);
      continue;
    }
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
    values.push(current.trim());
    rows.push(values);
  }
  return { headers, rows };
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    obj[h] = row[i] !== undefined ? row[i] : '';
  });
  return obj;
}

function objectToRow(headers, obj) {
  return headers.map((h) => (obj[h] !== undefined && obj[h] !== null ? String(obj[h]) : ''));
}

function csvSerialize(headers, rows) {
  const escape = (v) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
}

async function readCsv(fileName) {
  try {
    const text = await getFileContent(`${config.oneDrive.appFolder}/${fileName}`);
    return parseCsv(typeof text === 'string' ? text : '');
  } catch (err) {
    if (err.message && err.message.includes('404')) {
      return { headers: [], rows: [] };
    }
    throw err;
  }
}

async function writeCsv(fileName, headers, rows) {
  const content = csvSerialize(headers, rows);
  await uploadFileContent(`${fileName}`, content, 'text/csv; charset=utf-8');
}

export async function initAppFolder() {
  return ensureAppFolder();
}

export async function getRequests(filter = {}) {
  const { headers, rows } = await readCsv(FILES.REQUESTS);
  if (headers.length === 0) return [];
  const keyMap = {
    신청번호: 'requestNo',
    신청일시: 'requestDate',
    신청자이메일: 'requesterEmail',
    신청자이름: 'requesterName',
    기사코드: 'employeeCode',
    소속팀: 'team',
    지역: 'region',
    품명: 'itemName',
    모델명: 'modelName',
    시리얼번호: 'serialNo',
    수량: 'quantity',
    관리번호: 'assetNo',
    수령지: 'deliveryPlace',
    전화번호: 'phone',
    업체명: 'company',
    비고: 'remarks',
    사진URL: 'photoUrl',
    상태: 'status',
    접수담당자: 'handler',
    담당자비고: 'handlerRemarks',
    발주일시: 'orderDate',
    예상납기일: 'expectedDeliveryDate',
    수령확인일시: 'receiptDate',
    최종수정일시: 'lastModified',
    최종수정자: 'lastModifiedBy',
  };
  let list = rows.map((row) => {
    const o = rowToObject(headers, row);
    const out = {};
    Object.keys(o).forEach((k) => {
      const key = keyMap[k] || k;
      out[key] = o[k];
    });
    return out;
  });
  if (filter.requesterEmail) list = list.filter((r) => r.requesterEmail === filter.requesterEmail);
  if (filter.status) list = list.filter((r) => r.status === filter.status);
  if (filter.assetNo) list = list.filter((r) => String(r.assetNo).trim() === String(filter.assetNo).trim());
  list.sort((a, b) => (b.requestDate || '').localeCompare(a.requestDate || ''));
  return list;
}

export async function getRequestById(requestNo) {
  const list = await getRequests({});
  return list.find((r) => String(r.requestNo) === String(requestNo)) || null;
}

export async function createRequest(data) {
  const { headers, rows } = await readCsv(FILES.REQUESTS);
  const headerOrder = [
    '신청번호', '신청일시', '신청자이메일', '신청자이름', '기사코드', '소속팀', '지역',
    '품명', '모델명', '시리얼번호', '수량', '관리번호', '수령지', '전화번호', '업체명',
    '비고', '사진URL', '상태', '접수담당자', '담당자비고', '발주일시', '예상납기일',
    '수령확인일시', '최종수정일시', '최종수정자',
  ];
  const h = headers.length ? headers : headerOrder;
  const revMap = {};
  Object.entries({
    requestNo: '신청번호', requestDate: '신청일시', requesterEmail: '신청자이메일',
    requesterName: '신청자이름', employeeCode: '기사코드', team: '소속팀', region: '지역',
    itemName: '품명', modelName: '모델명', serialNo: '시리얼번호', quantity: '수량',
    assetNo: '관리번호', deliveryPlace: '수령지', phone: '전화번호', company: '업체명',
    remarks: '비고', photoUrl: '사진URL', status: '상태', handler: '접수담당자',
    handlerRemarks: '담당자비고', orderDate: '발주일시', expectedDeliveryDate: '예상납기일',
    receiptDate: '수령확인일시', lastModified: '최종수정일시', lastModifiedBy: '최종수정자',
  }).forEach(([k, v]) => { revMap[k] = v; });
  const row = h.map((header) => {
    const key = Object.keys(revMap).find((k) => revMap[k] === header);
    return data[key] !== undefined ? String(data[key]) : '';
  });
  rows.push(row);
  if (headers.length === 0) headers.push(...headerOrder);
  await writeCsv(FILES.REQUESTS, h, rows);
  return data;
}

export async function updateRequest(requestNo, updates) {
  const list = await getRequests({});
  const idx = list.findIndex((r) => String(r.requestNo) === String(requestNo));
  if (idx === -1) return false;
  const { headers, rows } = await readCsv(FILES.REQUESTS);
  const revMap = {
    requestNo: '신청번호', requestDate: '신청일시', requesterEmail: '신청자이메일',
    requesterName: '신청자이름', employeeCode: '기사코드', team: '소속팀', region: '지역',
    itemName: '품명', modelName: '모델명', serialNo: '시리얼번호', quantity: '수량',
    assetNo: '관리번호', deliveryPlace: '수령지', phone: '전화번호', company: '업체명',
    remarks: '비고', photoUrl: '사진URL', status: '상태', handler: '접수담당자',
    handlerRemarks: '담당자비고', orderDate: '발주일시', expectedDeliveryDate: '예상납기일',
    receiptDate: '수령확인일시', lastModified: '최종수정일시', lastModifiedBy: '최종수정자',
  };
  const headerIdx = {};
  headers.forEach((h, i) => { headerIdx[revMap[h] || h] = i; });
  Object.entries(updates).forEach(([k, v]) => {
    const col = headers.indexOf(revMap[k] || k);
    if (col >= 0 && rows[idx]) rows[idx][col] = v !== undefined ? String(v) : '';
  });
  await writeCsv(FILES.REQUESTS, headers, rows);
  return true;
}

export async function getUsers() {
  const { headers, rows } = await readCsv(FILES.USERS);
  if (headers.length === 0) return [];
  return rows.map((row) => rowToObject(headers, row));
}

export async function getUserById(userId) {
  const users = await getUsers();
  return users.find((u) => String(u['사용자ID'] || u['userId']).trim() === String(userId).trim()) || null;
}

export async function updateUserPassword(userId, passwordHash) {
  const { headers, rows } = await readCsv(FILES.USERS);
  const colId = headers.indexOf('사용자ID');
  const colHash = headers.indexOf('비밀번호해시');
  if (colId === -1 || colHash === -1) return false;
  const idx = rows.findIndex((r) => String(r[colId]).trim() === String(userId).trim());
  if (idx === -1) return false;
  rows[idx][colHash] = passwordHash;
  await writeCsv(FILES.USERS, headers, rows);
  return true;
}

export async function getRegions() {
  const { headers, rows } = await readCsv(FILES.CODES);
  const regions = [];
  for (const row of rows) {
    if (row.every((c) => !c)) break;
    if (headers[1] === '지역명' && row[2] === 'Y') {
      regions.push({ code: row[0], name: row[1] });
    }
  }
  return regions.length ? regions : [{ code: 'SEL', name: '서울' }, { code: 'BSN', name: '부산' }];
}

export async function getTeams() {
  const { rows } = await readCsv(FILES.CODES);
  const teams = [];
  let i = 0;
  while (i < rows.length && !rows[i].every((c) => !c)) i++;
  i++;
  while (i < rows.length) {
    const row = rows[i];
    if (row.every((c) => !c)) {
      i++;
      continue;
    }
    if (row[3] === 'Y') teams.push({ code: row[0], name: row[1], region: row[2] });
    i++;
  }
  return teams;
}

export async function getDeliveryPlaces(team = null) {
  const { headers, rows } = await readCsv(FILES.DELIVERY_PLACES);
  if (headers.length === 0) return [];
  let list = rows.map((row) => rowToObject(headers, row));
  const activeIdx = headers.indexOf('활성화');
  if (activeIdx >= 0) list = list.filter((r) => r[headers[activeIdx]] === 'Y');
  const teamIdx = headers.indexOf('소속팀');
  if (team && teamIdx >= 0) list = list.filter((r) => r[headers[teamIdx]] === team);
  return list;
}

export async function appendLog(level, action, requestNo, userEmail, details) {
  const { headers, rows } = await readCsv(FILES.LOGS);
  const h = headers.length ? headers : ['일시', '레벨', '액션', '신청번호', '사용자', '상세내용'];
  rows.push([
    new Date().toISOString(),
    level,
    action,
    requestNo || '',
    userEmail || '',
    details || '',
  ]);
  if (headers.length === 0) headers.push(...h);
  await writeCsv(FILES.LOGS, h, rows);
}

export async function uploadPhoto(requestNo, buffer, contentType) {
  try {
    await getItemByPath(PHOTOS_FOLDER);
  } catch {
    await createFolder(PHOTOS_FOLDER);
  }
  const fileName = `${requestNo}_${Date.now()}.jpg`;
  const result = await uploadFileToFolder(PHOTOS_FOLDER, fileName, buffer, contentType);
  const link = result?.webUrl || result?.id;
  if (!link) {
    const item = await getItemByPath(`${PHOTOS_FOLDER}/${fileName}`);
    return item?.webUrl || (item && item['@microsoft.graph.downloadUrl']) || '';
  }
  return link;
}
