import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as requestService from '../services/requestService.js';
import * as storage from '../services/localStorageService.js';
import { config } from '../config.js';

const router = Router();

router.use(authMiddleware);

router.get('/my', async (req, res) => {
  try {
    const list = await requestService.getMyRequests(req.user.userId);
    res.json(list);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;
    const data = await requestService.getDashboardData(req.user, { startDate, endDate });
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    if (req.user.role !== config.roles.ADMIN) {
      return res.status(403).json({ success: false, message: '관리자만 접근할 수 있습니다.' });
    }
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const list = await storage.getRequests(filter);
    res.json(list);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:requestNo', async (req, res) => {
  try {
    const request = await storage.getRequestById(req.params.requestNo);
    if (!request) return res.status(404).json({ success: false, message: '신청 건을 찾을 수 없습니다.' });
    const isAdmin = req.user.role === config.roles.ADMIN;
    if (!isAdmin && request.requesterEmail !== req.user.userId) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    res.json(request);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const result = await requestService.createRequest(req.body, req.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:requestNo/status', async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const result = await requestService.updateStatus(req.params.requestNo, status, remarks, req.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
