// 로컬 개발: 프록시 사용 → '/api'
// GitHub Pages 배포: .env.production 에 VITE_API_URL=https://your-backend.example.com/api
export const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

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

/** API 응답 날짜 표시 (문자열 그대로, 숫자면 Excel 일련번호 → YYYY-MM-DD HH:mm) */
export function formatDisplayDate(val) {
  if (val == null || val === '') return '-';
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    return Number.isNaN(d.getTime()) ? String(val) : d.toISOString().slice(0, 19).replace('T', ' ');
  }
  return String(val);
}

function getToken() {
  return sessionStorage.getItem('token') || localStorage.getItem('token');
}

export async function api(path, options = {}) {
  const token = getToken();
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  // ngrok 무료 플랜: 브라우저 경고 페이지 건너뛰고 실제 API 응답 받기
  if (url.includes('ngrok')) headers['ngrok-skip-browser-warning'] = 'true';

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

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
  get: (requestNo) => api(`/requests/${requestNo}`),
  create: (formData) => api('/requests', { method: 'POST', body: JSON.stringify(formData) }),
  updateStatus: (requestNo, status, remarks) =>
    api(`/requests/${requestNo}/status`, { method: 'PATCH', body: JSON.stringify({ status, remarks }) }),
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
};
