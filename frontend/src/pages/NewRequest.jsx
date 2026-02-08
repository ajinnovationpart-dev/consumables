import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requests, codes } from '../services/api';

const CUSTOM_DELIVERY_VALUE = '__CUSTOM__';

/** 전화번호 자동 포맷: 숫자만 추출 후 010-1234-5678 형식 */
function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function NewRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deliveryPlaces, setDeliveryPlaces] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicateRequestNo, setDuplicateRequestNo] = useState('');
  const [form, setForm] = useState({
    itemName: '',
    modelName: '',
    quantity: 1,
    assetNo: '',
    serialNo: '',
    deliveryPlace: '',
    customDeliveryPlace: '',
    phone: '',
    company: '',
    remarks: '',
  });

  // 배송지: 로그인 사용자 소속팀(파트) 기준
  useEffect(() => {
    codes.deliveryPlaces(user?.team ?? null).then((res) => setDeliveryPlaces(Array.isArray(res) ? res : [])).catch(() => setDeliveryPlaces([]));
  }, [user?.team]);

  // 내 신청 목록: 가장 많이 사용한 배송지 자동 선택용
  useEffect(() => {
    requests.my().then((res) => setMyRequests(Array.isArray(res) ? res : [])).catch(() => setMyRequests([]));
  }, []);

  // 가장 많이 사용한 배송지로 초기값 설정 (한 번만)
  const mostUsedDeliveryPlace = useMemo(() => {
    const list = myRequests.filter((r) => r.deliveryPlace && String(r.deliveryPlace).trim());
    if (list.length === 0) return '';
    const counts = {};
    list.forEach((r) => {
      const key = String(r.deliveryPlace).trim();
      counts[key] = (counts[key] || 0) + 1;
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries[0] ? entries[0][0] : '';
  }, [myRequests]);

  useEffect(() => {
    if (!mostUsedDeliveryPlace) return;
    const optionExists = deliveryPlaces.some((p) => (p.배송지명 || p.name) === mostUsedDeliveryPlace);
    setForm((prev) => {
      if (prev.deliveryPlace || prev.customDeliveryPlace) return prev;
      return {
        ...prev,
        deliveryPlace: optionExists ? mostUsedDeliveryPlace : CUSTOM_DELIVERY_VALUE,
        customDeliveryPlace: optionExists ? prev.customDeliveryPlace : mostUsedDeliveryPlace,
      };
    });
  }, [mostUsedDeliveryPlace, deliveryPlaces.length]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      setForm((prev) => ({ ...prev, phone: formatPhone(value) }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: name === 'quantity' ? parseInt(value, 10) || 0 : value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('파일 크기는 5MB를 초과할 수 없습니다.');
      return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setError('JPG, PNG 형식만 가능합니다.');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
    setError('');
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const resolveDeliveryPlace = () => {
    if (form.deliveryPlace === CUSTOM_DELIVERY_VALUE) return form.customDeliveryPlace?.trim() || '';
    return form.deliveryPlace?.trim() || '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDuplicateRequestNo('');
    if (!form.itemName?.trim()) {
      setError('품명을 입력하세요.');
      return;
    }
    if (form.quantity < 1) {
      setError('수량은 1 이상이어야 합니다.');
      return;
    }
    if (!form.assetNo?.trim()) {
      setError('관리번호를 입력하세요.');
      return;
    }
    if (!photoFile) {
      setError('사진을 첨부해주세요.');
      return;
    }
    const deliveryPlace = resolveDeliveryPlace();
    if (!deliveryPlace) {
      setError('배송지를 선택하거나 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      const photoBase64 = await fileToBase64(photoFile);
      const result = await requests.create({
        ...form,
        deliveryPlace,
        region: user?.region ?? '',
        photoBase64,
      });
      if (result.isDuplicate) {
        setError(`중복 접수되었습니다. 기존 신청번호: ${result.duplicateRequestNo}`);
        setDuplicateRequestNo(result.duplicateRequestNo ?? '');
        setLoading(false);
        return;
      }
      if (result.success) {
        alert(`신청이 완료되었습니다. 신청번호: ${result.requestNo}`);
        navigate('/my-requests');
      } else {
        setError(result.message || '신청에 실패했습니다.');
      }
    } catch (err) {
      setError(err.message || '신청 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 style={{ marginBottom: 'var(--aj-spacing-lg)' }}>신규 신청</h1>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="alert alert-warning d-flex align-items-center justify-content-between flex-wrap gap-2">
            <span>{error}</span>
            {duplicateRequestNo && (
              <Link to={`/request/${duplicateRequestNo}`} className="btn btn-sm btn-outline-primary">기존 신청 상세 보기</Link>
            )}
          </div>
        )}
        <div className="card mb-3">
          <div className="card-header">신청자 정보</div>
          <div className="card-body">
            <div className="row g-2">
              <div className="col-md-6"><strong>이름</strong> {user?.name ?? '-'}</div>
              <div className="col-md-6"><strong>소속팀(파트)</strong> {user?.team ?? '-'}</div>
            </div>
            <p className="mb-0 mt-2 small text-muted">배송지는 위 소속팀 기준으로 표시됩니다.</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header">부품 정보</div>
          <div className="form-group">
            <label className="form-label">품명 <span className="text-danger">*</span></label>
            <input type="text" name="itemName" className="form-control" value={form.itemName} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">규격</label>
            <input type="text" name="modelName" className="form-control" value={form.modelName} onChange={handleChange} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--aj-spacing-md)' }}>
            <div className="form-group">
              <label className="form-label">수량 <span className="text-danger">*</span></label>
              <input type="number" name="quantity" className="form-control" min={1} value={form.quantity} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">관리번호 <span className="text-danger">*</span></label>
              <input type="text" name="assetNo" className="form-control" value={form.assetNo} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">시리얼번호</label>
            <input type="text" name="serialNo" className="form-control" value={form.serialNo} onChange={handleChange} />
          </div>
        </div>
        <div className="card">
          <div className="card-header">사진 첨부 <span className="text-danger">*</span></div>
          <div className="card-body">
            <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
              <label className="btn btn-outline-primary mb-0">
                📷 촬영
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="d-none"
                  onChange={handlePhotoChange}
                />
              </label>
              <span className="text-muted small">또는</span>
              <label className="btn btn-outline-secondary mb-0">
                갤러리에서 선택
                <input type="file" accept="image/*" className="d-none" onChange={handlePhotoChange} />
              </label>
            </div>
            {photoPreview && (
              <>
                <img src={photoPreview} alt="미리보기" style={{ maxWidth: 300, marginTop: 'var(--aj-spacing-sm)', borderRadius: 'var(--aj-radius-md)' }} />
                <button type="button" className="btn btn-sm btn-outline-danger mt-2" onClick={() => { setPhotoFile(null); setPhotoPreview(''); }}>삭제</button>
              </>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header">배송/연락처</div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">수령지(배송지) <span className="text-danger">*</span></label>
              <select name="deliveryPlace" className="form-control" value={form.deliveryPlace === '' && form.customDeliveryPlace ? CUSTOM_DELIVERY_VALUE : form.deliveryPlace} onChange={(e) => setForm((prev) => ({ ...prev, deliveryPlace: e.target.value }))} required>
                <option value="">선택 (소속팀 기준)</option>
                {(Array.isArray(deliveryPlaces) ? deliveryPlaces : []).map((p) => (
                  <option key={p.배송지명 || p.name} value={p.배송지명 || p.name}>{p.배송지명 || p.name}</option>
                ))}
                <option value={CUSTOM_DELIVERY_VALUE}>기타 (직접 입력)</option>
              </select>
              {form.deliveryPlace === CUSTOM_DELIVERY_VALUE && (
                <input
                  type="text"
                  name="customDeliveryPlace"
                  className="form-control mt-2"
                  placeholder="배송지를 직접 입력하세요"
                  value={form.customDeliveryPlace}
                  onChange={handleChange}
                />
              )}
              {mostUsedDeliveryPlace && (
                <p className="small text-muted mt-1">자주 쓰는 배송지로 초기 선택됨: {mostUsedDeliveryPlace}</p>
              )}
              {deliveryPlaces.length === 0 && user?.team && !form.customDeliveryPlace && form.deliveryPlace !== CUSTOM_DELIVERY_VALUE && <p className="small text-muted mt-1">등록된 배송지가 없습니다. 관리자(기준정보)에서 소속팀에 맞는 배송지를 등록해 주세요.</p>}
              {deliveryPlaces.length === 0 && !user?.team && <p className="small text-warning mt-1">소속팀이 없어 배송지 목록을 불러올 수 없습니다. 내 정보 또는 관리자에게 문의하세요.</p>}
            </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--aj-spacing-md)' }}>
            <div className="form-group">
              <label className="form-label">전화번호</label>
              <input type="tel" name="phone" className="form-control" value={form.phone} onChange={handleChange} placeholder="010-1234-5678" maxLength={13} />
            </div>
            <div className="form-group">
              <label className="form-label">업체명</label>
              <input type="text" name="company" className="form-control" value={form.company} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">비고</label>
            <textarea name="remarks" className="form-control" rows={3} value={form.remarks} onChange={handleChange} />
          </div>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '처리 중...' : '신청하기'}</button>
      </form>
    </>
  );
}
