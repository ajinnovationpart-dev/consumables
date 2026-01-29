import express from 'express';
import path from 'path';
import cors from 'cors';
import { config, getAttachmentsBasePath } from './config.js';
import { ensureExcelExists } from './services/localStorageService.js';
import authRoutes from './routes/auth.js';
import requestRoutes from './routes/requests.js';
import codeRoutes from './routes/codes.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));

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

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message || '서버 오류' });
});

app.listen(config.port, async () => {
  try {
    await ensureExcelExists();
    console.log('Excel file ready:', config.localPath);
  } catch (e) {
    console.warn('Excel init:', e.message);
  }
  console.log(`API running at http://localhost:${config.port}`);
});
