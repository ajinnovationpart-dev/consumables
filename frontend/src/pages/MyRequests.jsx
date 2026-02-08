import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { requests, formatDisplayDate } from '../services/api';

const PAGE_SIZE = 10;

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
  if (['접수완료', '발주완료(납기확인)', '발주완료(납기미정)'].includes(status)) return 'bg-warning text-dark';
  return 'bg-light text-dark';
}

function isInProgress(status) {
  return ['접수완료', '발주완료(납기확인)', '발주완료(납기미정)'].includes(status);
}

/** 키워드가 신청번호/품명/관리번호에 포함되는지 */
function matchesKeyword(r, keyword) {
  const k = String(keyword || '').trim().toLowerCase();
  if (!k) return true;
  const no = String(r.requestNo || '').toLowerCase();
  const item = String(r.itemName || '').toLowerCase();
  const asset = String(r.assetNo || '').toLowerCase();
  return no.includes(k) || item.includes(k) || asset.includes(k);
}

export default function MyRequests() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [keyword, setKeyword] = useState('');
  const [sortKey, setSortKey] = useState('requestDate');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    requests
      .my()
      .then((res) => setList(Array.isArray(res) ? res : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = [...list];
    if (keyword) result = result.filter((r) => matchesKeyword(r, keyword));
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
    result.sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (sortKey === 'requestDate') {
        va = toDateOnly(va) || '';
        vb = toDateOnly(vb) || '';
      }
      if (va === vb) return 0;
      const cmp = va < vb ? -1 : 1;
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [list, statusFilter, startDate, endDate, keyword, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const toggleSort = (key) => {
    setSortKey(key);
    setSortAsc((prev) => (sortKey === key ? !prev : true));
  };

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
            <div className="col-md-3">
              <label className="form-label">키워드 검색</label>
              <input
                type="text"
                className="form-control"
                placeholder="신청번호, 품명, 관리번호"
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">상태</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">시작일</label>
              <input type="date" className="form-control" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
            </div>
            <div className="col-md-2">
              <label className="form-label">종료일</label>
              <input type="date" className="form-control" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
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
        {paged.length ? (
          <>
            <table className="table mb-0">
              <thead>
                <tr>
                  <th>신청번호</th>
                  <th>
                    <button type="button" className="btn btn-link p-0 text-decoration-none text-dark fw-normal" onClick={() => toggleSort('requestDate')}>
                      신청일 {sortKey === 'requestDate' ? (sortAsc ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th>품명</th>
                  <th>수량</th>
                  <th>관리번호</th>
                  <th>상태</th>
                  <th>담당자</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r.requestNo}>
                    <td><Link to={`/request/${r.requestNo}`}>{r.requestNo ?? '-'}</Link></td>
                    <td>{formatDisplayDate(r.requestDate)}</td>
                    <td>{r.itemName ?? '-'}</td>
                    <td>{r.quantity ?? '-'}</td>
                    <td>{r.assetNo ?? '-'}</td>
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
            <div className="card-footer d-flex justify-content-between align-items-center flex-wrap gap-2">
              <span className="small text-muted">
                전체 {filtered.length}건 중 {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}건 (10건/페이지)
              </span>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                    <button type="button" className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>이전</button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                      <button type="button" className="page-link" onClick={() => setPage(p)}>{p}</button>
                    </li>
                  ))}
                  <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                    <button type="button" className="page-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>다음</button>
                  </li>
                </ul>
              </nav>
            </div>
          </>
        ) : (
          <div className="card-body">
            <p className="mb-0">조건에 맞는 신청 내역이 없습니다.</p>
          </div>
        )}
      </div>
    </>
  );
}
