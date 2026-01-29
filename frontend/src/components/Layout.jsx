import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === '관리자';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <header
        style={{
          background: 'var(--aj-primary)',
          color: 'var(--aj-text-inverse)',
          padding: 'var(--aj-spacing-md) var(--aj-spacing-lg)',
          boxShadow: 'var(--aj-shadow-md)',
        }}
      >
        <div className="container d-flex justify-content-between align-items-center">
          <Link to={isAdmin ? '/admin' : '/dashboard'} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 'var(--aj-font-weight-bold)', fontSize: 'var(--aj-font-size-xl)' }}>
            부품발주시스템
          </Link>
          <nav className="d-flex gap-2 align-items-center">
            {!isAdmin && (
              <>
                <Link to="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>대시보드</Link>
                <Link to="/new-request" style={{ color: 'inherit', textDecoration: 'none' }}>신규 신청</Link>
                <Link to="/my-requests" style={{ color: 'inherit', textDecoration: 'none' }}>내 신청</Link>
              </>
            )}
            {isAdmin && (
              <>
                <Link to="/admin" style={{ color: 'inherit', textDecoration: 'none' }}>관리자 대시보드</Link>
                <Link to="/admin/requests" style={{ color: 'inherit', textDecoration: 'none' }}>전체 신청</Link>
              </>
            )}
            <span style={{ fontSize: 'var(--aj-font-size-sm)' }}>{user?.name} ({user?.role})</span>
            <button type="button" className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'inherit' }} onClick={handleLogout}>
              로그아웃
            </button>
          </nav>
        </div>
      </header>
      <main style={{ padding: 'var(--aj-spacing-lg) 0', minHeight: 'calc(100vh - 120px)' }}>
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
