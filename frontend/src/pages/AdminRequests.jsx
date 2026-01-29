import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requests } from '../services/api';

export default function AdminRequests() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    requests
      .all()
      .then((res) => setList(Array.isArray(res) ? res : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleStatus = async (requestNo, status, remarks = '') => {
    const rem = status === '접수취소' || status === '처리완료' ? '' : window.prompt('담당자 비고 (선택)');
    try {
      await requests.updateStatus(requestNo, status, rem || '');
      setList((prev) => (Array.isArray(prev) ? prev : []).map((r) => (r.requestNo === requestNo ? { ...r, status } : r)));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p>로딩 중...</p>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <>
      <h1 style={{ marginBottom: 'var(--aj-spacing-lg)' }}>전체 신청 목록</h1>
      <div className="card">
        {(Array.isArray(list) ? list : []).length ? (
          <table className="table">
            <thead>
              <tr>
                <th>신청번호</th>
                <th>신청일</th>
                <th>신청자</th>
                <th>품명</th>
                <th>수량</th>
                <th>상태</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(list) ? list : []).map((r) => (
                <tr key={r.requestNo}>
                  <td><Link to={`/request/${r.requestNo}`}>{r.requestNo}</Link></td>
                  <td>{r.requestDate}</td>
                  <td>{r.requesterName}</td>
                  <td>{r.itemName}</td>
                  <td>{r.quantity}</td>
                  <td><span className="badge" style={{ background: 'var(--aj-gray-200)', color: 'var(--aj-gray-800)' }}>{r.status}</span></td>
                  <td>
                    <Link to={`/request/${r.requestNo}`} className="btn btn-sm btn-outline-primary">상세</Link>
                    {r.status === '접수중' && <button type="button" className="btn btn-sm btn-primary" onClick={() => handleStatus(r.requestNo, '발주진행')}>발주진행</button>}
                    {r.status === '발주진행' && <button type="button" className="btn btn-sm btn-success" onClick={() => handleStatus(r.requestNo, '발주완료(납기확인)')}>발주완료</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mb-0">신청이 없습니다.</p>
        )}
      </div>
    </>
  );
}
