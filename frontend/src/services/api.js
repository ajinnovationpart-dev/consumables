/**
 * 프론트엔드 API 클라이언트.
 * - API_BASE: 로컬 개발 시 '/api'(Vite 프록시), 배포 시 VITE_API_URL (끝에 /api 자동 보정).
 * - auth, requests, codes, admin, getAttachmentUrl, formatDisplayDate 제공.
 * - Bearer 토큰·ngrok-skip-browser-warning 헤더 자동 부착.
 */
// 로컬 개발: 프록시 사용 → '/api'
// 배포/ngrok: VITE_API_URL=https://xxx.ngrok-free.dev 또는 .../api (미지정 시 /api 붙임)
const raw = import.meta.env.VITE_API_URL ?? '/api';
export const API_BASE =
  typeof raw === 'string' && raw.startsWith('http') && !raw.replace(/\/$/, '').endsWith('/api')
    ? raw.replace(/\/?$/, '') + '/api'
    : raw;

/** 첨부 이미지 등 API 기준 절대 URL (GitHub Pages 배포 시 백엔드 도메인 필요) */
export function getApiOrigin() {
  if (API_BASE.startsWith('http')) return API_BASE.replace(/\/api\/?$/, '');
  return '';
}
export function getAttachmentUrl(photoUrl) {
  if (!photoUrl) return '';
  if (photoUrl.startsWith('http')) return photoUrl;
  const origin = getApiOrigin();
  return origin ? `${origin}${photoUrl}` : photoUrl;
}

/** API 응답 날짜 표시 (로컬 시간 기준 YYYY-MM-DD HH:mm:ss) */
export function formatDisplayDate(val) {
  if (val == null || val === '') return '-';
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    if (Number.isNaN(d.getTime())) return String(val);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${s}`;
  }
  const str = String(val).trim();
  if (!str) return '-';
  // 서버가 UTC로 저장한 'YYYY-MM-DD HH:mm:ss' 형태면 UTC로 파싱 후 로컬 시간으로 표시
  const utcLike = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(str) && !/Z$/i.test(str.trim());
  const d = new Date(utcLike ? str.replace(' ', 'T') + 'Z' : str);
  if (Number.isNaN(d.getTime())) return str;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

function getToken() {
  return sessionStorage.getItem('token') || localStorage.getItem('token');
}

/** 절대 URL일 때 반드시 /api 포함 (배포 빌드에서 VITE_API_URL에 /api 누락 시 대비) */
function buildUrl(path) {
  if (path.startsWith('http')) return path;
  const base = API_BASE.replace(/\/$/, '');
  const isAbsolute = base.startsWith('http');
  const hasApi = base.endsWith('/api');
  if (isAbsolute && !hasApi) return `${base}/api${path.startsWith('/') ? path : '/' + path}`;
  return `${base}${path.startsWith('/') ? path : '/' + path}`;
}

export async function api(path, options = {}) {
  const token = getToken();
  const url = buildUrl(path);
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  // ngrok 무료 플랜: 브라우저 경고 페이지 건너뛰고 실제 API 응답 받기
  if (url.includes('ngrok')) headers['ngrok-skip-browser-warning'] = 'true';

  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  const data = await res.json().catch(() => ({}));

  // ngrok 경고 페이지 등 HTML이 오면 JSON이 아님 → 파싱 실패 시 data가 {}
  if (res.ok && path.includes('/auth/login') && typeof data?.success !== 'boolean') {
    const err = new Error('서버 응답을 확인할 수 없습니다. ngrok 사용 시 브라우저에서 백엔드 주소를 한 번 열어 "Visit Site" 후 다시 로그인해 보세요.');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(data.message || res.statusText || '요청 실패');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const auth = {
  login: (userId, password) => api('/auth/login', { method: 'POST', body: JSON.stringify({ userId, password }) }),
  me: () => api('/auth/me'),
  changePassword: (userId, oldPassword, newPassword) =>
    api('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ userId, oldPassword, newPassword }),
    }),
};

export const requests = {
  my: () => api('/requests/my'),
  all: (params) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    const query = q.toString();
    return api(`/requests/all${query ? `?${query}` : ''}`);
  },
  dashboard: (params) => {
    const q = new URLSearchParams();
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    const query = q.toString();
    return api(`/requests/dashboard${query ? `?${query}` : ''}`);
  },
  notificationCount: () => api('/requests/notification-count'),
  get: (requestNo) => api(`/requests/${requestNo}`),
  create: (formData) => api('/requests', { method: 'POST', body: JSON.stringify(formData) }),
  updateStatus: (requestNo, status, remarks, options = {}) =>
    api(`/requests/${requestNo}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        remarks,
        handler: options.handler !== undefined ? options.handler : undefined,
        expectedDeliveryDate: options.expectedDeliveryDate !== undefined ? options.expectedDeliveryDate : undefined,
      }),
    }),
};

export const admin = {
  users: {
    list: () => api('/admin/users'),
    create: (body) => api('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
    update: (userId, body) => api(`/admin/users/${encodeURIComponent(userId)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
  deliveryPlaces: {
    list: () => api('/admin/delivery-places'),
    create: (body) => api('/admin/delivery-places', { method: 'POST', body: JSON.stringify(body) }),
    update: (body) => api('/admin/delivery-places', { method: 'PATCH', body: JSON.stringify(body) }),
  },
  importCsv: (csvContent) => api('/admin/import-csv', { method: 'POST', body: JSON.stringify({ csvContent }) }),
  exportMaster: () => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const url = `${API_BASE}/admin/export-master`;
    const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    if (url.includes('ngrok')) headers['ngrok-skip-browser-warning'] = 'true';
    return fetch(url, { headers }).then((r) => {
      if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.message || r.statusText)));
      return r.blob();
    });
  },
};

export const codes = {
  regions: () => api('/codes/regions'),
  teams: () => api('/codes/teams'),
  deliveryPlaces: (team) => api(team ? `/codes/delivery-places?team=${encodeURIComponent(team)}` : '/codes/delivery-places'),
  handlers: () => api('/codes/handlers'),
};

/** 챗봇: 역할에 따라 백엔드가 컨텍스트 구성 후 답변 반환 */
export const chat = {
  post: (message) => api('/chat', { method: 'POST', body: JSON.stringify({ message }) }),
};
