/**
 * 공통 레이아웃: 헤더(로고·네비)·본문.
 * - useAuth로 user/role 판별. 관리자면 대시보드/신청관리/기준정보/통계 링크, 신청자면 대시보드/신규신청/내신청/내정보.
 * - 신청자: 알림 아이콘 + 배지(발주완료 수령 확인 대기 건수).
 * - 로그아웃 시 토큰 제거 후 /login 이동.
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requests } from '../services/api';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === '관리자';
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (isAdmin) return;
    requests.notificationCount().then((res) => setNotificationCount(res?.count ?? 0)).catch(() => setNotificationCount(0));
  }, [isAdmin]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 역할이 없거나 '관리자'가 아니면 신청자 메뉴. 네비가 아예 안 보이지 않도록 항상 한쪽은 표시
  const navLinkStyle = { color: '#fff', textDecoration: 'none', padding: '0.25rem 0.5rem', display: 'inline-block', whiteSpace: 'nowrap' };

  return (
    <div>
      <header
        style={{
          background: 'var(--aj-primary)',
          color: 'var(--aj-text-inverse)',
          padding: 'var(--aj-spacing-md) var(--aj-spacing-lg)',
          boxShadow: 'var(--aj-shadow-md)',
          minHeight: '56px',
        }}
      >
        <div className="container d-flex justify-content-between align-items-center flex-wrap" style={{ gap: '0.5rem 1rem' }}>
          <Link to={isAdmin ? '/admin' : '/dashboard'} style={{ color: '#fff', textDecoration: 'none', fontWeight: 'var(--aj-font-weight-bold)', fontSize: 'var(--aj-font-size-xl)' }}>
            부품발주시스템
          </Link>
          <nav className="d-flex align-items-center flex-wrap" style={{ gap: '0.5rem 1rem' }}>
            {isAdmin ? (
              <>
                <Link to="/admin" style={navLinkStyle}>관리자 대시보드</Link>
                <Link to="/admin/requests" style={navLinkStyle}>전체 신청</Link>
                <Link to="/admin/statistics" style={navLinkStyle}>통계 및 리포트</Link>
                <Link to="/admin/master" style={{ ...navLinkStyle, fontWeight: 600 }}>기준정보 등록/관리</Link>
              </>
            ) : (
              <>
                <Link to="/dashboard" style={navLinkStyle}>대시보드</Link>
                <Link to="/new-request" style={navLinkStyle}>신규 신청</Link>
                <Link to="/my-requests" style={navLinkStyle}>내 신청</Link>
                <Link to="/my-info" style={navLinkStyle}>내 정보</Link>
                <Link to="/my-requests" style={{ ...navLinkStyle, position: 'relative', display: 'inline-flex', alignItems: 'center' }} title="알림">
                  <span style={{ marginRight: notificationCount > 0 ? '0.25rem' : 0 }}>🔔</span>
                  {notificationCount > 0 && (
                    <span
                      className="badge rounded-pill bg-danger"
                      style={{ position: 'absolute', top: -4, right: -4, fontSize: '0.7rem', minWidth: '1.1rem' }}
                    >
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  )}
                </Link>
              </>
            )}
            <span style={{ fontSize: 'var(--aj-font-size-sm)', color: '#fff', marginLeft: '0.5rem' }}>{user?.name ?? ''} ({user?.role ?? '신청자'})</span>
            <button type="button" className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', marginLeft: '0.25rem' }} onClick={handleLogout}>
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
