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

/** 관리자용 컨텍스트: 신청 목록(최근 50), 사용자 요약, 담당자, 지역/팀, 배송지 요약 */
async function buildAdminContext() {
  const blocks = [];

  try {
    const list = await storage.getRequests({});
    const recent = list.slice(0, 50);
    const lines = recent.map(
      (r) =>
        `신청번호 ${r.requestNo} | 신청일 ${toDateStr(r.requestDate)} | ${r.requesterName ?? '-'} | ${r.team ?? '-'} | ${r.region ?? '-'} | ${r.itemName ?? '-'} | 수량 ${r.quantity ?? '-'} | 상태 ${r.status ?? '-'} | 담당자 ${r.handler ?? '-'}`
    );
    blocks.push('=== 최근 신청 목록 (최대 50건) ===\n' + (lines.length ? lines.join('\n') : '(없음)'));
  } catch (e) {
    blocks.push('=== 최근 신청 목록 ===\n(로드 실패)');
  }

  try {
    const users = await storage.getUsers();
    const summary = users.map((u) => `ID: ${u['사용자ID'] ?? u.userId} | 이름: ${u['이름'] ?? u.name} | 팀: ${u['소속팀'] ?? u.team} | 지역: ${u['지역'] ?? u.region} | 역할: ${u['역할'] ?? u.role} | 활성화: ${u['활성화'] ?? u.active ?? 'Y'}`).join('\n');
    blocks.push('=== 사용자 목록 ===\n' + (summary || '(없음)'));
  } catch (e) {
    blocks.push('=== 사용자 목록 ===\n(로드 실패)');
  }

  try {
    const handlers = await storage.getHandlers();
    const names = handlers.map((h) => h.name).filter(Boolean);
    blocks.push('=== 담당자(관리자) 목록 ===\n' + (names.length ? names.join(', ') : '(없음)'));
  } catch (e) {
    blocks.push('=== 담당자 목록 ===\n(로드 실패)');
  }

  try {
    const regions = await storage.getRegions();
    const regionStr = regions.map((r) => r.name ?? r.code ?? '').filter(Boolean).join(', ');
    blocks.push('=== 지역 목록 ===\n' + (regionStr || '(없음)'));
  } catch (e) {
    blocks.push('=== 지역 목록 ===\n(로드 실패)');
  }

  try {
    const teams = await storage.getTeams();
    const teamStr = teams.map((t) => `${t.name ?? t.code ?? ''}`).filter(Boolean).join(', ');
    blocks.push('=== 소속팀 목록 ===\n' + (teamStr || '(없음)'));
  } catch (e) {
    blocks.push('=== 소속팀 목록 ===\n(로드 실패)');
  }

  try {
    const places = await storage.getDeliveryPlacesAll();
    const placeLines = (places || []).slice(0, 30).map((p) => `배송지: ${p['배송지명'] ?? p.name ?? '-'} | 팀: ${p['소속팀'] ?? p.team ?? '-'} | 주소: ${(p['주소'] ?? p.address ?? '').slice(0, 40)}`);
    blocks.push('=== 배송지 목록 (상위 30건) ===\n' + (placeLines.length ? placeLines.join('\n') : '(없음)'));
  } catch (e) {
    blocks.push('=== 배송지 목록 ===\n(로드 실패)');
  }

  return blocks.join('\n\n');
}

/** 신청자용 컨텍스트: 본인 신청 목록만 */
async function buildUserContext(userId) {
  const blocks = [];
  try {
    const list = await storage.getRequests({ requesterEmail: userId });
    const lines = list.map(
      (r) =>
        `신청번호 ${r.requestNo} | 신청일 ${toDateStr(r.requestDate)} | 품명 ${r.itemName ?? '-'} | 수량 ${r.quantity ?? '-'} | 상태 ${r.status ?? '-'} | 담당자 ${r.handler ?? '-'} | 예상납기 ${toDateStr(r.expectedDeliveryDate)}`
    );
    blocks.push('=== 내 신청 목록 ===\n' + (lines.length ? lines.join('\n') : '(없음)'));
  } catch (e) {
    blocks.push('=== 내 신청 목록 ===\n(로드 실패)');
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
