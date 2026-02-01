import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { requests, codes, formatDisplayDate } from '../services/api';

function toDateOnly(str) {
  if (!str) return '';
  const s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parts = s.split(/[\s.\-/]+/).filter(Boolean);
  if (parts.length >= 3)
    return `${parts[0].padStart(4, '0')}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  return s.slice(0, 10);
}

export default function AdminRequests() {
  const [searchParams] = useSearchParams();
  const statusFromUrl = searchParams.get('status') || '';
  const [list, setList] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState(statusFromUrl);
  const [regionFilter, setRegionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setStatusFilter(statusFromUrl);
  }, [statusFromUrl]);

  useEffect(() => {
    requests
      .all()
      .then((res) => setList(Array.isArray(res) ? res : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    codes
      .regions()
      .then((res) => setRegions(Array.isArray(res) ? res : []))
      .catch(() => setRegions([]));
  }, []);

  const filtered = useMemo(() => {
    let result = [...list];
    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (regionFilter) {
      result = result.filter((r) => String(r.region ?? '').trim() === regionFilter);
    }
    if (startDate) {
      result = result.filter((r) => toDateOnly(r.requestDate) >= startDate);
    }
    if (endDate) {
      result = result.filter((r) => toDateOnly(r.requestDate) <= endDate);
    }
    return result;
  }, [list, statusFilter, regionFilter, startDate, endDate]);

  const handleStatus = async (requestNo, status, remarks = '') => {
    const needRemark = status !== '접수취소' && status !== '처리완료';
    const rem = needRemark ? window.prompt('담당자 비고 (선택)') : '';
    if (needRemark && rem === null) return;
    try {
      await requests.updateStatus(requestNo, status, rem ?? '');
      setList((prev) => (Array.isArray(prev) ? prev : []).map((r) => (r.requestNo === requestNo ? { ...r, status } : r)));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p>로딩 중...</p>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <h1 className="mb-0" style={{ fontSize: 'var(--aj-font-size-2xl)', fontWeight: 'var(--aj-font-weight-bold)' }}>전체 신청 목록</h1>
        <div className="d-flex flex-wrap gap-2">
          <Link to="/admin" className="btn btn-outline-primary">📊 관리자 대시보드</Link>
          <Link to="/admin/statistics" className="btn btn-outline-primary">📈 통계 및 리포트</Link>
          <Link to="/admin/master" className="btn btn-primary">⚙️ 기준정보 등록/관리</Link>
        </div>
      </div>

      {/* 조회 조건 - AJ 디자인 시스템 스타일 */}
      <div className="section-query">
        <h2 className="section-title">
          <span aria-hidden>🔍</span> 조회 조건
        </h2>
        <div className="row g-3 align-items-end">
          <div className="col-12 col-sm-6 col-md-3 col-lg-2">
            <label className="form-label fw-semibold">상태</label>
            <select className="form-select form-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">전체</option>
              <option value="접수중">접수중</option>
              <option value="발주진행">발주진행</option>
              <option value="발주완료(납기확인)">발주완료(납기확인)</option>
              <option value="발주완료(납기미정)">발주완료(납기미정)</option>
              <option value="처리완료">처리완료</option>
              <option value="접수취소">접수취소</option>
            </select>
          </div>
          <div className="col-12 col-sm-6 col-md-3 col-lg-2">
            <label className="form-label fw-semibold">지역</label>
            <select className="form-select form-select-sm" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
              <option value="">전체</option>
              {regions.map((r) => (
                <option key={r.code ?? r.name} value={r.name ?? r.code ?? ''}>{r.name ?? r.code ?? '-'}</option>
              ))}
              {regions.length === 0 && (
                <>
                  <option value="서울">서울</option>
                  <option value="부산">부산</option>
                  <option value="대구">대구</option>
                </>
              )}
            </select>
          </div>
          <div className="col-12 col-sm-6 col-md-3 col-lg-2">
            <label className="form-label fw-semibold">시작일</label>
            <input type="date" className="form-control form-control-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="col-12 col-sm-6 col-md-3 col-lg-2">
            <label className="form-label fw-semibold">종료일</label>
            <input type="date" className="form-control form-control-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
                <th>신청자</th>
                <th>지역</th>
                <th>품명</th>
                <th>수량</th>
                <th>상태</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.requestNo}>
                  <td><Link to={`/request/${r.requestNo}`}>{r.requestNo ?? '-'}</Link></td>
                  <td>{formatDisplayDate(r.requestDate)}</td>
                  <td>{r.requesterName ?? '-'}</td>
                  <td>{r.region ?? '-'}</td>
                  <td>{r.itemName ?? '-'}</td>
                  <td>{r.quantity ?? '-'}</td>
                  <td><span className="badge" style={{ background: 'var(--aj-gray-200)', color: 'var(--aj-gray-800)' }}>{r.status}</span></td>
                  <td>
                    <Link to={`/request/${r.requestNo}`} className="btn btn-sm btn-outline-primary">상세</Link>
                    {r.status === '접수중' && <button type="button" className="btn btn-sm btn-primary ms-1" onClick={() => handleStatus(r.requestNo, '발주진행')}>발주진행</button>}
                    {r.status === '발주진행' && <button type="button" className="btn btn-sm btn-success ms-1" onClick={() => handleStatus(r.requestNo, '발주완료(납기확인)')}>발주완료</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="card-body">
            <p className="mb-0">조건에 맞는 신청이 없습니다.</p>
          </div>
        )}
      </div>
    </>
  );
}
