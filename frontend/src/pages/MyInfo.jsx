import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/api';

export default function MyInfo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    auth
      .me()
      .then((res) => setProfile(res?.user && typeof res.user === 'object' ? res.user : null))
      .catch((err) => setError(err?.message || '정보 로드 실패'))
      .finally(() => setLoading(false));
  }, []);

  const handleChangePassword = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!oldPassword.trim()) {
      setError('현재 비밀번호를 입력하세요.');
      return;
    }
    if (newPassword.length < 6) {
      setError('새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    setSaving(true);
    auth
      .changePassword(user?.userId, oldPassword, newPassword)
      .then(() => {
        setSuccess('비밀번호가 변경되었습니다.');
        setOldPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
      })
      .catch((err) => setError(err?.message || '비밀번호 변경 실패'))
      .finally(() => setSaving(false));
  };

  if (loading) return <p>로딩 중...</p>;
  const displayUser = profile ?? user ?? {};

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 style={{ marginBottom: 0 }}>내 정보</h1>
        <Link to="/dashboard" className="btn btn-outline-secondary">← 대시보드</Link>
      </div>

      <div className="card mb-4">
        <div className="card-header">기본 정보 (읽기 전용)</div>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-6"><strong>사용자 ID</strong> {displayUser?.userId ?? '-'}</div>
            <div className="col-md-6"><strong>이름</strong> {displayUser?.name ?? '-'}</div>
            <div className="col-md-6"><strong>기사코드</strong> {displayUser?.employeeCode ?? '-'}</div>
            <div className="col-md-6"><strong>소속팀</strong> {displayUser?.team ?? '-'}</div>
            <div className="col-md-6"><strong>지역</strong> {displayUser?.region ?? '-'}</div>
            <div className="col-md-6"><strong>역할</strong> {displayUser?.role ?? '-'}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">비밀번호 변경</div>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={handleChangePassword}>
            <div className="mb-3">
              <label className="form-label">현재 비밀번호 *</label>
              <input
                type="password"
                className="form-control"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">새 비밀번호 * (최소 6자)</label>
              <input
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">새 비밀번호 확인 *</label>
              <input
                type="password"
                className="form-control"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '변경 중…' : '비밀번호 변경'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
