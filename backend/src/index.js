import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
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
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // same-origin or no Origin (e.g. Postman)
      if (allowedOrigins.some((o) => origin === o || origin.startsWith(o + '/'))) return callback(null, true);
      return callback(null, true); // ngrok 등 다른 출처도 허용 (배포 시 필요하면 위 목록만 허용하도록 변경)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  })
);
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
  console.log(`API running at http://localhost:${config.port}`);
});
