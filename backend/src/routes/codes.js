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

/** 담당자 목록: 사용자관리 시트에서 역할=관리자·활성화된 사용자만 반환. 예외 시에만 기본 목록 */
const FALLBACK_HANDLERS = [{ name: '유하형' }, { name: '김응규' }, { name: '박유민' }, { name: '손현우' }];
router.get('/handlers', async (req, res) => {
  try {
    const list = await storage.getHandlers();
    res.json(Array.isArray(list) ? list : FALLBACK_HANDLERS);
  } catch (err) {
    console.error('[GET /codes/handlers]', err.message);
    res.status(200).json(FALLBACK_HANDLERS);
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
