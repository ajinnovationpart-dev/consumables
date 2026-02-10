/**
 * 챗봇 API: POST /api/chat
 * - 인증 필수. 역할(관리자/신청자)에 따라 컨텍스트 구성 후 LLM 답변 반환.
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { config } from '../config.js';
import * as storage from '../services/localStorageService.js';
import { getChatReply } from '../services/chatLLMService.js';

const router = Router();
router.use(authMiddleware);

function toDateStr(val) {
  if (val == null || val === '') return '-';
  const s = String(val).trim();
  if (s.length >= 10) return s.slice(0, 10);
  return s;
}

/** 관리자용 컨텍스트: TPM 제한 대비 축소(최근 20건, 사용자 15명, 배송지 15건) */
async function buildAdminContext() {
  const blocks = [];

  try {
    const list = await storage.getRequests({});
    const recent = list.slice(0, 20);
    const lines = recent.map(
      (r) =>
        `${r.requestNo} ${toDateStr(r.requestDate)} ${r.requesterName ?? '-'} ${r.team ?? '-'} ${r.itemName ?? '-'} ${r.quantity ?? '-'} ${r.status ?? '-'} ${r.handler ?? '-'}`
    );
    blocks.push('=== 최근 신청(20건) ===\n' + (lines.length ? lines.join('\n') : '(없음)'));
  } catch (e) {
    blocks.push('=== 최근 신청 ===\n(로드 실패)');
  }

  try {
    const users = await storage.getUsers();
    const summary = users.slice(0, 15).map((u) => `${u['사용자ID'] ?? u.userId} ${u['이름'] ?? u.name} ${u['소속팀'] ?? u.team} ${u['역할'] ?? u.role}`).join('\n');
    blocks.push('=== 사용자(15명) ===\n' + (summary || '(없음)'));
  } catch (e) {
    blocks.push('=== 사용자 ===\n(로드 실패)');
  }

  try {
    const handlers = await storage.getHandlers();
    const names = handlers.map((h) => h.name).filter(Boolean);
    blocks.push('=== 담당자 ===\n' + (names.length ? names.join(', ') : '(없음)'));
  } catch (e) {
    blocks.push('=== 담당자 ===\n(로드 실패)');
  }

  try {
    const regions = await storage.getRegions();
    const regionStr = regions.map((r) => r.name ?? r.code ?? '').filter(Boolean).join(', ');
    blocks.push('=== 지역 ===\n' + (regionStr || '(없음)'));
  } catch (e) {
    blocks.push('=== 지역 ===\n(로드 실패)');
  }

  try {
    const teams = await storage.getTeams();
    const teamStr = teams.slice(0, 20).map((t) => t.name ?? t.code ?? '').filter(Boolean).join(', ');
    blocks.push('=== 소속팀 ===\n' + (teamStr || '(없음)'));
  } catch (e) {
    blocks.push('=== 소속팀 ===\n(로드 실패)');
  }

  try {
    const places = await storage.getDeliveryPlacesAll();
    const placeLines = (places || []).slice(0, 15).map((p) => `${p['배송지명'] ?? p.name ?? '-'} ${p['소속팀'] ?? p.team ?? '-'}`);
    blocks.push('=== 배송지(15건) ===\n' + (placeLines.length ? placeLines.join('\n') : '(없음)'));
  } catch (e) {
    blocks.push('=== 배송지 ===\n(로드 실패)');
  }

  return blocks.join('\n\n');
}

/** 신청자용 컨텍스트: 본인 신청만, 최근 25건으로 제한(토큰 절약) */
async function buildUserContext(userId) {
  const blocks = [];
  try {
    const list = await storage.getRequests({ requesterEmail: userId });
    const lines = list.slice(0, 25).map(
      (r) =>
        `${r.requestNo} ${toDateStr(r.requestDate)} ${r.itemName ?? '-'} ${r.quantity ?? '-'} ${r.status ?? '-'} ${r.handler ?? '-'}`
    );
    blocks.push('=== 내 신청 ===\n' + (lines.length ? lines.join('\n') : '(없음)'));
  } catch (e) {
    blocks.push('=== 내 신청 ===\n(로드 실패)');
  }
  return blocks.join('\n\n');
}

router.post('/', async (req, res) => {
  try {
    const message = (req.body?.message ?? '').trim();
    if (!message) {
      return res.status(400).json({ success: false, message: '질문을 입력해 주세요.' });
    }
    const user = req.user;
    const isAdmin = user?.role === config.roles.ADMIN;
    const contextText = isAdmin ? await buildAdminContext() : await buildUserContext(user?.userId ?? '');
    const reply = await getChatReply(contextText, message);
    return res.json({ success: true, data: { reply } });
  } catch (err) {
    console.error('[POST /api/chat]', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || '챗봇 응답 생성에 실패했습니다.',
    });
  }
});

export default router;
