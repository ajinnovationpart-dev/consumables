/**
 * 챗봇 LLM 서비스 (Groq).
 * - getChatReply(systemContext, userMessage): 컨텍스트+질문으로 답변 생성.
 * - 속도 제한(900ms 간격), 429 시 1회 재시도.
 */
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MIN_INTERVAL_MS = 900;
const MAX_CONTEXT_CHARS = 22000;
const MAX_TOKENS = 1024;
const TEMPERATURE = 0.3;

let lastRequestAt = 0;
const queue = [];

function waitRateLimit() {
  return new Promise((resolve) => {
    const run = () => {
      const now = Date.now();
      const elapsed = now - lastRequestAt;
      if (elapsed >= MIN_INTERVAL_MS || lastRequestAt === 0) {
        lastRequestAt = Date.now();
        resolve();
        if (queue.length > 0) queue.shift()();
      } else {
        setTimeout(() => queue.push(run), MIN_INTERVAL_MS - elapsed);
      }
    };
    queue.push(run);
    if (queue.length === 1) run();
  });
}

function buildPrompt(contextText, userMessage) {
  let ctx = String(contextText || '').trim();
  if (ctx.length > MAX_CONTEXT_CHARS) {
    ctx = ctx.slice(0, MAX_CONTEXT_CHARS) + '\n...(용량 제한으로 위 데이터만 참고하세요. 목록이 잘렸을 수 있습니다.)';
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
  if (res.status === 429) {
    return { _rateLimit: true, message: data?.error?.message || 'Rate limit' };
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
  const prompt = buildPrompt(systemContext, userMessage);
  await waitRateLimit();
  let result = await callGroq(prompt);
  if (result && typeof result === 'object' && result._rateLimit) {
    await new Promise((r) => setTimeout(r, 2000));
    result = await callGroq(prompt);
    if (result && typeof result === 'object' && result._rateLimit) {
      return '요청 한도를 초과했습니다. 잠시 후(약 1분) 다시 시도해 주세요.';
    }
  }
  if (typeof result !== 'string') {
    return '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }
  return result;
}
