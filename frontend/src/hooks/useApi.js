import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../api/client.js';

/**
 * Small data-fetching helper. `path` is an API path (including query string).
 * Pass null to skip fetching.
 */
export function useApi(path, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(Boolean(path && enabled));
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!path || !enabled) {
        setLoading(false);
        return null;
      }
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      if (!quiet) setLoading(true);
      setError(null);
      try {
        const result = await api.get(path, { signal: controller.signal });
        if (!mountedRef.current) return null;
        setData(result?.data ?? null);
        setMeta(result?.meta ?? null);
        setPagination(result?.pagination ?? null);
        return result;
      } catch (err) {
        if (err.name === 'AbortError') return null;
        if (!mountedRef.current) return null;
        setError(errorMessage(err));
        return null;
      } finally {
        if (mountedRef.current && !controller.signal.aborted) setLoading(false);
      }
    },
    [path, enabled],
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    meta,
    pagination,
    loading,
    error,
    reload: load,
    setData,
    setPagination,
  };
}

export function useDebounced(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
