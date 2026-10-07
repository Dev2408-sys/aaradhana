import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loginRequest, logoutRequest, meRequest } from '../../api/auth';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '../../api/client';
import type { AuthUser, UserRole } from '../../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (mobile: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const token = getAccessToken();
      if (!token) {
        if (active) setIsLoading(false);
        return;
      }

      try {
        const me = await meRequest();
        if (active) setUser(me);
      } catch {
        clearTokens();
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (mobile: string, password: string) => {
    const result = await loginRequest(mobile, password);
    setTokens(result.accessToken, result.refreshToken);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest(getRefreshToken());
    } catch {
      // Always clear local session
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      hasRole,
    }),
    [user, isLoading, login, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
