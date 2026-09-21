import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, UNAUTHORIZED_EVENT } from '../api/http';
import { FullPageLoader } from '../ui/Display';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface PortalConfig {
  portal: 'admin' | 'student';
  sessionPath: string;
  loginPath: string;
  logoutPath: string;
}

export interface PortalSession<TUser, TCredentials> {
  user: TUser | null;
  status: Status;
  /** true si la sesión se cerró por expiración (para avisar al usuario) */
  expired: boolean;
  signIn: (credentials: TCredentials) => Promise<TUser>;
  signOut: () => Promise<void>;
}

/**
 * Crea un contexto de sesión independiente por portal. Cada portal usa su
 * propia cookie en el servidor, así que iniciar sesión en uno no da acceso al otro.
 */
export function createPortalSession<TUser, TCredentials>(config: PortalConfig) {
  const Context = createContext<PortalSession<TUser, TCredentials> | null>(null);

  function SessionProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<TUser | null>(null);
    const [status, setStatus] = useState<Status>('loading');
    const [expired, setExpired] = useState(false);
    const userRef = useRef<TUser | null>(null);
    userRef.current = user;

    useEffect(() => {
      let cancelled = false;
      api<TUser>(config.sessionPath)
        .then(current => {
          if (cancelled) return;
          setUser(current);
          setStatus('authenticated');
        })
        .catch(() => {
          if (!cancelled) setStatus('anonymous');
        });
      return () => {
        cancelled = true;
      };
    }, []);

    useEffect(() => {
      const onUnauthorized = (event: Event) => {
        if ((event as CustomEvent<string>).detail !== config.portal) return;
        if (userRef.current) setExpired(true);
        setUser(null);
        setStatus('anonymous');
      };
      window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
      return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    }, []);

    const value = useMemo<PortalSession<TUser, TCredentials>>(
      () => ({
        user,
        status,
        expired,
        signIn: async credentials => {
          const signedIn = await api<TUser>(config.loginPath, { body: credentials });
          setUser(signedIn);
          setStatus('authenticated');
          setExpired(false);
          return signedIn;
        },
        signOut: async () => {
          await api(config.logoutPath, { method: 'POST' }).catch(() => undefined);
          setUser(null);
          setStatus('anonymous');
        },
      }),
      [user, status, expired],
    );

    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useSession() {
    const ctx = useContext(Context);
    if (!ctx) throw new Error(`useSession (${config.portal}) debe usarse dentro de su SessionProvider`);
    return ctx;
  }

  function RequireSession({ children, loginPath }: { children: ReactNode; loginPath: string }) {
    const { status } = useSession();
    const location = useLocation();
    if (status === 'loading') return <FullPageLoader />;
    if (status === 'anonymous') return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
    return children;
  }

  return { SessionProvider, useSession, RequireSession };
}
