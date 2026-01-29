import { verifyToken } from '../services/authService.js';
import { config } from '../config.js';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.query?.token;
  if (!token) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: '세션이 만료되었습니다.' });
  }
  req.user = user;
  next();
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== config.roles.ADMIN) {
    return res.status(403).json({ success: false, message: '관리자만 접근할 수 있습니다.' });
  }
  next();
}
