import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requests, getAttachmentUrl, formatDisplayDate } from '../services/api';

const STATUS_OPTIONS = [
  '접수중',
  '발주진행',
  '발주완료(납기확인)',
  '발주완료(납기미정)',
  '처리완료',
  '접수취소',
];

function canConfirmReceipt(status) {
  return status === '발주완료(납기확인)' || status === '발주완료(납기미정)';
}

export default function RequestDetail() {
  const { requestNo } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === '관리자';
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminStatus, setAdminStatus] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    requests
      .get(requestNo)
      .then((res) => {
        const r = res && typeof res === 'object' ? res : null;
        setRequest(r);
        if (r) {
          setAdminStatus(r.status ?? '');
          setAdminRemarks(r.handlerRemarks ?? '');
        }
      })
      .catch((err) => setError(err?.message ?? '로딩 실패'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [requestNo]);

  const handleConfirmReceipt = async () => {
    if (!confirm('수령 확인하시겠습니까? 상태가 처리완료로 변경됩니다.')) return;
    try {
      await requests.updateStatus(requestNo, '처리완료', '');
      load();
    } catch (err) {
      alert(err?.message ?? '처리 실패');
    }
  };

  const handleAdminSave = async (e) => {
    e.preventDefault();
    if (adminStatus === request?.status && adminRemarks === (request?.handlerRemarks ?? '')) return;
    setSaving(true);
    try {
      await requests.updateStatus(requestNo, adminStatus, adminRemarks);
      load();
    } catch (err) {
      alert(err?.message ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !request) return <p>로딩 중...</p>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!request) return <p>신청 건을 찾을 수 없습니다.</p>;

  const showConfirmReceipt = !isAdmin && canConfirmReceipt(request?.status);

  return (
    <>
      <h1 style={{ marginBottom: 'var(--aj-spacing-lg)' }}>신청 상세</h1>

      <div className="card mb-3">
        <div className="card-header">기본 정보</div>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-6"><strong>신청번호</strong> {request?.requestNo ?? '-'}</div>
            <div className="col-md-6"><strong>신청일시</strong> {request?.requestDate ?? '-'}</div>
            <div className="col-md-6"><strong>상태</strong> <span className="badge" style={{ background: 'var(--aj-gray-200)', color: 'var(--aj-gray-800)' }}>{request?.status ?? '-'}</span></div>
            <div className="col-md-6"><strong>신청자</strong> {request?.requesterName ?? '-'} ({request?.team ?? '-'})</div>
            <div className="col-md-6"><strong>지역</strong> {request?.region ?? '-'}</div>
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header">부품 정보</div>
        <div className="card-body">
          <p><strong>품명</strong> {request?.itemName ?? '-'}</p>
          <p><strong>규격/모델명</strong> {request?.modelName ?? '-'}</p>
          <p><strong>수량</strong> {request?.quantity ?? '-'}</p>
          <p><strong>관리번호</strong> {request?.assetNo ?? '-'}</p>
          <p><strong>시리얼번호</strong> {request?.serialNo ?? '-'}</p>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header">수령 정보</div>
        <div className="card-body">
          <p><strong>수령지</strong> {request?.deliveryPlace ?? '-'}</p>
          <p><strong>전화번호</strong> {request?.phone ?? '-'}</p>
          <p><strong>업체명</strong> {request?.company ?? '-'}</p>
          {request?.remarks && <p><strong>비고</strong> {request.remarks}</p>}
        </div>
      </div>

      {request?.photoUrl && (
        <div className="card mb-3">
          <div className="card-header">첨부 사진</div>
          <div className="card-body">
            <img src={getAttachmentUrl(request?.photoUrl)} alt="첨부" style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 'var(--aj-radius-md)' }} />
            <p className="mt-2"><a href={getAttachmentUrl(request?.photoUrl)} target="_blank" rel="noopener noreferrer">새 탭에서 보기</a></p>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="card mb-3">
          <div className="card-header">관리자 액션</div>
          <div className="card-body">
            <form onSubmit={handleAdminSave}>
              <div className="mb-3">
                <label className="form-label">상태</label>
                <select className="form-select" value={adminStatus} onChange={(e) => setAdminStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">담당자 비고</label>
                <textarea className="form-control" rows={2} value={adminRemarks} onChange={(e) => setAdminRemarks(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
            </form>
          </div>
        </div>
      )}

      <div className="card mb-3">
        <div className="card-header">처리 정보</div>
        <div className="card-body">
          <p><strong>접수담당자</strong> {request?.handler ?? '-'}</p>
          <p><strong>담당자 비고</strong> {request?.handlerRemarks ?? '-'}</p>
          <p><strong>발주일시</strong> {formatDisplayDate(request?.orderDate) ?? '-'}</p>
          <p><strong>예상납기일</strong> {formatDisplayDate(request?.expectedDeliveryDate) ?? '-'}</p>
          <p><strong>수령확인일시</strong> {formatDisplayDate(request?.receiptDate) ?? '-'}</p>
          <p><strong>최종수정일시</strong> {formatDisplayDate(request?.lastModified) ?? '-'}</p>
        </div>
      </div>

      <div className="d-flex gap-2 flex-wrap">
        {showConfirmReceipt && (
          <button type="button" className="btn btn-success" onClick={handleConfirmReceipt}>수령 확인</button>
        )}
        <button type="button" className="btn btn-outline-primary" onClick={() => navigate(-1)}>목록으로</button>
        {isAdmin && <Link to="/admin/requests" className="btn btn-outline-secondary">전체 신청 목록</Link>}
      </div>
    </>
  );
}
