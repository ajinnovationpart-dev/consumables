import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { admin } from '../services/api';

const TAB_USERS = 'users';
const TAB_DELIVERY = 'delivery';
const TAB_EXCEL = 'excel';

export default function AdminMaster() {
  const [activeTab, setActiveTab] = useState(TAB_USERS);
  const [users, setUsers] = useState([]);
  const [deliveryPlaces, setDeliveryPlaces] = useState([]);
  const [loading, setLoading] = useState({ users: false, delivery: false });
  const [error, setError] = useState('');
  const [userModal, setUserModal] = useState({ open: false, mode: 'create', row: null });
  const [deliveryModal, setDeliveryModal] = useState({ open: false, mode: 'create', row: null });
  const [csvFile, setCsvFile] = useState(null);
  const [csvResult, setCsvResult] = useState(null);
  const [excelResult, setExcelResult] = useState(null);

  const loadUsers = () => {
    setLoading((l) => ({ ...l, users: true }));
    setError('');
    admin.users
      .list()
      .then((res) => setUsers(Array.isArray(res) ? res : []))
      .catch((err) => setError(err?.message || '사용자 목록 로드 실패'))
      .finally(() => setLoading((l) => ({ ...l, users: false })));
  };

  const loadDeliveryPlaces = () => {
    setLoading((l) => ({ ...l, delivery: true }));
    setError('');
    admin.deliveryPlaces
      .list()
      .then((res) => setDeliveryPlaces(Array.isArray(res) ? res : []))
      .catch((err) => setError(err?.message || '배송지 목록 로드 실패'))
      .finally(() => setLoading((l) => ({ ...l, delivery: false })));
  };

  useEffect(() => {
    if (activeTab === TAB_USERS) loadUsers();
    if (activeTab === TAB_DELIVERY) loadDeliveryPlaces();
  }, [activeTab]);

  const openUserCreate = () => {
    setUserModal({ open: true, mode: 'create', row: null });
  };
  const openUserEdit = (row) => {
    setUserModal({ open: true, mode: 'edit', row: { ...row } });
  };
  const closeUserModal = () => setUserModal({ open: false, mode: 'create', row: null });

  const openDeliveryCreate = () => {
    setDeliveryModal({ open: true, mode: 'create', row: null });
  };
  const openDeliveryEdit = (row) => {
    const r = {
      name: row['배송지명'] ?? row.name ?? '',
      team: row['소속팀'] ?? row.team ?? '',
      address: row['주소'] ?? row.address ?? '',
      contact: row['연락처'] ?? row.contact ?? '',
      manager: row['담당자'] ?? row.manager ?? '',
      active: row['활성화'] ?? row.active ?? 'Y',
      remarks: row['비고'] ?? row.remarks ?? '',
    };
    setDeliveryModal({ open: true, mode: 'edit', row: r });
  };
  const closeDeliveryModal = () => setDeliveryModal({ open: false, mode: 'create', row: null });

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <h1 className="mb-0" style={{ fontSize: 'var(--aj-font-size-2xl)', fontWeight: 'var(--aj-font-weight-bold)' }}>📋 기준정보 등록/관리</h1>
        <Link to="/admin" className="btn btn-outline-primary">← 관리자 대시보드</Link>
      </div>

      <ul className="nav nav-tabs mb-4" role="tablist">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === TAB_USERS ? 'active' : ''}`}
            onClick={() => setActiveTab(TAB_USERS)}
          >
            👥 사용자 관리
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === TAB_DELIVERY ? 'active' : ''}`}
            onClick={() => setActiveTab(TAB_DELIVERY)}
          >
            🚚 배송지 관리
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === TAB_EXCEL ? 'active' : ''}`}
            onClick={() => setActiveTab(TAB_EXCEL)}
          >
            📥 Excel 마스터 파일
          </button>
        </li>
      </ul>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* 사용자 관리 탭 */}
      {activeTab === TAB_USERS && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">사용자 목록</h5>
            <button type="button" className="btn btn-primary btn-sm" onClick={openUserCreate}>➕ 사용자 등록</button>
          </div>
          <div className="card-body p-0">
            {loading.users ? (
              <div className="p-4 text-center">로딩 중...</div>
            ) : (
              <table className="table table-striped table-hover mb-0">
                <thead>
                  <tr>
                    <th>사용자ID</th>
                    <th>이름</th>
                    <th>기사코드</th>
                    <th>소속팀</th>
                    <th>지역</th>
                    <th>역할</th>
                    <th>활성화</th>
                    <th>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan="8" className="text-center text-muted">등록된 사용자가 없습니다.</td></tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.userId}>
                        <td>{u.userId ?? '-'}</td>
                        <td>{u.name ?? '-'}</td>
                        <td>{u.employeeCode ?? '-'}</td>
                        <td>{u.team ?? '-'}</td>
                        <td>{u.region ?? '-'}</td>
                        <td>{u.role ?? '-'}</td>
                        <td>{u.active === 'Y' ? <span className="badge bg-success">활성</span> : <span className="badge bg-secondary">비활성</span>}</td>
                        <td><button type="button" className="btn btn-sm btn-warning" onClick={() => openUserEdit(u)}>수정</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 배송지 관리 탭 */}
      {activeTab === TAB_DELIVERY && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">배송지 목록</h5>
            <button type="button" className="btn btn-primary btn-sm" onClick={openDeliveryCreate}>➕ 배송지 등록</button>
          </div>
          <div className="card-body p-0">
            {loading.delivery ? (
              <div className="p-4 text-center">로딩 중...</div>
            ) : (
              <table className="table table-striped table-hover mb-0">
                <thead>
                  <tr>
                    <th>배송지명</th>
                    <th>소속팀</th>
                    <th>주소</th>
                    <th>연락처</th>
                    <th>담당자</th>
                    <th>활성화</th>
                    <th>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryPlaces.length === 0 ? (
                    <tr><td colSpan="7" className="text-center text-muted">등록된 배송지가 없습니다.</td></tr>
                  ) : (
                    deliveryPlaces.map((r, i) => (
                      <tr key={`${r['배송지명'] ?? r.name ?? ''}-${r['소속팀'] ?? r.team ?? ''}-${i}`}>
                        <td>{r['배송지명'] ?? r.name ?? '-'}</td>
                        <td>{r['소속팀'] ?? r.team ?? '-'}</td>
                        <td>{r['주소'] ?? r.address ?? '-'}</td>
                        <td>{r['연락처'] ?? r.contact ?? '-'}</td>
                        <td>{r['담당자'] ?? r.manager ?? '-'}</td>
                        <td>{(r['활성화'] ?? r.active ?? 'Y') === 'Y' ? <span className="badge bg-success">활성</span> : <span className="badge bg-secondary">비활성</span>}</td>
                        <td><button type="button" className="btn btn-sm btn-warning" onClick={() => openDeliveryEdit(r)}>수정</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Excel 마스터 탭 */}
      {activeTab === TAB_EXCEL && (
        <div className="row">
          <div className="col-md-6 mb-4">
            <div className="card">
              <div className="card-header"><h5 className="mb-0">📤 CSV 배송지 업로드</h5></div>
              <div className="card-body">
                <p className="text-muted small">
                  CSV 파일을 업로드하여 배송지(및 기준정보 형식 시 사용자) 일괄 등록. 형식: 배송지명,소속팀,주소,연락처,담당자,활성화,비고
                </p>
                <input
                  type="file"
                  className="form-control mb-2"
                  accept=".csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setCsvFile(f || null);
                    setCsvResult(null);
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!csvFile}
                  onClick={() => {
                    if (!csvFile) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const csvContent = ev.target?.result ?? '';
                      admin.importCsv(csvContent)
                        .then((res) => {
                          setCsvResult(res);
                          setCsvFile(null);
                          loadUsers();
                          loadDeliveryPlaces();
                        })
                        .catch((err) => setCsvResult({ success: false, message: err?.message }));
                    };
                    reader.readAsText(csvFile, 'UTF-8');
                  }}
                >
                  📥 CSV 업로드
                </button>
                {csvResult && (
                  <div className={`alert mt-3 mb-0 ${csvResult.success ? 'alert-success' : 'alert-danger'}`}>
                    {csvResult.message}
                    {csvResult.imported && (
                      <ul className="mb-0 mt-2">
                        {csvResult.imported.users !== undefined && <li>등록된 사용자: {csvResult.imported.users}명</li>}
                        <li>등록된 배송지: {csvResult.imported.deliveryPlaces}개</li>
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-md-6 mb-4">
            <div className="card">
              <div className="card-header"><h5 className="mb-0">📥 Excel 마스터 파일 생성</h5></div>
              <div className="card-body">
                <p className="text-muted small">전체 시트를 포함한 Excel 파일을 다운로드합니다.</p>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => {
                    setExcelResult(null);
                    admin.exportMaster()
                      .then((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `소모품발주_마스터_${new Date().toISOString().slice(0, 10)}.xlsx`;
                        a.click();
                        URL.revokeObjectURL(url);
                        setExcelResult({ success: true, message: '파일이 다운로드되었습니다.' });
                      })
                      .catch((err) => setExcelResult({ success: false, message: err?.message }));
                  }}
                >
                  📥 Excel 마스터 파일 생성
                </button>
                {excelResult && (
                  <div className={`alert mt-3 mb-0 ${excelResult.success ? 'alert-success' : 'alert-danger'}`}>
                    {excelResult.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 등록/수정 모달 */}
      {userModal.open && (
        <UserModal
          mode={userModal.mode}
          row={userModal.row}
          onClose={closeUserModal}
          onSaved={() => { closeUserModal(); loadUsers(); }}
        />
      )}

      {/* 배송지 등록/수정 모달 */}
      {deliveryModal.open && (
        <DeliveryModal
          mode={deliveryModal.mode}
          row={deliveryModal.row}
          onClose={closeDeliveryModal}
          onSaved={() => { closeDeliveryModal(); loadDeliveryPlaces(); }}
        />
      )}
    </>
  );
}

function UserModal({ mode, row, onClose, onSaved }) {
  const [userId, setUserId] = useState(row?.userId ?? '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(row?.name ?? '');
  const [employeeCode, setEmployeeCode] = useState(row?.employeeCode ?? '');
  const [team, setTeam] = useState(row?.team ?? '');
  const [region, setRegion] = useState(row?.region ?? '');
  const [role, setRole] = useState(row?.role ?? '신청자');
  const [active, setActive] = useState(row?.active ?? 'Y');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr('');
    setSaving(true);
    const payload = { userId, name, employeeCode, team, region, role, active };
    if (password) payload.password = password;
    const promise = mode === 'edit' ? admin.users.update(userId, payload) : admin.users.create(payload);
    promise
      .then(() => onSaved())
      .catch((e) => { setErr(e?.message || '저장 실패'); setSaving(false); });
  };

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{mode === 'edit' ? '사용자 수정' : '사용자 등록'}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {err && <div className="alert alert-danger">{err}</div>}
              <div className="mb-3">
                <label className="form-label">사용자ID *</label>
                <input type="text" className="form-control" value={userId} onChange={(e) => setUserId(e.target.value)} required disabled={mode === 'edit'} />
              </div>
              {mode === 'create' && (
                <div className="mb-3">
                  <label className="form-label">비밀번호</label>
                  <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="기본: 1234" />
                </div>
              )}
              {mode === 'edit' && (
                <div className="mb-3">
                  <label className="form-label">비밀번호 (변경 시에만 입력)</label>
                  <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비워두면 유지" />
                </div>
              )}
              <div className="mb-3">
                <label className="form-label">이름 *</label>
                <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label">기사코드</label>
                <input type="text" className="form-control" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">소속팀</label>
                <input type="text" className="form-control" value={team} onChange={(e) => setTeam(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">지역</label>
                <input type="text" className="form-control" value={region} onChange={(e) => setRegion(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">역할</label>
                <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="신청자">신청자</option>
                  <option value="관리자">관리자</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">활성화</label>
                <select className="form-select" value={active} onChange={(e) => setActive(e.target.value)}>
                  <option value="Y">활성화</option>
                  <option value="N">비활성화</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>취소</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '저장 중…' : mode === 'edit' ? '저장' : '등록'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function DeliveryModal({ mode, row, onClose, onSaved }) {
  const [name, setName] = useState(row?.name ?? '');
  const [team, setTeam] = useState(row?.team ?? '');
  const [address, setAddress] = useState(row?.address ?? '');
  const [contact, setContact] = useState(row?.contact ?? '');
  const [manager, setManager] = useState(row?.manager ?? '');
  const [active, setActive] = useState(row?.active ?? 'Y');
  const [remarks, setRemarks] = useState(row?.remarks ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr('');
    setSaving(true);
    const payload = { name, team, address, contact, manager, active, remarks };
    const promise = mode === 'edit'
      ? admin.deliveryPlaces.update({ originalName: row?.name, originalTeam: row?.team, ...payload })
      : admin.deliveryPlaces.create(payload);
    promise
      .then(() => onSaved())
      .catch((e) => { setErr(e?.message || '저장 실패'); setSaving(false); });
  };

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{mode === 'edit' ? '배송지 수정' : '배송지 등록'}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {err && <div className="alert alert-danger">{err}</div>}
              <div className="mb-3">
                <label className="form-label">배송지명 *</label>
                <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label">소속팀 *</label>
                <input type="text" className="form-control" value={team} onChange={(e) => setTeam(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label">주소</label>
                <input type="text" className="form-control" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">연락처</label>
                <input type="text" className="form-control" value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">담당자</label>
                <input type="text" className="form-control" value={manager} onChange={(e) => setManager(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">활성화</label>
                <select className="form-select" value={active} onChange={(e) => setActive(e.target.value)}>
                  <option value="Y">활성화</option>
                  <option value="N">비활성화</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">비고</label>
                <textarea className="form-control" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>취소</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '저장 중…' : mode === 'edit' ? '저장' : '등록'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
