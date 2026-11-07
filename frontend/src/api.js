import cloudinaryImages from './cloudinary-images.json';

// A timeout stops waiting; it does not prove a server-side write was cancelled.
export async function api(path, { method = 'GET', body, signal, timeoutMs } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timeout = timeoutMs ?? (body instanceof FormData ? 120000 : method === 'GET' ? 30000 : 60000);
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
  try {
    return await request(path, { method, body, signal: controller.signal });
  } catch (error) {
    if (timedOut && !signal?.aborted) {
      const message = method === 'GET'
        ? 'Máy chủ phản hồi quá lâu. Vui lòng thử tải lại dữ liệu.'
        : 'Máy chủ phản hồi quá lâu. Hãy kiểm tra kết quả trước khi gửi lại để tránh cập nhật trùng.';
      const failure = new Error(message);
      failure.name = 'TimeoutError';
      throw failure;
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

async function request(path, { method, body, signal }) {
  const headers = { 'X-CookHub-Client': 'web' };
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch('/api' + path, {
    method, credentials: 'include', headers, signal,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) {
    if (path.startsWith('/favorites/')) window.dispatchEvent(new CustomEvent('cookhub-toast', { detail: { message: method === 'DELETE' ? 'Đã hủy yêu thích' : 'Đã thêm vào mục Yêu thích' } }));
    if (path.includes('/favorite-collections/') && path.endsWith('/dishes')) window.dispatchEvent(new CustomEvent('cookhub-toast', { detail: { message: 'Đã thêm món vào bộ sưu tập' } }));
    return null;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(data.detail) ? data.detail.map(x => x.msg).join('; ') : data.detail;
    const error = new Error(detail || 'Không thể hoàn tất yêu cầu.');
    error.status = response.status;
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('session-expired'));
    throw error;
  }
  if (path.includes('/favorite-collections/') && path.endsWith('/dishes') && method === 'POST') window.dispatchEvent(new CustomEvent('cookhub-toast', { detail: { message: 'Đã thêm món vào bộ sưu tập' } }));
  return data;
}
export const money = amount => Number(amount || 0).toLocaleString('vi-VN') + ' đ';
const DISH_IMAGE_VERSION = '20261006-1';
export function media(path) {
  if (/^https:\/\//i.test(path || '')) return path;
  const cloudUrl = cloudinaryImages[(path || '').replace(/^\//, '')];
  if (cloudUrl) return cloudUrl;
  if (/^(images|videos)\/[\w\-./]+$/.test(path || '') && !path.includes('..')) {
    const url = (path.startsWith('videos/') ? '/media/' : '/') + path;
    return path.startsWith('images/mon-an/') ? `${url}?v=${DISH_IMAGE_VERSION}` : url;
  }
  return cloudinaryImages['images/logo.jpg'] || '/images/logo.jpg';
}
export function today() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
}

