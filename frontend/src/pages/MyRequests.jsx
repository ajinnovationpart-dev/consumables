import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requests } from '../services/api';

export default function MyRequests() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    requests
      .my()
      .then(setList)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleStatus = async (requestNo, status, remarks = '') => {
    try {
      await requests.updateStatus(requestNo, status, remarks);
      setList((prev) => prev.map((r) => (r.requestNo === requestNo ? { ...r, status } : r)));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p>로딩 중...</p>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <>
      <h1 style={{ marginBottom: 'var(--aj-spacing-lg)' }}>내 신청 목록</h1>
      <div className="card">
        {list.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>신청번호</th>
                <th>신청일</th>
                <th>품명</th>
                <th>수량</th>
                <th>상태</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.requestNo}>
                  <td><Link to={`/request/${r.requestNo}`}>{r.requestNo}</Link></td>
                  <td>{r.requestDate}</td>
                  <td>{r.itemName}</td>
                  <td>{r.quantity}</td>
                  <td><span className="badge" style={{ background: 'var(--aj-gray-200)', color: 'var(--aj-gray-800)' }}>{r.status}</span></td>
                  <td>
                    {r.canCancel && <button type="button" className="btn btn-sm btn-danger" onClick={() => confirm('취소하시겠습니까?') && handleStatus(r.requestNo, '접수취소')}>취소</button>}
                    {r.canConfirmReceipt && <button type="button" className="btn btn-sm btn-success" onClick={() => confirm('수령 확인하시겠습니까?') && handleStatus(r.requestNo, '처리완료')}>수령확인</button>}
                    {!r.canCancel && !r.canConfirmReceipt && '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mb-0">신청 내역이 없습니다.</p>
        )}
      </div>
    </>
  );
}
