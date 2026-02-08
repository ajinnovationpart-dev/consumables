/**
 * 백엔드 전역 설정.
 * - .env 기반: LOCAL_ONEDRIVE_PATH, EXCEL_FILE, ATTACHMENTS_FOLDER, PORT, JWT_*, 상태/역할 상수.
 * - getExcelPath(), getAttachmentsBasePath(), getAttachmentFolderForRequest() 제공.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 로컬 OneDrive 경로 (예: C:\Users\User\OneDrive - AJ네트웍스\소모품발주)
const defaultBasePath = process.platform === 'win32'
  ? path.join('C:', 'Users', 'User', 'OneDrive - AJ네트웍스', '소모품발주')
  : path.join(process.env.HOME || '', 'OneDrive - AJ네트웍스', '소모품발주');

export const config = {
  port: process.env.PORT || 3030,
  nodeEnv: process.env.NODE_ENV || 'development',

  // A 백엔드(다른 레포, 예: hr-sample) 주소. 있으면 /api/a → A로 프록시
  aBackendUrl: process.env.A_BACKEND_URL || '',

  // 로컬 OneDrive 폴더 경로
  localPath: process.env.LOCAL_ONEDRIVE_PATH || defaultBasePath,
  // Excel 파일명 (같은 폴더 내)
  excelFile: process.env.EXCEL_FILE || '소모품발주.xlsx',
  // 첨부 파일 저장 폴더명 (신청번호별 하위 폴더 생성)
  attachmentsFolder: process.env.ATTACHMENTS_FOLDER || '첨부 파일',

  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  status: {
    REQUESTED: '접수중',
    ORDERING: '접수완료',
    COMPLETED_CONFIRMED: '발주완료(납기확인)',
    COMPLETED_PENDING: '발주완료(납기미정)',
    FINISHED: '처리완료',
    CANCELLED: '접수취소',
  },

  roles: {
    USER: '신청자',
    ADMIN: '관리자',
  },

  file: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
  },
};

// Excel 전체 경로
export function getExcelPath() {
  return path.join(config.localPath, config.excelFile);
}

// 첨부 파일 루트 경로 (신청번호별 폴더가 여기 아래 생성됨)
export function getAttachmentsBasePath() {
  return path.join(config.localPath, config.attachmentsFolder);
}

// 신청번호별 첨부 폴더 경로
export function getAttachmentFolderForRequest(requestNo) {
  return path.join(config.localPath, config.attachmentsFolder, String(requestNo));
}
