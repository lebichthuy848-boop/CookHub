import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
export function useApi(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => {
    if (!path) { setData(null); setError(''); setLoading(false); return; }
    const controller = new AbortController();
    // Keep existing content visible during a mutation-triggered refresh.
    setLoading(previous => previous && data == null); setError('');
    const requestPath = path === '/dishes?include_drafts=true' ? '/admin/dishes' : path;
    api(requestPath, { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) setData(value);
    }).catch(err => {
      if (err.name !== 'AbortError') setError(err.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [path, revision]);
  return { data, error, loading, reload };
}

