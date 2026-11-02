import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './auth';

export const defaultSettings = {
  theme: 'system', fontScale: 'medium', density: 'comfortable', reducedMotion: false,
  sidebarCollapsed: false, sidebarFixed: true, rememberSidebar: true,
  dishView: 'auto', showImages: true, showNutrition: true, measurement: 'metric',
  soundEnabled: true, alertSound: 'beep', volume: 70, autoplayVideo: false,
  wakeLock: false, readAloud: false,
};
const allowed = {
  theme: ['system','light','dark'], fontScale: ['small','medium','large'], density: ['comfortable','compact'],
  dishView: ['auto','grid','list'], measurement: ['metric','imperial'], alertSound: ['beep','kitchen','soft'],
};
const exportKeys = ['theme','fontScale','density','reducedMotion','sidebarCollapsed','dishView','showNutrition',
  'soundEnabled','alertSound','volume','autoplayVideo','wakeLock','readAloud'];
const keyFor = id => `cookhub:settings:v1:${id || 'guest'}`;
function valid(value) {
  const next = { ...defaultSettings };
  if (!value || typeof value !== 'object') return next;
  Object.keys(next).forEach(key => {
    if (allowed[key] && allowed[key].includes(value[key])) next[key] = value[key];
    else if (!allowed[key] && typeof value[key] === typeof next[key]) next[key] = value[key];
  });
  next.volume = Math.min(100, Math.max(0, Number(next.volume) || 0));
  return next;
}
export function parseSettingsImport(value) {
  const incoming = value?.version === 1 ? value.settings : value;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) throw new Error('File không chứa cài đặt hợp lệ.');
  const keys = Object.keys(incoming);
  if (!keys.length || keys.some(key => !Object.hasOwn(defaultSettings,key))) throw new Error('File chứa tùy chọn không được hỗ trợ.');
  for (const key of keys) {
    if (allowed[key] ? !allowed[key].includes(incoming[key]) :
      key === 'volume' ? !Number.isInteger(incoming[key]) || incoming[key] < 0 || incoming[key] > 100 :
      typeof incoming[key] !== typeof defaultSettings[key]) throw new Error(`Giá trị ${key} không hợp lệ.`);
  }
  return valid({ ...defaultSettings, ...incoming });
}
function resolvedTheme(theme) {
  return theme === 'system' ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
}

const SettingsContext = createContext(null);
export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const storageKey = keyFor(user?.id);
  const appliedKey = useRef(storageKey);
  const [settings, setSettings] = useState(() => {
    try { return valid(JSON.parse(localStorage.getItem(storageKey) || 'null')); } catch { return { ...defaultSettings }; }
  });
  useEffect(() => { try { setSettings(valid(JSON.parse(localStorage.getItem(storageKey) || 'null'))); } catch { setSettings({ ...defaultSettings }); } }, [storageKey]);
  useEffect(() => {
    if (appliedKey.current !== storageKey) { appliedKey.current = storageKey; return; }
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { /* keep working in memory */ }
    try { localStorage.setItem('cookhub-theme', settings.theme); } catch { /* keep working in memory */ }
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme(settings.theme);
    root.dataset.fontScale = settings.fontScale;
    root.dataset.density = settings.density;
    root.classList.toggle('reduce-motion', settings.reducedMotion);
    root.classList.toggle('settings-sidebar-collapsed', settings.sidebarCollapsed);
    root.classList.toggle('settings-sidebar-fixed', settings.sidebarFixed);
    root.classList.remove('settings-hide-images');
    root.classList.toggle('settings-hide-nutrition', !settings.showNutrition);
    delete root.dataset.dishView;
  }, [settings, storageKey]);
  useEffect(() => {
    if (settings.theme !== 'system' || !window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = () => { document.documentElement.dataset.theme = query.matches ? 'dark' : 'light'; };
    applySystemTheme();
    query.addEventListener?.('change', applySystemTheme);
    return () => query.removeEventListener?.('change', applySystemTheme);
  }, [settings.theme]);
  useEffect(() => {
    const onStorage = event => { if (event.key === storageKey) try { setSettings(valid(JSON.parse(event.newValue || 'null'))); } catch {} };
    window.addEventListener('storage', onStorage); return () => window.removeEventListener('storage', onStorage);
  }, [storageKey]);
  const api = useMemo(() => ({
    settings,
    update: (key, value) => setSettings(current => valid({ ...current, [key]: value })),
    reset: () => setSettings({ ...defaultSettings }),
    storageKey,
    exportSettings: () => ({ version: 1, exportedAt: new Date().toISOString(),
      settings: Object.fromEntries(exportKeys.map(key => [key,settings[key]])) }),
    importSettings: value => setSettings(parseSettingsImport(value)),
  }), [settings, storageKey]);
  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>;
}
export const useSettings = () => useContext(SettingsContext);
