import { createContext, useContext, useState, useEffect } from 'react';
import { auth as authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((res) => {
        if (res.user) setUser(res.user);
      })
      .catch(() => {
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (userId, password) =>
    authApi.login(userId, password).then((res) => {
      if (res.success && res.token) {
        sessionStorage.setItem('token', res.token);
        setUser(res.user);
        return res;
      }
      throw new Error(res.message || '로그인 실패');
    });

  const logout = () => {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
