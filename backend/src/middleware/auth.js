/**
 * 인증·권한 미들웨어.
 * - authMiddleware: Authorization Bearer JWT 검증, req.user 설정. 토큰 없음/만료 시 401.
 * - adminOnly: req.user.role === '관리자' 아니면 403. authMiddleware 다음에 사용.
 */
import { verifyToken } from '../services/authService.js';
import { config } from '../config.js';

/** JWT 검증 후 req.user 설정. 토큰은 Authorization: Bearer ... 또는 query.token */
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

/** 관리자 전용 라우트. authMiddleware 이후에 사용. 역할이 '관리자'가 아니면 403 */
export function adminOnly(req, res, next) {
  if (req.user?.role !== config.roles.ADMIN) {
    return res.status(403).json({ success: false, message: '관리자만 접근할 수 있습니다.' });
  }
  next();
}
