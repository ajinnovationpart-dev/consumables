import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import * as storage from './localStorageService.js';

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password, 'utf8').digest('hex');
}

export function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

export async function login(userId, password) {
  const user = await storage.getUserById(userId);
  if (!user) {
    return { success: false, message: '사용자 ID 또는 비밀번호가 올바르지 않습니다.' };
  }
  const uid = user['사용자ID'] ?? user.userId;
  const active = user['활성화'] ?? user.active;
  if (active !== 'Y') {
    return { success: false, message: '비활성화된 계정입니다.' };
  }
  const storedHash = user['비밀번호해시'] ?? user.passwordHash;
  if (!verifyPassword(password, storedHash)) {
    return { success: false, message: '사용자 ID 또는 비밀번호가 올바르지 않습니다.' };
  }
  const role = user['역할'] ?? user.role;
  const name = user['이름'] ?? user.name;
  const team = user['소속팀'] ?? user.team;
  const employeeCode = user['기사코드'] ?? user.employeeCode ?? '';
  const region = user['지역'] ?? user.region ?? '';
  const token = jwt.sign(
    { userId: uid, role, name, team, employeeCode, region },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
  await storage.appendLog('INFO', '로그인', null, uid);
  return {
    success: true,
    token,
    user: { userId: uid, name, role, team, employeeCode, region },
    redirectUrl: role === config.roles.ADMIN ? '/admin' : '/dashboard',
  };
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch {
    return null;
  }
}

export async function changePassword(userId, oldPassword, newPassword, tokenUser) {
  if (tokenUser.userId !== userId) {
    return { success: false, message: '권한이 없습니다.' };
  }
  const user = await storage.getUserById(userId);
  if (!user) return { success: false, message: '사용자를 찾을 수 없습니다.' };
  const storedHash = user['비밀번호해시'] ?? user.passwordHash;
  if (storedHash && !verifyPassword(oldPassword, storedHash)) {
    return { success: false, message: '기존 비밀번호가 올바르지 않습니다.' };
  }
  await storage.updateUserPassword(userId, hashPassword(newPassword));
  await storage.appendLog('INFO', '비밀번호 변경', null, userId);
  return { success: true, message: '비밀번호가 변경되었습니다.' };
}
