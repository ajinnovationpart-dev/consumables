import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { requests, formatDisplayDate } from '../services/api';

function toDateOnly(str) {
  if (!str) return '';
  const s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parts = s.split(/[\s.\-/]+/).filter(Boolean);
  if (parts.length >= 3)
    return `${parts[0].padStart(4, '0')}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  return s.slice(0, 10);
}

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: '접수중', label: '접수중' },
  { value: 'inProgress', label: '진행중' },
  { value: '처리완료', label: '완료' },
  { value: '접수취소', label: '취소' },
];

function getStatusBadgeClass(status) {
  if (status === '접수중') return 'bg-primary';
  if (status === '처리완료') return 'bg-success';
  if (status === '접수취소') return 'bg-secondary';
  if (['발주진행', '발주완료(납기확인)', '발주완료(납기미정)'].includes(status)) return 'bg-warning text-dark';
  return 'bg-light text-dark';
}

function isInProgress(status) {
  return ['발주진행', '발주완료(납기확인)', '발주완료(납기미정)'].includes(status);
}

export default function MyRequests() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    requests
      .my()
      .then((res) => setList(Array.isArray(res) ? res : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = [...list];
    if (statusFilter === 'inProgress') {
      result = result.filter((r) => isInProgress(r.status));
    } else if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (startDate) {
      result = result.filter((r) => toDateOnly(r.requestDate) >= startDate);
    }
    if (endDate) {
      result = result.filter((r) => toDateOnly(r.requestDate) <= endDate);
    }
    return result;
  }, [list, statusFilter, startDate, endDate]);

  const stats = useMemo(() => {
    const requested = filtered.filter((r) => r.status === '접수중').length;
    const inProgressCount = filtered.filter((r) => isInProgress(r.status)).length;
    const finished = filtered.filter((r) => r.status === '처리완료').length;
    return { requested, inProgress: inProgressCount, finished, total: filtered.length };
  }, [filtered]);

  const handleStatus = async (requestNo, status, remarks = '') => {
    try {
      await requests.updateStatus(requestNo, status, remarks);
      setList((prev) => (Array.isArray(prev) ? prev : []).map((r) => (r.requestNo === requestNo ? { ...r, status } : r)));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p>로딩 중...</p>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <>
      <h1 style={{ marginBottom: 'var(--aj-spacing-lg)' }}>내 신청 목록</h1>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-2">
              <label className="form-label">상태</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">시작일</label>
              <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label">종료일</label>
              <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-2 mb-4">
        <div className="col-6 col-md-3">
          <div className="card text-center">
            <div className="card-body py-3">
              <h6 className="text-muted mb-0">접수중</h6>
              <h4 className="mb-0">{stats.requested}</h4>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-center">
            <div className="card-body py-3">
              <h6 className="text-muted mb-0">진행중</h6>
              <h4 className="mb-0">{stats.inProgress}</h4>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-center">
            <div className="card-body py-3">
              <h6 className="text-muted mb-0">완료</h6>
              <h4 className="mb-0">{stats.finished}</h4>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-center">
            <div className="card-body py-3">
              <h6 className="text-muted mb-0">전체</h6>
              <h4 className="mb-0">{stats.total}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        {filtered.length ? (
          <table className="table mb-0">
            <thead>
              <tr>
                <th>신청번호</th>
                <th>신청일</th>
                <th>품명</th>
                <th>수량</th>
                <th>상태</th>
                <th>담당자</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.requestNo}>
                  <td><Link to={`/request/${r.requestNo}`}>{r.requestNo ?? '-'}</Link></td>
                  <td>{formatDisplayDate(r.requestDate)}</td>
                  <td>{r.itemName ?? '-'}</td>
                  <td>{r.quantity ?? '-'}</td>
                  <td><span className={`badge ${getStatusBadgeClass(r.status)}`}>{r.status}</span></td>
                  <td>{r.handler ?? '-'}</td>
                  <td>
                    {r.canCancel && <button type="button" className="btn btn-sm btn-danger" onClick={() => confirm('취소하시겠습니까?') && handleStatus(r.requestNo, '접수취소')}>취소</button>}
                    {r.canConfirmReceipt && <button type="button" className="btn btn-sm btn-success" onClick={() => confirm('수령 확인하시겠습니까?') && handleStatus(r.requestNo, '처리완료')}>수령확인</button>}
                    {!r.canCancel && !r.canConfirmReceipt && <Link to={`/request/${r.requestNo}`} className="btn btn-sm btn-outline-primary">상세</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="card-body">
            <p className="mb-0">조건에 맞는 신청 내역이 없습니다.</p>
          </div>
        )}
      </div>
    </>
  );
}
