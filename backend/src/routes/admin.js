import { Router } from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { hashPassword } from '../services/authService.js';
import * as storage from '../services/localStorageService.js';

const router = Router();
router.use(authMiddleware);
router.use(adminOnly);

/** 사용자 목록 (API 응답 시 userId, name 등 영문 키로 정규화) */
router.get('/users', async (req, res) => {
  try {
    const rows = await storage.getUsers();
    const list = rows.map((r) => ({
      userId: r['사용자ID'] ?? r.userId ?? '',
      name: r['이름'] ?? r.name ?? '',
      employeeCode: r['기사코드'] ?? r.employeeCode ?? '',
      team: r['소속팀'] ?? r.team ?? '',
      region: r['지역'] ?? r.region ?? '',
      role: r['역할'] ?? r.role ?? '신청자',
      active: r['활성화'] ?? r.active ?? 'Y',
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const body = req.body || {};
    const password = (body.password || '1234').toString().trim();
    const passwordHash = hashPassword(password || '1234');
    await storage.createUser(
      {
        userId: body.userId,
        name: body.name,
        employeeCode: body.employeeCode,
        team: body.team,
        region: body.region,
        role: body.role || '신청자',
        active: body.active === 'N' ? 'N' : 'Y',
      },
      passwordHash
    );
    res.json({ success: true, message: '사용자가 등록되었습니다.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/users/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const body = req.body || {};
    const passwordHash = body.password ? hashPassword(body.password) : null;
    await storage.updateUser(
      userId,
      {
        name: body.name,
        employeeCode: body.employeeCode,
        team: body.team,
        region: body.region,
        role: body.role,
        active: body.active,
      },
      passwordHash
    );
    res.json({ success: true, message: '사용자 정보가 수정되었습니다.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/** 배송지 전체 목록 (관리자용, 비활성 포함) */
router.get('/delivery-places', async (req, res) => {
  try {
    const list = await storage.getDeliveryPlacesAll();
    res.json(list);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/delivery-places', async (req, res) => {
  try {
    const body = req.body || {};
    await storage.createDeliveryPlace({
      name: body.name,
      team: body.team,
      address: body.address,
      contact: body.contact,
      manager: body.manager,
      active: body.active === 'N' ? 'N' : 'Y',
      remarks: body.remarks,
    });
    res.json({ success: true, message: '배송지가 등록되었습니다.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/delivery-places', async (req, res) => {
  try {
    const { originalName, originalTeam, ...body } = req.body || {};
    if (!originalName || !originalTeam) {
      return res.status(400).json({ success: false, message: 'originalName, originalTeam 필요' });
    }
    await storage.updateDeliveryPlace(originalName, originalTeam, {
      name: body.name,
      team: body.team,
      address: body.address,
      contact: body.contact,
      manager: body.manager,
      active: body.active,
      remarks: body.remarks,
    });
    res.json({ success: true, message: '배송지 정보가 수정되었습니다.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/** CSV 업로드 (본문 문자열) */
router.post('/import-csv', async (req, res) => {
  try {
    const csvContent = req.body?.csvContent ?? req.body?.content ?? '';
    const defaultHash = hashPassword('1234');
    const result = await storage.importFromCSV(csvContent, defaultHash);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/** Excel 마스터 파일 다운로드 */
router.get('/export-master', async (req, res) => {
  try {
    const { buffer, fileName } = await storage.exportMasterExcel();
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
