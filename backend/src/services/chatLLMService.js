/**
 * 챗봇 LLM 서비스 (Groq) - 무료 tier 대응.
 * - 컨텍스트 길이 제한(TPM 6000 이하), 요청 큐(초당 1회), 캐시(5분 TTL).
 * - 429 / Request too large 시 축소 컨텍스트로 1회 재시도.
 */
import crypto from 'crypto';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const INTERVAL_MS = 2000;       // 초당 0.5회 = 분당 30회 이하로 유지
const MAX_CONTEXT_CHARS = 5500; // TPM 6000 이하로 유지 (전체 요청 크기 감안)
const MAX_CONTEXT_CHARS_RETRY = 2800; // 재시도 시 더 축소
const MAX_TOKENS = 1024;
const TEMPERATURE = 0.3;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

let lastRequestAt = 0;
const queue = [];

function waitInQueue() {
  return new Promise((resolve) => {
    const run = () => {
      const now = Date.now();
      const elapsed = now - lastRequestAt;
      if (elapsed >= INTERVAL_MS || lastRequestAt === 0) {
        lastRequestAt = Date.now();
        resolve();
        if (queue.length > 0) queue.shift()();
      } else {
        setTimeout(() => queue.push(run), INTERVAL_MS - elapsed);
      }
    };
    queue.push(run);
    if (queue.length === 1) run();
  });
}

const replyCache = new Map();

function cacheKey(contextText, userMessage) {
  const preview = String(contextText || '').slice(0, 500);
  const msg = String(userMessage || '').trim();
  const raw = preview + '\n' + msg;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function getCached(key) {
  const entry = replyCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    replyCache.delete(key);
    return null;
  }
  return entry.reply;
}

function setCached(key, reply) {
  replyCache.set(key, { reply, ts: Date.now() });
  if (replyCache.size > 200) {
    const first = replyCache.keys().next().value;
    if (first !== undefined) replyCache.delete(first);
  }
}

function buildPrompt(contextText, userMessage, maxChars) {
  let ctx = String(contextText || '').trim();
  if (ctx.length > maxChars) {
    ctx = ctx.slice(0, maxChars) + '\n...(용량 제한으로 위 데이터만 참고하세요.)';
  }
  return `당신은 소모품 발주 시스템의 도우미 챗봇입니다.
아래 [참고 데이터]만 사용해서 질문에 친절하고 간결하게 답변하세요. "(로드 실패)" 표시된 항목은 해당 데이터를 사용할 수 없다고 안내하세요. 데이터에 없는 내용은 "해당 정보가 없습니다" 등으로 답하고 추측하지 마세요.

[참고 데이터]
${ctx}

[사용자 질문]
${String(userMessage || '').trim()}

[답변] (한국어, 요점 정리, 불릿 가능):`;
}

async function callGroq(prompt) {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    return '챗봇을 사용하려면 .env에 GROQ_API_KEY를 설정해 주세요. Groq Console(https://console.groq.com)에서 발급할 수 있습니다.';
  }
  const model = process.env.GROQ_CHAT_MODEL || 'llama-3.1-8b-instant';
  const systemContent = 'You are a helpful assistant for a consumables ordering system. Answer in Korean based only on the provided context.';
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt },
      ],
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
    }),
  });
  const data = await res.json().catch(() => ({}));
  const errMsg = (data?.error?.message || res.statusText || '').toLowerCase();
  if (res.status === 429) {
    return { _retry: true, _rateLimit: true };
  }
  if (res.status === 400 && (errMsg.includes('too large') || errMsg.includes('tpm') || errMsg.includes('token'))) {
    return { _retry: true, _reduceContext: true };
  }
  if (!res.ok) {
    throw new Error(data?.error?.message || res.statusText || 'Groq API error');
  }
  const reply = data?.choices?.[0]?.message?.content?.trim() || '';
  return reply;
}

/**
 * @param {string} systemContext - 역할별로 구성한 참고 데이터 문자열
 * @param {string} userMessage - 사용자 질문
 * @returns {Promise<string>} 답변 문자열
 */
export async function getChatReply(systemContext, userMessage) {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    return '챗봇을 사용하려면 .env에 GROQ_API_KEY를 설정해 주세요. Groq Console(https://console.groq.com)에서 발급할 수 있습니다.';
  }

  const key = cacheKey(systemContext, userMessage);
  const cached = getCached(key);
  if (cached != null) return cached;

  await waitInQueue();

  let maxChars = MAX_CONTEXT_CHARS;
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    const prompt = buildPrompt(systemContext, userMessage, maxChars);
    let result = await callGroq(prompt);

    if (typeof result === 'string') {
      setCached(key, result);
      return result;
    }

    if (result && typeof result === 'object' && result._retry) {
      if (result._reduceContext) {
        maxChars = MAX_CONTEXT_CHARS_RETRY;
        attempt++;
        continue;
      }
      if (result._rateLimit) {
        await new Promise((r) => setTimeout(r, 2000));
        attempt++;
        continue;
      }
    }

    attempt++;
  }

  return '요청 한도 또는 메시지 크기 제한에 걸렸습니다. 잠시 후 다시 시도해 주세요.';
}
