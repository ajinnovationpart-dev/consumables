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

function getToken() {
  return sessionStorage.getItem('token') || localStorage.getItem('token');
}

export async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
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
  all: () => api('/requests/all'),
  dashboard: () => api('/requests/dashboard'),
  get: (requestNo) => api(`/requests/${requestNo}`),
  create: (formData) => api('/requests', { method: 'POST', body: JSON.stringify(formData) }),
  updateStatus: (requestNo, status, remarks) =>
    api(`/requests/${requestNo}/status`, { method: 'PATCH', body: JSON.stringify({ status, remarks }) }),
};

export const codes = {
  regions: () => api('/codes/regions'),
  teams: () => api('/codes/teams'),
  deliveryPlaces: (team) => api(team ? `/codes/delivery-places?team=${encodeURIComponent(team)}` : '/codes/delivery-places'),
};
