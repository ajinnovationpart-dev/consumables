import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { requests, getAttachmentUrl } from '../services/api';

export default function RequestDetail() {
  const { requestNo } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    requests
      .get(requestNo)
      .then((res) => setRequest(res && typeof res === 'object' ? res : null))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [requestNo]);

  if (loading) return <p>로딩 중...</p>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!request) return <p>신청 건을 찾을 수 없습니다.</p>;

  return (
    <>
      <h1 style={{ marginBottom: 'var(--aj-spacing-lg)' }}>신청 상세</h1>
      <div className="card">
        <div className="card-header">기본 정보</div>
        <p><strong>신청번호</strong> {request?.requestNo ?? '-'}</p>
        <p><strong>신청일시</strong> {request?.requestDate ?? '-'}</p>
        <p><strong>상태</strong> <span className="badge" style={{ background: 'var(--aj-gray-200)', color: 'var(--aj-gray-800)' }}>{request?.status ?? '-'}</span></p>
      </div>
      <div className="card">
        <div className="card-header">부품 정보</div>
        <p><strong>품명</strong> {request?.itemName ?? '-'}</p>
        <p><strong>규격</strong> {request?.modelName ?? '-'}</p>
        <p><strong>수량</strong> {request?.quantity ?? '-'}</p>
        <p><strong>관리번호</strong> {request?.assetNo ?? '-'}</p>
        <p><strong>시리얼번호</strong> {request?.serialNo ?? '-'}</p>
      </div>
      {request?.photoUrl && (
        <div className="card">
          <div className="card-header">첨부 사진</div>
          <img src={getAttachmentUrl(request?.photoUrl)} alt="첨부" style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 'var(--aj-radius-md)' }} />
          <p className="mt-2"><a href={getAttachmentUrl(request?.photoUrl)} target="_blank" rel="noopener noreferrer">새 탭에서 보기</a></p>
        </div>
      )}
      <button type="button" className="btn btn-outline-primary" onClick={() => navigate(-1)}>목록으로</button>
    </>
  );
}
