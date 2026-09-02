import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

import { authApi } from '../services/auth.service';
import api, {
  setAccessToken,
  setUnauthorizedHandler,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [clearSession]);

  // Restore session using HTTP-only refresh token cookie
  useEffect(() => {
    async function bootstrap() {
      try {
        const { data } = await api.post('/auth/refresh-token');

        setAccessToken(data.data.accessToken);
        setUser(data.data.user);
      } catch (err) {
        clearSession();
      } finally {
        setInitializing(false);
      }
    }

    bootstrap();
  }, [clearSession]);

  const login = useCallback(async (credentials) => {
    const { data } = await authApi.login(credentials);

    setAccessToken(data.accessToken);
    setUser(data.user);

    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refreshProfile = useCallback(async () => {
    const { data } = await authApi.me();

    setUser(data);

    return data;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        login,
        logout,
        refreshProfile,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return ctx;
}