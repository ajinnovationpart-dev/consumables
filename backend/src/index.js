/**
 * 백엔드 진입점 (Express).
 * - 로컬 OneDrive 폴더 내 Excel(소모품발주.xlsx) + 첨부 파일 사용.
 * - 라우트: /api/auth, /api/requests, /api/codes, /api/admin, /api/attachments, /api/debug/*
 * - A_BACKEND_URL 설정 시: /api/a/* → A 백엔드(예: localhost:3000)로 프록시
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config, getExcelPath, getAttachmentsBasePath } from './config.js';
import { ensureExcelExists } from './services/localStorageService.js';
import authRoutes from './routes/auth.js';
import requestRoutes from './routes/requests.js';
import codeRoutes from './routes/codes.js';
import adminRoutes from './routes/admin.js';

const app = express();

// CORS: GitHub Pages 및 로컬 개발 출처 허용 (ngrok 등 외부 접근 시 preflight 통과)
const allowedOrigins = [
  'https://ajinnovationpart-dev.github.io',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];
const GITHUB_PAGES_ORIGIN = 'https://ajinnovationpart-dev.github.io';
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // same-origin or no Origin (e.g. Postman)
      if (origin === GITHUB_PAGES_ORIGIN || origin.startsWith(GITHUB_PAGES_ORIGIN + '/')) {
        console.log(`✅ CORS allowed (GitHub Pages): ${origin}`);
        return callback(null, true);
      }
      if (allowedOrigins.some((o) => origin === o || origin.startsWith(o + '/'))) return callback(null, true);
      // 로컬 개발: localhost/127.0.0.1 모든 포트 허용 (5174 등)
      if (origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) return callback(null, true);
      return callback(null, true); // ngrok·GitHub Pages 등 다른 출처도 허용
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  })
);

// A 프록시는 body 파서보다 먼저 (본문이 스트림으로 A에 전달되도록)
// A 프록시 경로: OPTIONS(프리플라이트)는 B에서 처리, CORS 헤더 명시 후 204 반환
if (config.aBackendUrl) {
  app.use('/api/a', (req, res, next) => {
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning, X-Requested-With');
        res.setHeader('Access-Control-Max-Age', '86400');
      }
      return res.status(204).end();
    }
    next();
  });
}

// A 백엔드(다른 레포, 3000) 프록시: /api/a/* → A
if (config.aBackendUrl) {
  app.use(
    '/api/a',
    createProxyMiddleware({
      target: config.aBackendUrl,
      changeOrigin: true,
      // /api/a/auth/login → /api/auth/login. (middleware가 /api/a 이후 경로만 넘기면 /auth/login → /api/auth/login)
      pathRewrite: (path) => {
        const rewritten = path.replace(/^\/api\/a\/api/, '/api').replace(/^\/api\/a/, '/api');
        return rewritten.startsWith('/api') ? rewritten : '/api' + rewritten;
      },
      on: {
        proxyReq(proxyReq, req) {
          proxyReq.setHeader('ngrok-skip-browser-warning', '1');
          // B가 받은 경로(req.originalUrl) → A로 보내는 경로(proxyReq.path)
          console.log(`[A Proxy] ${req.method} ${req.originalUrl} → A ${config.aBackendUrl}${proxyReq.path}`);
        },
        proxyRes(proxyRes, req, res) {
          const origin = req.headers.origin;
          if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
          }
          console.log(`[A Proxy] Response: ${proxyRes.statusCode} ${req.method} ${req.originalUrl}`);
        },
        error(err, req, res) {
          console.error('[A Proxy] Error:', err.message, req.method, req.originalUrl);
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'A Backend 연결 실패', error: err.message }));
          }
        },
      },
    })
  );
  const aUrl = config.aBackendUrl.replace(/\/$/, '');
  console.log(`✅ A Backend proxy enabled: /api/a → ${aUrl}/api`);
}

app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));

/** Excel 경로 확인용 (엑셀 시트 못 불러올 때 backend/.env 의 LOCAL_ONEDRIVE_PATH 와 실제 파일 위치 비교) */
app.get('/api/debug/excel-path', (req, res) => {
  const excelPath = getExcelPath();
  res.json({
    path: excelPath,
    exists: fs.existsSync(excelPath),
    folder: path.dirname(excelPath),
    folderExists: fs.existsSync(path.dirname(excelPath)),
  });
});

/** Excel에서 읽은 신청 건 수·시트 이름 확인 (데이터 안 나올 때 원인 파악용) */
app.get('/api/debug/requests-preview', async (req, res) => {
  try {
    const { getRequests } = await import('./services/localStorageService.js');
    const list = await getRequests({});
    const XLSX = (await import('xlsx')).default;
    const wb = fs.existsSync(getExcelPath()) ? XLSX.readFile(getExcelPath(), { cellDates: false }) : null;
    res.json({
      requestsCount: list.length,
      sheetNames: wb?.SheetNames || [],
      firstRequestNo: list[0]?.requestNo ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 첨부 파일 서빙 (신청번호별 폴더: 첨부 파일/{신청번호}/{파일명})
app.get('/api/attachments/:path(*)', (req, res, next) => {
  const subpath = req.params.path || '';
  if (subpath.includes('..')) return res.status(400).send('Invalid path');
  const filePath = path.join(getAttachmentsBasePath(), subpath);
  res.sendFile(filePath, (err) => {
    if (err) res.status(404).send('File not found');
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/codes', codeRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message || '서버 오류' });
});

app.listen(config.port, async () => {
  const excelPath = getExcelPath();
  console.log('Excel 경로:', excelPath);
  console.log('Excel 파일 존재:', fs.existsSync(excelPath));
  try {
    await ensureExcelExists();
    console.log('Excel 준비 완료 (폴더:', config.localPath, ')');
  } catch (e) {
    console.warn('Excel init:', e.message);
  }
  console.log(`✅ CORS allowed (GitHub Pages): ${GITHUB_PAGES_ORIGIN}`);
  console.log(`API running at http://localhost:${config.port}`);
});
