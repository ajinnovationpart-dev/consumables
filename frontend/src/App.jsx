import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewRequest from './pages/NewRequest';
import MyRequests from './pages/MyRequests';
import RequestDetail from './pages/RequestDetail';
import AdminDashboard from './pages/AdminDashboard';
import AdminRequests from './pages/AdminRequests';

function PrivateRoute({ children, adminOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== '관리자') return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
