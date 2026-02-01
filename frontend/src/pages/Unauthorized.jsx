import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div className="display-4 text-danger mb-3">⚠️</div>
      <h1 className="h4 mb-2">접근 권한이 없습니다</h1>
      <p className="text-muted mb-4">이 시스템에 접근할 권한이 없습니다.</p>
      <p className="small text-muted mb-4">관리자에게 문의하여 사용자 등록을 요청해 주세요.</p>
      <div className="d-flex gap-2 flex-wrap justify-content-center">
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          다시 시도
        </button>
        {user ? (
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(user?.role === '관리자' ? '/admin' : '/dashboard', { replace: true })}>
            대시보드로
          </button>
        ) : (
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/login', { replace: true })}>
            로그인
          </button>
        )}
      </div>
    </div>
  );
}
