/**
 * 코드/마스터 라우트: /api/codes (authMiddleware).
 * - GET /regions: 지역 목록.
 * - GET /teams: 소속팀 목록.
 * - GET /delivery-places?team=: 팀별 배송지(team 없으면 전체).
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as storage from '../services/localStorageService.js';

const router = Router();

router.use(authMiddleware);

router.get('/regions', async (req, res) => {
  try {
    const regions = await storage.getRegions();
    res.json(regions);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/teams', async (req, res) => {
  try {
    const teams = await storage.getTeams();
    res.json(teams);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/delivery-places', async (req, res) => {
  try {
    const team = req.query.team || null;
    const list = await storage.getDeliveryPlaces(team);
    res.json(list);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
