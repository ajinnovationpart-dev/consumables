import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requests, formatDisplayDate } from '../services/api';

export default function Dashboard() {
  const [data, setData] = useState({ stats: {}, recent: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    requests
      .dashboard()
      .then((res) => {
        const stats = res?.stats && typeof res.stats === 'object' ? res.stats : {};
        const recent = Array.isArray(res?.recent) ? res.recent : [];
        setData({ stats, recent });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>로딩 중...</p>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  const stats = data?.stats ?? {};
  const recent = Array.isArray(data?.recent) ? data.recent.slice(0, 5) : [];
  const total = stats?.total ?? 0;
  const finished = stats?.finished ?? 0;
  const completionRate = total > 0 ? Math.round((finished / total) * 100) : 0;

  return (
    <>
      <h1 style={{ marginBottom: 'var(--aj-spacing-lg)' }}>대시보드</h1>
      <div className="d-flex gap-2 flex-wrap mb-3" style={{ marginBottom: 'var(--aj-spacing-xl)' }}>
        <div className="card" style={{ flex: '1 1 120px' }}>
          <div style={{ fontSize: 'var(--aj-font-size-sm)', color: 'var(--aj-text-secondary)' }}>전체</div>
          <div style={{ fontSize: 'var(--aj-font-size-2xl)', fontWeight: 'var(--aj-font-weight-bold)' }}>{total}</div>
        </div>
        <div className="card" style={{ flex: '1 1 120px' }}>
          <div style={{ fontSize: 'var(--aj-font-size-sm)', color: 'var(--aj-text-secondary)' }}>접수중</div>
          <div style={{ fontSize: 'var(--aj-font-size-2xl)', fontWeight: 'var(--aj-font-weight-bold)' }}>{stats?.requested ?? 0}</div>
        </div>
        <div className="card" style={{ flex: '1 1 120px' }}>
          <div style={{ fontSize: 'var(--aj-font-size-sm)', color: 'var(--aj-text-secondary)' }}>진행중</div>
          <div style={{ fontSize: 'var(--aj-font-size-2xl)', fontWeight: 'var(--aj-font-weight-bold)' }}>{stats?.ordering ?? 0}</div>
        </div>
        <div className="card" style={{ flex: '1 1 120px' }}>
          <div style={{ fontSize: 'var(--aj-font-size-sm)', color: 'var(--aj-text-secondary)' }}>처리완료</div>
          <div style={{ fontSize: 'var(--aj-font-size-2xl)', fontWeight: 'var(--aj-font-weight-bold)' }}>{finished}</div>
        </div>
        <div className="card" style={{ flex: '1 1 120px' }}>
          <div style={{ fontSize: 'var(--aj-font-size-sm)', color: 'var(--aj-text-secondary)' }}>완료율</div>
          <div style={{ fontSize: 'var(--aj-font-size-2xl)', fontWeight: 'var(--aj-font-weight-bold)' }}>{completionRate}%</div>
        </div>
      </div>
      <div className="d-flex gap-2 flex-wrap mb-4">
        <Link to="/new-request" className="btn btn-primary">새 신청하기</Link>
        <Link to="/my-requests" className="btn btn-outline-primary">내 신청 목록</Link>
        <Link to="/my-info" className="btn btn-outline-secondary">내 정보</Link>
      </div>
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span>최근 신청 (최대 5건)</span>
          <Link to="/new-request" className="btn btn-primary btn-sm">신규 신청</Link>
        </div>
        {recent.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>신청번호</th>
                <th>품명</th>
                <th>상태</th>
                <th>신청일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.requestNo ?? r.requestDate ?? Math.random()}>
                  <td>{r.requestNo ?? '-'}</td>
                  <td>{r.itemName ?? '-'}</td>
                  <td><span className="badge" style={{ background: 'var(--aj-gray-200)', color: 'var(--aj-gray-800)' }}>{r.status ?? '-'}</span></td>
                  <td>{formatDisplayDate(r.requestDate)}</td>
                  <td><Link to={`/request/${r.requestNo}`} className="btn btn-sm btn-outline-primary">상세</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="card-body">
            <p className="mb-0">최근 신청이 없습니다. <Link to="/new-request">신규 신청</Link>을 등록해보세요.</p>
          </div>
        )}
      </div>
    </>
  );
}
