/**
 * 전역 인증 컨텍스트.
 * - 토큰 유무로 /api/auth/me 호출해 user 복원. 토큰 없으면 loading만 해제.
 * - login(): 로그인 성공 시 토큰 sessionStorage 저장, user 설정.
 * - logout(): 토큰·user 제거.
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { auth as authApi } from '../services/api';

const AuthContext = createContext(null);

/** 초기: 토큰 있으면 authApi.me()로 user 복원. value: { user, loading, login, logout } */
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
        if (res?.user) setUser(res.user);
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

/** AuthProvider 내부에서만 사용. 인증 상태·login·logout 접근 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
