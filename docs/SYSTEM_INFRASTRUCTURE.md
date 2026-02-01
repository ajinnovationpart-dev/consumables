<!--
  목적: 로컬(OneDrive + Node 백엔드) + GitHub(React 프론트) 구조의 전체 인프라·로직 설명.
        아키텍처, 데이터 레이어(Excel/첨부), 인증·API·배포·환경변수·보안.
  관련: 설정·체크리스트 → CHECKLIST.md, 배포·설정 → LOCAL_BACKEND_GITHUB_FRONTEND.md
-->

# 소모품 발주 시스템 — 전체 인프라 및 로직

이 문서는 **로컬(OneDrive + Node 백엔드) + GitHub(React 프론트)** 구조의 소모품 발주 시스템 전체 인프라와 동작 로직을 설명합니다.

---

## 목차

1. [전체 아키텍처](#1-전체-아키텍처)
2. [인프라 구성](#2-인프라-구성)
3. [데이터 레이어](#3-데이터-레이어)
4. [인증·권한 로직](#4-인증권한-로직)
5. [백엔드 API 구조](#5-백엔드-api-구조)
6. [프론트엔드 구조](#6-프론트엔드-구조)
7. [배포 파이프라인](#7-배포-파이프라인)
8. [환경 변수 및 설정](#8-환경-변수-및-설정)
9. [보안 및 CORS](#9-보안-및-cors)
10. [요약 다이어그램](#10-요약-다이어그램)

---

## 1. 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           사용자 브라우저                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  프론트엔드 (React SPA)                                                    │
│  • 배포: GitHub Pages  →  https://ajinnovationpart-dev.github.io/consumables/  │
│  • 로컬 개발: Vite dev server  →  http://localhost:5173                      │
│  • API 호출: VITE_API_URL 또는 /api(프록시) → 백엔드                            │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ HTTP/JSON (Bearer JWT)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  백엔드 (Node.js + Express)                                               │
│  • 실행: 로컬 PC  →  http://localhost:3030                                  │
│  • 외부 노출(선택): ngrok / 포트포워딩 / VPN  →  VITE_API_URL에 설정            │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ 파일 시스템 읽기/쓰기
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  데이터 (로컬 OneDrive 폴더)                                               │
│  • Excel: 소모품발주.xlsx (신청내역, 사용자관리, 코드관리, 배송지관리, 로그)        │
│  • 첨부 파일: 첨부 파일/{신청번호}/{파일명}                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

- **프론트**: 정적 호스팅(GitHub Pages) 또는 로컬 개발 서버. 상태 없음(Stateless).
- **백엔드**: 한 대의 로컬 PC에서만 실행. 데이터는 해당 PC의 OneDrive 폴더에만 존재.
- **데이터**: DB 없음. Excel 파일 + 첨부 디렉터리로 모든 영구 데이터 관리.

---

## 2. 인프라 구성

| 구분 | 구성 요소 | 설명 |
|------|-----------|------|
| **프론트 호스팅** | GitHub Pages | 저장소 `main` 브랜치 → GitHub Actions로 빌드 후 Pages에 배포. 서브경로 `/consumables/` 사용. |
| **프론트 빌드** | Vite (React) | `frontend/`에서 `npm run build` → `frontend/dist/` 생성. base path `/consumables/`로 고정. |
| **백엔드 실행** | Node.js (Express) | `backend/`에서 `npm run dev` → 포트 3030. OneDrive 폴더 경로는 `.env`의 `LOCAL_ONEDRIVE_PATH`. |
| **외부 접근** | ngrok 등 (선택) | 로컬 3030을 공개 URL로 터널링. 해당 URL을 GitHub Secrets `VITE_API_URL`에 넣어 프론트 빌드 시 주입. |
| **데이터 위치** | 로컬 디스크 | OneDrive 동기화 폴더 내 Excel + 첨부 폴더. 백엔드가 직접 파일 읽기/쓰기. |

- GitHub에는 **프론트 소스·빌드 결과**만 있고, **Excel·첨부 파일·비밀번호 해시**는 올라가지 않음.
- 백엔드는 **항상 OneDrive가 있는 PC**에서 실행해야 함.

---

## 3. 데이터 레이어

### 3.1 Excel 파일 (`소모품발주.xlsx`)

- **경로**: `{LOCAL_ONEDRIVE_PATH}/{EXCEL_FILE}` (기본: OneDrive 내 `소모품발주/소모품발주.xlsx`).
- **역할**: 모든 마스터·트랜잭션 데이터 저장. DB 대신 사용.

| 시트명 | 용도 |
|--------|------|
| 신청내역 | 발주 신청 건별 데이터 (신청번호, 신청일시, 신청자, 품명, 상태 등) |
| 사용자관리 | 사용자 ID, 비밀번호 해시, 이름, 기사코드, 소속팀, 지역, 역할, 활성화 |
| 코드관리 | 지역·소속팀·상태 등 코드 목록 |
| 배송지관리 | 배송지명, 소속팀, 주소, 연락처, 담당자, 활성화, 비고 |
| 로그 | 일시, 레벨, 액션, 신청번호, 사용자, 상세내용 |

- **읽기/쓰기**: `backend/src/services/localStorageService.js`에서 `xlsx` 라이브러리로 시트 단위 읽기·행 추가/수정.
- **비밀번호**: SHA-256 해시로 저장. 평문 저장 없음.

### 3.2 첨부 파일

- **경로**: `{LOCAL_ONEDRIVE_PATH}/{ATTACHMENTS_FOLDER}/{신청번호}/{파일명}` (기본: `첨부 파일/{신청번호}/`).
- **서빙**: 백엔드 `GET /api/attachments/:path(*)`로 제공. 프론트는 `getAttachmentUrl(photoUrl)`로 전체 URL 조합.

### 3.3 데이터가 없는 경우

- Excel 파일이 없으면 `ensureExcelExists()`가 기본 시트 구조만 갖춘 새 파일을 생성.
- OneDrive 폴더가 없거나 경로가 잘못되면 API에서 오류 반환. `GET /api/debug/excel-path`, `GET /api/debug/requests-preview`로 경로·시트·건수 확인 가능.

---

## 4. 인증·권한 로직

### 4.1 인증 흐름

1. **로그인**: `POST /api/auth/login`에 `userId`, `password` 전달.
2. **검증**: `authService.login()` → 사용자관리 시트에서 사용자 조회, 활성화 여부 확인, 비밀번호 해시 비교.
3. **토큰 발급**: 검증 성공 시 JWT 발급 (`jwt.sign`). payload: `userId`, `role`, `name`, `team`, `employeeCode`, `region`.
4. **클라이언트**: 응답의 `token`을 `sessionStorage`에 저장. 이후 API 요청 시 `Authorization: Bearer {token}` 헤더로 전달.
5. **유지**: 페이지 새로고침 시 `GET /api/auth/me`로 토큰 검증 후 사용자 정보 복원.

### 4.2 권한

| 역할 | config.roles | 접근 가능 경로 |
|------|----------------|----------------|
| 신청자 | USER | 대시보드, 신청 등록, 내 신청 목록/상세, 내 정보, 코드(지역/팀/배송지) |
| 관리자 | ADMIN | 위 전부 + 관리자 대시보드, 신청관리(목록/상세), 기준정보(사용자/배송지), 통계 |

- **미들웨어**: `authMiddleware` — 토큰 검증, `req.user` 설정.  
  `adminOnly` — `req.user.role === '관리자'` 아니면 403.
- **프론트**: `PrivateRoute`에서 `useAuth()`로 `user` 확인. `adminOnly`일 때 `user.role !== '관리자'`면 `/dashboard`로 리다이렉트.

### 4.3 비밀번호 변경

- `POST /api/auth/change-password`: 본인만 가능(`tokenUser.userId === userId`).  
  기존 비밀번호 확인 후 새 비밀번호 해시로 사용자관리 시트 갱신.

---

## 5. 백엔드 API 구조

### 5.1 진입점 및 미들웨어 (`backend/src/index.js`)

- **CORS**: GitHub Pages 출처(`https://ajinnovationpart-dev.github.io`), localhost, ngrok 등 허용. `credentials: true`, 필요 시 `ngrok-skip-browser-warning` 헤더 허용.
- **본문**: `express.json({ limit: '10mb' })`.
- **라우트 마운트**:
  - `GET /health` — 서버 생존 확인
  - `GET /api/debug/excel-path` — Excel 경로·존재 여부 (디버그)
  - `GET /api/debug/requests-preview` — 신청 건수·시트 이름 등 (디버그)
  - `GET /api/attachments/:path(*)` — 첨부 파일 서빙
  - `app.use('/api/auth', authRoutes)`
  - `app.use('/api/requests', requestRoutes)`
  - `app.use('/api/codes', codeRoutes)`
  - `app.use('/api/admin', adminRoutes)`

### 5.2 라우트별 요약

| 접두어 | 인증 | 역할 제한 | 주요 용도 |
|--------|------|-----------|-----------|
| `/api/auth` | login 제외 후 선택 | - | 로그인, /me, 비밀번호 변경 |
| `/api/requests` | authMiddleware | - | 내 신청, 전체 목록, 대시보드, 상세, 신청 생성, 상태 변경 |
| `/api/codes` | authMiddleware | - | 지역, 소속팀, 배송지(공개용) 목록 |
| `/api/admin` | authMiddleware + adminOnly | 관리자 | 사용자 CRUD, 배송지 CRUD, CSV 가져오기, 마스터 Excel 내보내기 |

- **신청자**: 자신의 신청만 조회/생성. 관리자는 전체 조회·상태 변경.
- **데이터 소스**: 모두 `localStorageService`를 통해 Excel/파일 시스템 접근.

---

## 6. 프론트엔드 구조

### 6.1 기술 스택

- **React 18**, **Vite**, **React Router v6**.
- **상태**: 전역 사용자/토큰은 `AuthContext` (sessionStorage + `/api/auth/me`).
- **API 클라이언트**: `frontend/src/services/api.js` — `API_BASE`(환경 변수 `VITE_API_URL` 또는 `/api`), `Authorization: Bearer`, `ngrok-skip-browser-warning` 처리.

### 6.2 라우팅 (React Router)

- **base path**: `import.meta.env.BASE_URL` → 빌드 시 `/consumables/`.
- **경로**:
  - `/login` — 로그인
  - `/dashboard` — 사용자 대시보드
  - `/new-request` — 신청 등록
  - `/my-requests` — 내 신청 목록
  - `/request/:requestNo` — 신청 상세
  - `/my-info` — 내 정보·비밀번호 변경
  - `/admin` — 관리자 대시보드
  - `/admin/requests` — 신청관리
  - `/admin/master` — 기준정보(사용자/배송지)
  - `/admin/statistics` — 통계
  - `/` → `/dashboard`, `*` → `/dashboard`.

### 6.3 GitHub Pages SPA 처리

- GitHub Pages는 물리 파일만 제공. `/consumables/admin/requests` 같은 경로에는 파일이 없어 404 발생.
- **처리 방식**:
  1. Vite 빌드 시 `spa404Plugin`이 `dist/404.html` 생성.
  2. 404 발생 시 404.html 로드 → `sessionStorage.setItem('redirect', location.href)` 후 `location.replace(origin + '/consumables/')`.
  3. 루트에서 index.html 로드 → React 앱 기동 후 `App.jsx`의 `useEffect`에서 `sessionStorage.redirect`를 읽어 해당 경로로 `navigate(path, { replace: true })`.

---

## 7. 배포 파이프라인

### 7.1 GitHub Actions (`.github/workflows/deploy-pages.yml`)

- **트리거**: `main` 브랜치 push 또는 `workflow_dispatch`.
- **권한**: `contents: read`, `pages: write`, `id-token: write`.
- **Job 1 — build**:
  - 체크아웃 → Node 20 → `frontend`에서 `npm install` → `npm run build`.
  - 환경 변수: `VITE_API_URL`(Secrets), `VITE_BASE_PATH: '/consumables/'`.
  - 산출물: `frontend/dist`를 `upload-pages-artifact`로 업로드.
- **Job 2 — deploy**:
  - `deploy-pages` 액션으로 업로드된 artifact를 GitHub Pages 환경에 배포.

### 7.2 GitHub 저장소 설정

- **Pages**: Settings → Pages → Build and deployment → Source: **GitHub Actions**.
- **Secrets**: Settings → Secrets and variables → Actions → `VITE_API_URL` = 백엔드 공개 URL (예: `https://xxxx.ngrok-free.app/api`).

### 7.3 로컬 빌드와의 일치

- `vite.config.js`에서 **빌드 시** base 기본값을 `/consumables/`로 두어, 로컬에서 `npm run build`만 해도 Pages와 동일한 경로로 빌드됨.

---

## 8. 환경 변수 및 설정

### 8.1 백엔드 (`backend/.env`)

| 변수 | 설명 | 기본값 예시 |
|------|------|-------------|
| PORT | 서버 포트 | 3030 |
| LOCAL_ONEDRIVE_PATH | OneDrive 내 소모품발주 폴더 전체 경로 | (OS별 기본 경로) |
| EXCEL_FILE | Excel 파일명 | 소모품발주.xlsx |
| ATTACHMENTS_FOLDER | 첨부 파일 폴더명 | 첨부 파일 |
| JWT_SECRET | JWT 서명 비밀키 | (배포 시 반드시 변경) |
| JWT_EXPIRES_IN | 토큰 유효 기간 | 24h |

### 8.2 프론트 (빌드 시 주입)

| 변수 | 설명 | 사용처 |
|------|------|--------|
| VITE_API_URL | API 베이스 URL (끝에 `/api` 포함 권장) | `api.js`의 `API_BASE` |
| VITE_BASE_PATH | 배포 base path | Vite `base`, React Router basename (GitHub Actions에서 `/consumables/` 설정) |

- 로컬 개발: `.env` 또는 별도 파일. API는 Vite 프록시 `/api` → `localhost:3030` 사용 가능.
- GitHub Actions: Secrets의 `VITE_API_URL`만 설정하면 되고, `VITE_BASE_PATH`는 워크플로에 하드코딩.

---

## 9. 보안 및 CORS

- **인증**: API는 로그인·코드·디버그·첨부 일부를 제외하고 JWT 필수.
- **비밀번호**: 저장·검증 모두 해시. JWT에는 비밀번호 미포함.
- **CORS**: 허용 출처에 GitHub Pages, localhost, ngrok 등 포함. 배포 환경에 맞게 `index.js`의 `allowedOrigins` 조정 가능.
- **관리자 API**: `/api/admin/*`는 `adminOnly` 미들웨어로 관리자만 접근.
- **파일 경로**: `api/attachments`에서 `..` 등 path traversal 차단.

---

## 10. 요약 다이어그램

```
[ 사용자 ]
    │
    ├─ 브라우저 접속: https://ajinnovationpart-dev.github.io/consumables/
    │       │
    │       └─ React SPA (base /consumables/) → 로그인/대시보드/신청/관리자 메뉴
    │
    └─ API 요청 (Bearer JWT)
            │
            └─ VITE_API_URL (예: https://ngrok-url/api) → Node 백엔드 (localhost:3030)
                    │
                    ├─ /api/auth/*        → 로그인, /me, 비밀번호 변경
                    ├─ /api/requests/*    → 신청 CRUD, 대시보드 (auth)
                    ├─ /api/codes/*       → 지역/팀/배송지 (auth)
                    ├─ /api/admin/*       → 사용자/배송지/가져오기/내보내기 (admin only)
                    └─ /api/attachments/* → 첨부 파일 서빙
                            │
                            └─ 로컬 OneDrive: 소모품발주.xlsx + 첨부 파일/{신청번호}/
```

---

이 문서는 현재 구현 기준으로 작성되었습니다. OneDrive Graph API(`oneDriveService.js`) 등 추가 연동이 들어가면 데이터 레이어와 인프라 설명을 해당 방식에 맞게 보완하면 됩니다.
