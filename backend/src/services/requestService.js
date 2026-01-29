import { config } from '../config.js';
import * as storage from './localStorageService.js';

export async function createRequest(formData, user) {
  if (!user) throw new Error('사용자 정보를 찾을 수 없습니다.');

  if (!formData.itemName?.trim()) throw new Error('품명은 필수 입력 항목입니다.');
  if (!formData.quantity || parseInt(formData.quantity, 10) < 1) throw new Error('수량은 1 이상이어야 합니다.');
  if (!formData.assetNo?.trim()) throw new Error('관리번호는 필수 입력 항목입니다.');
  if (!formData.photoBase64) throw new Error('사진 첨부는 필수입니다.');

  const requests = await storage.getRequests({ requesterEmail: user.userId, assetNo: formData.assetNo });
  const duplicate = requests.find((r) => r.status === config.status.REQUESTED);
  if (duplicate) {
    return {
      success: false,
      isDuplicate: true,
      duplicateRequestNo: duplicate.requestNo,
      message: `중복 접수가 감지되었습니다. 신청번호: ${duplicate.requestNo}`,
    };
  }

  const requestNo = await generateRequestNo();
  let photoUrl = '';
  if (formData.photoBase64) {
    const base64Data = formData.photoBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const relativePath = await storage.uploadPhoto(requestNo, buffer, 'image/jpeg');
    photoUrl = `/api/attachments/${relativePath}`;
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const requestData = {
    requestNo,
    requestDate: now,
    requesterEmail: user.userId,
    requesterName: user.name,
    employeeCode: user.employeeCode ?? '',
    team: user.team ?? '',
    region: formData.region ?? user.region ?? '',
    itemName: formData.itemName.trim(),
    modelName: (formData.modelName || '').trim(),
    serialNo: (formData.serialNo || '').trim(),
    quantity: parseInt(formData.quantity, 10),
    assetNo: formData.assetNo.trim(),
    deliveryPlace: (formData.deliveryPlace || '').trim(),
    phone: (formData.phone || '').trim(),
    company: (formData.company || '').trim(),
    remarks: (formData.remarks || '').trim(),
    photoUrl,
    status: config.status.REQUESTED,
    handler: '',
    handlerRemarks: '',
    orderDate: '',
    expectedDeliveryDate: '',
    receiptDate: '',
    lastModified: now,
    lastModifiedBy: user.userId,
  };

  await storage.createRequest(requestData);
  await storage.appendLog('INFO', '신청 생성', requestNo, user.userId);

  return { success: true, requestNo, message: '신청이 완료되었습니다.' };
}

async function generateRequestNo() {
  const today = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const prefix = today;
  const list = await storage.getRequests({});
  const todayList = list.filter((r) => String(r.requestNo).startsWith(prefix));
  let seq = 1;
  if (todayList.length > 0) {
    const last = todayList[todayList.length - 1].requestNo;
    seq = parseInt(String(last).slice(6), 10) + 1;
  }
  return prefix + String(seq).padStart(4, '0');
}

export async function updateStatus(requestNo, newStatus, remarks, user) {
  const request = await storage.getRequestById(requestNo);
  if (!request) throw new Error('신청 건을 찾을 수 없습니다.');

  const updates = {
    status: newStatus,
    lastModified: new Date().toISOString().slice(0, 19).replace('T', ' '),
    lastModifiedBy: user.userId,
  };
  if (remarks) updates.handlerRemarks = remarks;
  if (newStatus === config.status.ORDERING) updates.orderDate = updates.lastModified;
  if (newStatus === config.status.FINISHED) updates.receiptDate = updates.lastModified;

  await storage.updateRequest(requestNo, updates);
  await storage.appendLog('INFO', `상태 변경: ${request.status} → ${newStatus}`, requestNo, user.userId);
  return { success: true, message: '상태가 변경되었습니다.' };
}

export async function getMyRequests(userId) {
  const list = await storage.getRequests({ requesterEmail: userId });
  return list.map((r) => ({
    ...r,
    canCancel: r.status === config.status.REQUESTED,
    canConfirmReceipt:
      r.status === config.status.COMPLETED_CONFIRMED || r.status === config.status.COMPLETED_PENDING,
  }));
}

export async function getDashboardData(user) {
  const list = await storage.getRequests({});
  const isAdmin = user.role === config.roles.ADMIN;
  const filtered = isAdmin ? list : list.filter((r) => r.requesterEmail === user.userId);

  const stats = {
    total: filtered.length,
    requested: filtered.filter((r) => r.status === config.status.REQUESTED).length,
    ordering: filtered.filter((r) => r.status === config.status.ORDERING).length,
    completed: filtered.filter(
      (r) => r.status === config.status.COMPLETED_CONFIRMED || r.status === config.status.COMPLETED_PENDING
    ).length,
    finished: filtered.filter((r) => r.status === config.status.FINISHED).length,
    cancelled: filtered.filter((r) => r.status === config.status.CANCELLED).length,
  };

  const recent = filtered.slice(0, 10);
  return { stats, recent, requests: filtered };
}
