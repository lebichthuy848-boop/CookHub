export async function api(path, { method = 'GET', body, signal } = {}) {
  const headers = { 'X-CookHub-Client': 'web' };
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch('/api' + path, {
    method, credentials: 'include', headers, signal,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(data.detail) ? data.detail.map(x => x.msg).join('; ') : data.detail;
    const error = new Error(detail || 'Không thể hoàn tất yêu cầu.');
    error.status = response.status;
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('session-expired'));
    throw error;
  }
  return data;
}
export const money = amount => Number(amount || 0).toLocaleString('vi-VN') + ' đ';
const DISH_IMAGE_VERSION = '20261006-1';
export function media(path) {
  if (/^https:\/\//i.test(path || '')) return path;
  if (/^(images|videos)\/[\w\-./]+$/.test(path || '') && !path.includes('..')) {
    const url = (path.startsWith('videos/') ? '/media/' : '/') + path;
    return path.startsWith('images/mon-an/') ? `${url}?v=${DISH_IMAGE_VERSION}` : url;
  }
  return '/images/logo.jpg';
}
export function today() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
}

