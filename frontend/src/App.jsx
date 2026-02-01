/**
 * 라우트 정의 및 SPA 404 복원.
 * - PrivateRoute: 로그인 필수; adminOnly 시 관리자만 통과.
 * - 404 → base 리다이렉트 후 sessionStorage.redirect 로 경로 복원 (GitHub Pages SPA 대응).
 */
import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import Dashboard from './pages/Dashboard';
import NewRequest from './pages/NewRequest';
import MyRequests from './pages/MyRequests';
import RequestDetail from './pages/RequestDetail';
import AdminDashboard from './pages/AdminDashboard';
import AdminRequests from './pages/AdminRequests';
import AdminMaster from './pages/AdminMaster';
import AdminStatistics from './pages/AdminStatistics';
import MyInfo from './pages/MyInfo';

/** 로그인 필수 라우트. adminOnly면 역할이 '관리자'일 때만 children 렌더 */
function PrivateRoute({ children, adminOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== '관리자') return <Navigate to="/unauthorized" replace />;
  return children;
}

export default function App() {
  const navigate = useNavigate();

  // GitHub Pages: 404에서 base로 리다이렉트된 뒤, 저장된 경로로 이동
  useEffect(() => {
    const redirect = sessionStorage.getItem('redirect');
    if (redirect) {
      sessionStorage.removeItem('redirect');
      try {
        const url = new URL(redirect);
        const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
        const path = url.pathname.replace(new RegExp(`^${base}`), '') || '/';
        if (path && path !== '/') navigate(path, { replace: true });
      } catch (_) {}
    }
  }, [navigate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<PrivateRoute><Layout><Unauthorized /></Layout></PrivateRoute>} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Layout><Dashboard /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/new-request"
        element={
          <PrivateRoute>
            <Layout><NewRequest /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/my-requests"
        element={
          <PrivateRoute>
            <Layout><MyRequests /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/my-info"
        element={
          <PrivateRoute>
            <Layout><MyInfo /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/request/:requestNo"
        element={
          <PrivateRoute>
            <Layout><RequestDetail /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRoute adminOnly>
            <Layout><AdminDashboard /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/requests"
        element={
          <PrivateRoute adminOnly>
            <Layout><AdminRequests /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/master"
        element={
          <PrivateRoute adminOnly>
            <Layout><AdminMaster /></Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/statistics"
        element={
          <PrivateRoute adminOnly>
            <Layout><AdminStatistics /></Layout>
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
