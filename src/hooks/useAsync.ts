import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { errorMessage } from '../api/http';

interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
}

/**
 * Carga datos de la API. Con `pollMs` se refresca periódicamente (solo con la
 * pestaña visible), útil para notificaciones y el panel en vivo.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList, { pollMs = 0 } = {}) {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, loading: true, error: null });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const data = await loaderRef.current();
      if (id === requestId.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (id === requestId.current) setState(prev => ({ ...prev, loading: false, error: errorMessage(error) }));
    }
  }, []);

  useEffect(() => {
    setState(prev => (prev.loading ? prev : { ...prev, loading: true }));
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!pollMs) return;
    const timer = setInterval(() => {
      if (!document.hidden) void reload();
    }, pollMs);
    return () => clearInterval(timer);
  }, [pollMs, reload]);

  const setData = useCallback((data: T) => setState(prev => ({ ...prev, data })), []);

  return { ...state, reload, setData };
}
