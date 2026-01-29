import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requests, codes } from '../services/api';

export default function NewRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [regions, setRegions] = useState([]);
  const [deliveryPlaces, setDeliveryPlaces] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    itemName: '',
    modelName: '',
    quantity: 1,
    assetNo: '',
    serialNo: '',
    region: user?.region || '',
    deliveryPlace: '',
    phone: '',
    company: '',
    remarks: '',
  });

  useEffect(() => {
    codes.regions().then((res) => setRegions(Array.isArray(res) ? res : [])).catch(() => setRegions([]));
    if (user?.team) codes.deliveryPlaces(user.team).then((res) => setDeliveryPlaces(Array.isArray(res) ? res : [])).catch(() => setDeliveryPlaces([]));
  }, [user?.team]);

  const handleChange = (e) => {
    const { name, value } = e.target;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
    setLoading(true);
    try {
      const photoBase64 = await fileToBase64(photoFile);
      const result = await requests.create({ ...form, photoBase64 });
      if (result.isDuplicate) {
        setError(`중복 접수: ${result.duplicateRequestNo}`);
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
        {error && <div className="alert alert-danger">{error}</div>}
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
          <input type="file" accept="image/jpeg,image/jpg,image/png" onChange={handlePhotoChange} required />
          {photoPreview && <img src={photoPreview} alt="미리보기" style={{ maxWidth: 300, marginTop: 'var(--aj-spacing-sm)', borderRadius: 'var(--aj-radius-md)' }} />}
        </div>
        <div className="card">
          <div className="card-header">배송/연락처</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--aj-spacing-md)' }}>
            <div className="form-group">
              <label className="form-label">지역</label>
              <select name="region" className="form-control" value={form.region} onChange={handleChange}>
                <option value="">선택</option>
                {(Array.isArray(regions) ? regions : []).map((r) => (
                  <option key={r.code} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">배송지</label>
              <select name="deliveryPlace" className="form-control" value={form.deliveryPlace} onChange={handleChange}>
                <option value="">선택</option>
                {(Array.isArray(deliveryPlaces) ? deliveryPlaces : []).map((p) => (
                  <option key={p.배송지명 || p.name} value={p.배송지명 || p.name}>{p.배송지명 || p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--aj-spacing-md)' }}>
            <div className="form-group">
              <label className="form-label">전화번호</label>
              <input type="tel" name="phone" className="form-control" value={form.phone} onChange={handleChange} />
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
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '처리 중...' : '신청하기'}</button>
      </form>
    </>
  );
}
