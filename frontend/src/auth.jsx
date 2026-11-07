import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favoriteCounts, setFavoriteCounts] = useState({});
  const favoriteChannel = useRef(null);
  async function restore() {
    setLoading(true); setError('');
    try { setUser(await api('/auth/me')); }
    catch (err) { if (err.status !== 401) setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    restore();
    const expired = () => setUser(null);
    window.addEventListener('session-expired', expired);
    return () => window.removeEventListener('session-expired', expired);
  }, []);
  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    let pending = false;
    const sync = async () => {
      if (pending || document.visibilityState === 'hidden') return;
      pending = true;
      try { const value = await api('/favorites/counts'); if (active) setFavoriteCounts(value); }
      catch { /* Background refresh must not interrupt the current page. */ }
      finally { pending = false; }
    };
    sync();
    const timer = window.setInterval(sync, 30000);
    document.addEventListener('visibilitychange', sync);
    if ('BroadcastChannel' in window) {
      favoriteChannel.current = new BroadcastChannel('cookhub-favorites');
      favoriteChannel.current.onmessage = event => setFavoriteCounts(event.data || {});
    }
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', sync); favoriteChannel.current?.close(); favoriteChannel.current = null; };
  }, [user?.id]);
  function updateFavoriteCount(id, delta) {
    setFavoriteCounts(previous => {
      const next = { ...previous, [id]: Math.max(0, (previous[id] || 0) + delta) };
      favoriteChannel.current?.postMessage(next);
      return next;
    });
  }
  async function logout() { await api('/auth/logout', { method: 'POST' }); setUser(null); }
  return <AuthContext.Provider value={{ user, setUser, loading, logout, favoriteCounts, updateFavoriteCount }}>
    {error ? <div className="startup"><p role="alert">{error}</p><button onClick={restore}>Thử kết nối lại</button></div> : children}
  </AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
export const landing = role => role === 'Quản trị hệ thống' ? '/system-admin' : role === 'Quản trị nội dung' ? '/content' : '/home';

