import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requests, admin, getAttachmentUrl, formatDisplayDate } from '../services/api';

const STATUS_OPTIONS = [
  '접수중',
  '발주진행',
  '발주완료(납기확인)',
  '발주완료(납기미정)',
  '처리완료',
  '접수취소',
];

/** 진행바 단계: 접수중 → 발주진행 → 발주완료 → 처리완료 */
const PROGRESS_STEPS = [
  { key: '접수중', label: '접수' },
  { key: '발주진행', label: '발주진행' },
  { key: '발주완료', label: '발주완료' },
  { key: '처리완료', label: '처리완료' },
];

function stepIndex(status) {
  if (!status || status === '접수취소') return -1;
  if (status === '접수중') return 0;
  if (status === '발주진행') return 1;
  if (status === '발주완료(납기확인)' || status === '발주완료(납기미정)') return 2;
  if (status === '처리완료') return 3;
  return 0;
}

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
  const [adminHandler, setAdminHandler] = useState('');
  const [adminExpectedDeliveryDate, setAdminExpectedDeliveryDate] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [handlers, setHandlers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [copyToast, setCopyToast] = useState('');

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
          setAdminHandler(r.handler ?? '');
          setAdminExpectedDeliveryDate(
            r.expectedDeliveryDate
              ? (typeof r.expectedDeliveryDate === 'string' && r.expectedDeliveryDate.includes(' ')
                ? r.expectedDeliveryDate.slice(0, 10)
                : String(r.expectedDeliveryDate).slice(0, 10))
              : ''
          );
        }
      })
      .catch((err) => setError(err?.message ?? '로딩 실패'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [requestNo]);

  useEffect(() => {
    if (!isAdmin) return;
    admin.users.list().then((res) => setHandlers(Array.isArray(res) ? res : [])).catch(() => setHandlers([]));
  }, [isAdmin]);

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
    if (
      adminStatus === request?.status &&
      adminRemarks === (request?.handlerRemarks ?? '') &&
      adminHandler === (request?.handler ?? '') &&
      adminExpectedDeliveryDate === (request?.expectedDeliveryDate ? String(request.expectedDeliveryDate).slice(0, 10) : '')
    )
      return;
    setSaving(true);
    try {
      await requests.updateStatus(requestNo, adminStatus, adminRemarks, {
        handler: adminHandler,
        expectedDeliveryDate: adminExpectedDeliveryDate || undefined,
      });
      load();
    } catch (err) {
      alert(err?.message ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleForceCancel = async () => {
    const reason = window.prompt('취소 사유를 입력하세요:');
    if (reason == null || reason.trim() === '') return;
    if (!window.confirm('정말 이 신청을 취소하시겠습니까?')) return;
    setSaving(true);
    try {
      await requests.updateStatus(requestNo, '접수취소', reason.trim());
      load();
      navigate(isAdmin ? '/admin/requests' : -1);
    } catch (err) {
      alert(err?.message ?? '취소 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyImage = async () => {
    if (!request?.photoUrl) return;
    try {
      const url = getAttachmentUrl(request.photoUrl);
      const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopyToast('이미지가 클립보드에 복사되었습니다.');
      setTimeout(() => setCopyToast(''), 2000);
    } catch (err) {
      try {
        await navigator.clipboard.writeText(getAttachmentUrl(request.photoUrl));
        setCopyToast('이미지 URL이 클립보드에 복사되었습니다.');
        setTimeout(() => setCopyToast(''), 2000);
      } catch (e) {
        setCopyToast('복사에 실패했습니다.');
        setTimeout(() => setCopyToast(''), 2000);
      }
    }
  };

  if (loading && !request) return <p>로딩 중...</p>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!request) return <p>신청 건을 찾을 수 없습니다.</p>;

  const showConfirmReceipt = !isAdmin && canConfirmReceipt(request?.status);
  const currentStep = stepIndex(request?.status);

  return (
    <>
      <h1 style={{ marginBottom: 'var(--aj-spacing-lg)' }}>신청 상세</h1>

      {/* 상태 진행바: 접수 → 발주진행 → 발주완료 → 처리완료 */}
      {currentStep >= 0 && (
        <div className="card mb-3">
          <div className="card-body">
            <h6 className="mb-3">🔖 진행 상태</h6>
            <div className="d-flex justify-content-between mb-2" style={{ gap: '0.25rem' }}>
              {PROGRESS_STEPS.map((step, idx) => (
                <div key={step.key} className="text-center" style={{ flex: 1 }}>
                  <div
                    className="rounded-circle d-inline-flex align-items-center justify-content-center"
                    style={{
                      width: 28,
                      height: 28,
                      background: idx <= currentStep ? 'var(--aj-primary)' : 'var(--aj-gray-200)',
                      color: idx <= currentStep ? '#fff' : 'var(--aj-gray-600)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div className="small mt-1" style={{ color: idx <= currentStep ? 'var(--aj-gray-800)' : 'var(--aj-gray-500)' }}>{step.label}</div>
                </div>
              ))}
            </div>
            <div style={{ height: 4, background: 'var(--aj-gray-200)', borderRadius: 2, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${((currentStep + 1) / PROGRESS_STEPS.length) * 100}%`,
                  height: '100%',
                  background: 'var(--aj-primary)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="card mb-3">
        <div className="card-header">기본 정보</div>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-6"><strong>신청번호</strong> {request?.requestNo ?? '-'}</div>
            <div className="col-md-6"><strong>신청일시</strong> {request?.requestDate ?? '-'}</div>
            <div className="col-md-6"><strong>상태</strong> <span className="badge" style={{ background: 'var(--aj-gray-200)', color: 'var(--aj-gray-800)' }}>{request?.status ?? '-'}</span></div>
            <div className="col-md-6"><strong>신청자</strong> {request?.requesterName ?? '-'} ({request?.team ?? '-'})</div>
            <div className="col-md-6"><strong>신청자 ID(사번)</strong> {request?.requesterEmail ?? '-'}</div>
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
            <img
              src={getAttachmentUrl(request?.photoUrl)}
              alt="첨부"
              style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 'var(--aj-radius-md)', cursor: 'pointer' }}
              onClick={handleCopyImage}
              onContextMenu={(e) => { e.preventDefault(); handleCopyImage(); }}
              title="클릭하여 이미지 복사 (좌클릭/우클릭)"
            />
            <p className="mt-2 d-flex gap-2 flex-wrap">
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleCopyImage}>클립보드에 복사</button>
              <a href={getAttachmentUrl(request?.photoUrl)} target="_blank" rel="noopener noreferrer">새 탭에서 보기</a>
            </p>
            {copyToast && <p className="small text-success mb-0">{copyToast}</p>}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="card mb-3">
          <div className="card-header">관리자 액션</div>
          <div className="card-body">
            <form onSubmit={handleAdminSave}>
              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <label className="form-label">상태 변경</label>
                  <select className="form-select" value={adminStatus} onChange={(e) => setAdminStatus(e.target.value)}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">담당자 배정</label>
                  <select className="form-select" value={adminHandler} onChange={(e) => setAdminHandler(e.target.value)}>
                    <option value="">선택하세요</option>
                    {handlers.map((u) => (
                      <option key={u.userId} value={u.name || u.userId}>{u.name || u.userId}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">예상 납기일</label>
                  <input
                    type="date"
                    className="form-control"
                    value={adminExpectedDeliveryDate}
                    onChange={(e) => setAdminExpectedDeliveryDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">담당자 비고</label>
                <textarea className="form-control" rows={2} value={adminRemarks} onChange={(e) => setAdminRemarks(e.target.value)} />
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
                <button type="button" className="btn btn-danger" onClick={handleForceCancel} disabled={saving}>강제 취소</button>
              </div>
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
