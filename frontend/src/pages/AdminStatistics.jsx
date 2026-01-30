import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { requests } from '../services/api';

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
    case 'quarter': {
      const m = today.getMonth();
      const qStart = new Date(today.getFullYear(), Math.floor(m / 3) * 3, 1);
      start = qStart.toISOString().slice(0, 10);
      break;
    }
    case 'year':
      start = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
      break;
    default:
      const d30 = new Date(today);
      d30.setDate(d30.getDate() - 30);
      start = d30.toISOString().slice(0, 10);
  }
  return { startDate: start, endDate: end };
}

function toDateOnly(str) {
  if (!str) return '';
  const s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parts = s.split(/[\s.\-/]+/).filter(Boolean);
  if (parts.length >= 3)
    return `${parts[0].padStart(4, '0')}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  return s.slice(0, 10);
}

const defaultRange = getPeriodRange('month');
export default function AdminStatistics() {
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [stats, setStats] = useState(null);
  const [allList, setAllList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const range = period === 'custom'
      ? { startDate: startDate || null, endDate: endDate || null }
      : getPeriodRange(period);
    if (!range.startDate || !range.endDate) return;
    setLoading(true);
    setError('');
    Promise.all([
      requests.dashboard(range),
      requests.all(),
    ])
      .then(([dashboardRes, listRes]) => {
        const list = Array.isArray(listRes) ? listRes : [];
        const filtered = list.filter((r) => {
          const d = toDateOnly(r.requestDate);
          return d && d >= range.startDate && d <= range.endDate;
        });
        setStats(dashboardRes?.stats ?? null);
        setAllList(filtered);
      })
      .catch((err) => setError(err?.message || '로딩 실패'))
      .finally(() => setLoading(false));
  }, [period, startDate, endDate]);

  useEffect(() => {
    if (period !== 'custom') {
      const r = getPeriodRange(period);
      setStartDate(r.startDate);
      setEndDate(r.endDate);
    }
  }, [period]);

  useEffect(() => {
    const range = period === 'custom' ? { startDate, endDate } : getPeriodRange(period);
    if (range.startDate && range.endDate) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, startDate, endDate]);

  const periodStats = stats?.period ?? {};
  const total = periodStats?.total ?? 0;
  const completed = periodStats?.completed ?? 0;
  const inProgress = periodStats?.inProgress ?? 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const inProgressRate = total > 0 ? Math.round((inProgress / total) * 100) : 0;

  const byStatus = {};
  const byRegion = {};
  allList.forEach((r) => {
    const s = r.status ?? '기타';
    byStatus[s] = (byStatus[s] || 0) + 1;
    const reg = r.region ?? '미지정';
    byRegion[reg] = (byRegion[reg] || 0) + 1;
  });

  const handleQuery = () => load();

  if (loading && !stats) return <p>로딩 중...</p>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 style={{ marginBottom: 0 }}>통계 및 리포트</h1>
        <Link to="/admin" className="btn btn-outline-secondary">← 관리자 대시보드</Link>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-2">
              <label className="form-label">기간</label>
              <select
                className="form-select"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="today">오늘</option>
                <option value="week">이번 주</option>
                <option value="month">이번 달</option>
                <option value="quarter">이번 분기</option>
                <option value="year">올해</option>
                <option value="custom">직접 선택</option>
              </select>
            </div>
            {period === 'custom' && (
              <>
                <div className="col-md-2">
                  <label className="form-label">시작일</label>
                  <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="col-md-2">
                  <label className="form-label">종료일</label>
                  <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </>
            )}
            <div className="col-md-2">
              <button type="button" className="btn btn-primary w-100" onClick={handleQuery} disabled={loading}>
                조회
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-2 mb-4">
        <div className="col-6 col-md-3">
          <div className="card text-center h-100">
            <div className="card-body py-3">
              <h6 className="text-muted mb-0">총 신청 건수</h6>
              <h3 className="mb-0">{total}</h3>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-center h-100 border-success">
            <div className="card-body py-3">
              <h6 className="text-muted mb-0">처리 완료</h6>
              <h3 className="text-success mb-0">{completed}</h3>
              <small>{completionRate}%</small>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-center h-100 border-info">
            <div className="card-body py-3">
              <h6 className="text-muted mb-0">진행 중</h6>
              <h3 className="text-info mb-0">{inProgress}</h3>
              <small>{inProgressRate}%</small>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-center h-100">
            <div className="card-body py-3">
              <h6 className="text-muted mb-0">접수중</h6>
              <h3 className="mb-0">{periodStats?.requested ?? 0}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header">상태별 분포</div>
            <div className="card-body p-0">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>상태</th>
                    <th className="text-end">건수</th>
                    <th className="text-end">비율</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(byStatus).length === 0 ? (
                    <tr><td colSpan="3" className="text-center text-muted">데이터 없음</td></tr>
                  ) : (
                    Object.entries(byStatus)
                      .sort((a, b) => b[1] - a[1])
                      .map(([status, count]) => (
                        <tr key={status}>
                          <td>{status}</td>
                          <td className="text-end">{count}</td>
                          <td className="text-end">{total > 0 ? Math.round((count / total) * 100) : 0}%</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header">지역별 분포</div>
            <div className="card-body p-0">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>지역</th>
                    <th className="text-end">건수</th>
                    <th className="text-end">비율</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(byRegion).length === 0 ? (
                    <tr><td colSpan="3" className="text-center text-muted">데이터 없음</td></tr>
                  ) : (
                    Object.entries(byRegion)
                      .sort((a, b) => b[1] - a[1])
                      .map(([region, count]) => (
                        <tr key={region}>
                          <td>{region}</td>
                          <td className="text-end">{count}</td>
                          <td className="text-end">{total > 0 ? Math.round((count / total) * 100) : 0}%</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
