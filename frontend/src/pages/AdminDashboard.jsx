import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { requests, formatDisplayDate } from '../services/api';

function getPeriodRange(period) {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  let start;
  switch (period) {
    case 'today':
      start = end;
      break;
    case 'week': {
      const d = today.getDay();
      const diff = today.getDate() - d + (d === 0 ? -6 : 1);
      const mon = new Date(today);
      mon.setDate(diff);
      start = mon.toISOString().slice(0, 10);
      break;
    }
    case 'month':
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      break;
    default:
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  }
  return { startDate: start, endDate: end };
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState({ stats: {}, recent: [], urgent: [], delayed: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    let range = { startDate: null, endDate: null };
    if (period === 'custom') {
      range = { startDate: startDate || null, endDate: endDate || null };
    } else {
      range = getPeriodRange(period);
    }
    setLoading(true);
    setError('');
    requests
      .dashboard(range.startDate && range.endDate ? range : undefined)
      .then((res) => {
        const stats = res?.stats && typeof res.stats === 'object' ? res.stats : {};
        const recent = Array.isArray(res?.recent) ? res.recent : [];
        const urgent = Array.isArray(res?.urgent) ? res.urgent : [];
        const delayed = Array.isArray(res?.delayed) ? res.delayed : [];
        setData({ stats, recent, urgent, delayed });
      })
      .catch((err) => setError(err?.message || '로딩 실패'))
      .finally(() => setLoading(false));
  }, [period, startDate, endDate]);

  useEffect(() => {
    const r = getPeriodRange(period);
    if (period !== 'custom') {
      setStartDate(r.startDate);
      setEndDate(r.endDate);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = data?.stats ?? {};
  const periodStats = stats?.period ?? {};
  const recent = data?.recent ?? [];
  const urgent = data?.urgent ?? [];
  const delayed = data?.delayed ?? [];

  const handlePeriodChange = (e) => setPeriod(e.target.value);

  const navigateToStatus = (status) => {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    return `/admin/requests${params}`;
  };

  if (loading && !data?.stats?.total && recent.length === 0) return <p>로딩 중...</p>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <>
      <h1 className="mb-4" style={{ fontSize: 'var(--aj-font-size-2xl)', fontWeight: 'var(--aj-font-weight-bold)' }}>관리자 대시보드</h1>

      {/* 기준정보 등록/관리 - 상단 강조 (AJ 디자인 시스템) */}
      <div className="quick-actions-admin mb-4">
        <Link to="/admin/master" className="aj-card-link master">
          <span aria-hidden>⚙️</span> 기준정보 등록/관리
        </Link>
        <Link to="/admin/requests" className="aj-card-link">
          <span aria-hidden>📋</span> 전체 신청 목록
        </Link>
        <Link to="/admin/statistics" className="aj-card-link">
          <span aria-hidden>📈</span> 통계 및 리포트
        </Link>
      </div>

      {/* 조회 기간 */}
      <div className="section-query">
        <h2 className="section-title">
          <span aria-hidden>🔍</span> 조회 기간
        </h2>
        <div className="row g-3 align-items-end">
          <div className="col-12 col-sm-6 col-md-3">
            <label className="form-label fw-semibold">조회 기간</label>
            <select className="form-select" value={period} onChange={handlePeriodChange}>
              <option value="today">오늘</option>
              <option value="week">이번 주</option>
              <option value="month">이번 달</option>
              <option value="custom">직접 선택</option>
            </select>
          </div>
          {period === 'custom' && (
            <>
              <div className="col-12 col-sm-6 col-md-2">
                <label className="form-label fw-semibold">시작일</label>
                <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="col-12 col-sm-6 col-md-2">
                <label className="form-label fw-semibold">종료일</label>
                <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </>
          )}
          <div className="col-12 col-sm-6 col-md-2">
            <button type="button" className="btn btn-primary w-100" onClick={load} disabled={loading}>
              {loading ? '조회 중…' : '🔍 조회'}
            </button>
          </div>
        </div>
      </div>

      {/* 현황 카드 */}
      <div className="row mb-4 g-2">
        <div className="col-6 col-md-2">
          <Link to={navigateToStatus('')} className="text-decoration-none">
            <div className="card text-center border-primary h-100" style={{ cursor: 'pointer' }} title="전체 신청 목록">
              <div className="card-body py-3">
                <h6 className="text-muted mb-0">신규</h6>
                <h2 className="text-primary mb-0">{periodStats?.new ?? 0}</h2>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-6 col-md-2">
          <Link to={navigateToStatus('접수중')} className="text-decoration-none">
            <div className="card text-center border-warning h-100" style={{ cursor: 'pointer' }} title="접수중">
              <div className="card-body py-3">
                <h6 className="text-muted mb-0">접수중</h6>
                <h2 className="text-warning mb-0">{periodStats?.requested ?? 0}</h2>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-6 col-md-2">
          <Link to={navigateToStatus('발주진행')} className="text-decoration-none">
            <div className="card text-center border-info h-100" style={{ cursor: 'pointer' }} title="발주진행">
              <div className="card-body py-3">
                <h6 className="text-muted mb-0">진행중</h6>
                <h2 className="text-info mb-0">{periodStats?.inProgress ?? 0}</h2>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-6 col-md-2">
          <Link to={navigateToStatus('발주완료(납기미정)')} className="text-decoration-none">
            <div className="card text-center border-danger h-100" style={{ cursor: 'pointer' }} title="지연">
              <div className="card-body py-3">
                <h6 className="text-muted mb-0">지연</h6>
                <h2 className="text-danger mb-0">{periodStats?.delayed ?? 0}</h2>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-6 col-md-2">
          <Link to={navigateToStatus('처리완료')} className="text-decoration-none">
            <div className="card text-center border-success h-100" style={{ cursor: 'pointer' }} title="처리완료">
              <div className="card-body py-3">
                <h6 className="text-muted mb-0">완료</h6>
                <h2 className="text-success mb-0">{periodStats?.completed ?? 0}</h2>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-6 col-md-2">
          <Link to={navigateToStatus('')} className="text-decoration-none">
            <div className="card text-center h-100" style={{ cursor: 'pointer' }} title="전체">
              <div className="card-body py-3">
                <h6 className="text-muted mb-0">전체</h6>
                <h2 className="mb-0">{periodStats?.total ?? 0}</h2>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* 긴급 처리 필요 */}
      <div className="card mb-4">
        <div className="card-header bg-danger text-white">
          <h5 className="mb-0">🔴 긴급 처리 필요</h5>
        </div>
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>신청번호</th>
                <th>품명</th>
                <th>상태</th>
                <th>신청자</th>
                <th>신청일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {urgent.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted">긴급 처리 건이 없습니다.</td>
                </tr>
              ) : (
                urgent.map((r) => (
                  <tr key={r.requestNo}>
                    <td><strong>{r.requestNo ?? '-'}</strong></td>
                    <td>{r.itemName ?? '-'}</td>
                    <td><span className="badge bg-warning">{r.status ?? '-'}</span></td>
                    <td>
                      <span>{r.requesterName ?? '-'}</span>
                      {r.requesterEmail && <span className="text-muted small ms-1">(ID: {r.requesterEmail})</span>}
                    </td>
                    <td>{formatDisplayDate(r.requestDate)}</td>
                    <td><Link to={`/request/${r.requestNo}`} className="btn btn-sm btn-primary">처리</Link></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 발주 지연 건 */}
      <div className="card mb-4">
        <div className="card-header bg-warning">
          <h5 className="mb-0">⚠️ 발주 지연 건</h5>
        </div>
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>신청번호</th>
                <th>품명</th>
                <th>지연 일수</th>
                <th>신청자</th>
                <th>담당자</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {delayed.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted">지연 건이 없습니다.</td>
                </tr>
              ) : (
                delayed.map((r) => (
                  <tr key={r.requestNo}>
                    <td><strong>{r.requestNo ?? '-'}</strong></td>
                    <td>{r.itemName ?? '-'}</td>
                    <td><span className="badge bg-danger">{r.delayDays ?? 0}일</span></td>
                    <td>
                      <span>{r.requesterName ?? '-'}</span>
                      {r.requesterEmail && <span className="text-muted small ms-1">(ID: {r.requesterEmail})</span>}
                    </td>
                    <td>{r.handler ?? '-'}</td>
                    <td><Link to={`/request/${r.requestNo}`} className="btn btn-sm btn-warning">상태 변경</Link></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 최근 신청 */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>최근 신청</span>
          <div className="d-flex gap-2">
            <Link to="/admin/requests" className="btn btn-primary btn-sm">전체 목록</Link>
            <Link to="/admin/master" className="btn btn-outline-primary btn-sm">⚙️ 기준정보 등록/관리</Link>
          </div>
        </div>
        {(Array.isArray(recent) ? recent : []).length ? (
          <table className="table mb-0">
            <thead>
              <tr>
                <th>신청번호</th>
                <th>신청자</th>
                <th>품명</th>
                <th>상태</th>
                <th>신청일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(recent) ? recent : []).map((r) => (
                <tr key={r.requestNo ?? r.requestDate ?? Math.random()}>
                  <td>{r.requestNo ?? '-'}</td>
                  <td>
                    <span>{r.requesterName ?? '-'}</span>
                    {r.requesterEmail && <span className="text-muted small ms-1">(ID: {r.requesterEmail})</span>}
                  </td>
                  <td>{r.itemName ?? '-'}</td>
                  <td><span className="badge" style={{ background: 'var(--aj-gray-200)', color: 'var(--aj-gray-800)' }}>{r.status ?? '-'}</span></td>
                  <td>{formatDisplayDate(r.requestDate)}</td>
                  <td><Link to={`/request/${r.requestNo}`} className="btn btn-sm btn-outline-primary">상세</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="card-body">최근 신청이 없습니다.</div>
        )}
      </div>
    </>
  );
}
