/**
 * 챗봇 플로팅 UI.
 * - 로그인 시에만 우측 하단 버튼 표시. 클릭 시 패널 열림.
 * - 관리자: 전체 신청·사용자·담당자·배송지 등 컨텍스트로 답변.
 * - 사용자: 내 신청 목록 기준으로 답변.
 */
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { chat } from '../services/api';

const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 480;
const BUTTON_SIZE = 56;
const BOTTOM = 24;
const RIGHT = 24;

export default function ChatBot() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const listRef = useRef(null);

  const isAuthenticated = !!user;
  if (!isAuthenticated) return null;

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const res = await chat.post(text);
      const reply = res?.data?.reply ?? '답변을 불러올 수 없습니다.';
      setMessages((prev) => [...prev, { role: 'bot', content: reply }]);
    } catch (err) {
      const msg = err?.data?.message || err?.message || '응답을 가져오는 중 오류가 발생했습니다.';
      setMessages((prev) => [...prev, { role: 'bot', content: msg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="챗봇 열기"
        style={{
          position: 'fixed',
          bottom: BOTTOM,
          right: RIGHT,
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--bs-primary, #0d6efd)',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* 패널 */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            bottom: BOTTOM + BUTTON_SIZE + 8,
            right: RIGHT,
            width: Math.min(PANEL_WIDTH, typeof window !== 'undefined' ? window.innerWidth - 48 : PANEL_WIDTH),
            maxWidth: 'calc(100vw - 48px)',
            height: PANEL_HEIGHT,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--aj-gray-100, #f5f5f5)',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '1rem' }}>발주 도우미</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="닫기"
              style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', lineHeight: 1 }}
            >
              ×
            </button>
          </div>

          <div
            ref={listRef}
            style={{
              flex: 1,
              overflow: 'auto',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {messages.length === 0 && (
              <div style={{ color: '#666', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                신청·상태·담당자·배송지 등 궁금한 것을 자연어로 질문해 보세요.
                {'\n'}예: 오늘 접수된 신청이 몇 건이야? / 내 신청 상태 알려줘
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '8px 12px',
                  borderRadius: 12,
                  background: m.role === 'user' ? '#1890ff' : '#f0f0f0',
                  color: m.role === 'user' ? '#fff' : '#333',
                  fontSize: '0.875rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', padding: '8px 12px', background: '#f0f0f0', borderRadius: 12 }}>
                <span style={{ fontSize: '0.875rem' }}>답변 생성 중...</span>
              </div>
            )}
          </div>

          <div style={{ padding: 8, borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="질문 입력..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: '0.875rem',
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                padding: '8px 16px',
                background: 'var(--bs-primary, #0d6efd)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
              }}
            >
              전송
            </button>
          </div>
        </div>
      )}
    </>
  );
}
