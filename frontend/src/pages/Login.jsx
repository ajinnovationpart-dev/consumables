import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(null);
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL ?error= 메시지 표시 (로그인 실패 등)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) setError(decodeURIComponent(errorParam));
  }, [searchParams]);

  // 로그인 성공 후 user 상태가 반영된 뒤에만 이동 (관리자 → /admin, 일반 → /dashboard)
  useEffect(() => {
    if (user && pendingRedirect) {
      navigate(pendingRedirect, { replace: true });
      setPendingRedirect(null);
    }
  }, [user, pendingRedirect, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(userId.trim(), password);
      setPendingRedirect(res.redirectUrl || '/dashboard');
    } catch (err) {
      let msg = err.message || '로그인에 실패했습니다.';
      if (err.status === 0 || (msg && (msg.includes('fetch') || msg.includes('Network')))) {
        msg = '서버에 연결할 수 없습니다. 백엔드(ngrok)가 실행 중인지, VITE_API_URL 주소가 맞는지 확인하세요.';
      } else if (err.status === 404) {
        msg = 'API 주소를 확인하세요 (404). VITE_API_URL 끝에 /api 가 있거나, 프론트에서 자동 보정되는지 확인하세요.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--aj-bg-secondary)',
      }}
    >
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <h2 style={{ marginBottom: 'var(--aj-spacing-lg)' }}>부품발주시스템 로그인</h2>
        </div>
        <div className="card-body pt-0">
          <div className="alert alert-info small mb-3" role="status">
            <strong>안내</strong>
            <ul className="mb-0 mt-1 ps-3">
              <li>등록된 사용자 ID와 비밀번호로 로그인하세요.</li>
              <li>권한이 없으면 관리자에게 사용자 등록을 요청해 주세요.</li>
            </ul>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="card-body pt-0">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="userId">사용자 ID</label>
            <input
              id="userId"
              type="text"
              className="form-control"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="사용자 ID"
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
