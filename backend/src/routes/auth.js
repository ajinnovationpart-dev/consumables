import { Router } from 'express';
import * as authService from '../services/authService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    const result = await authService.login(userId, password);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || '로그인 중 오류가 발생했습니다.' });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: {
      userId: req.user.userId,
      name: req.user.name,
      role: req.user.role,
      team: req.user.team,
    },
  });
});

router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    const result = await authService.changePassword(userId, oldPassword, newPassword, req.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || '비밀번호 변경 중 오류가 발생했습니다.' });
  }
});

export default router;
