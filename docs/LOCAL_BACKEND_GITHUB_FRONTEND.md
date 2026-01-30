<!--
  목적: 로컬(OneDrive+백엔드) + GitHub(프론트) 구성의 전체 가이드.
        로컬 OneDrive 폴더·Excel·첨부 파일 설정과 GitHub Pages 배포를 한 문서로 통합.
  관련: 상세 체크리스트·문제 발생 시 → docs/CHECKLIST.md
-->

# 로컬(OneDrive+백엔드) + GitHub(프론트) 구조

프론트는 **GitHub Pages**에, 백엔드와 데이터는 **로컬 PC(OneDrive)** 에 두는 구성입니다.

## 구조

```
[사용자 브라우저]
       │
       ├── 프론트: https://<user>.github.io/<repo>/  (GitHub Pages)
       │
       └── API 요청 → 로컬 PC에서 돌아가는 백엔드 (공개 URL 필요)
                           │
                           └── 로컬 OneDrive (소모품발주.xlsx, 첨부 파일)
```

- **로컬 PC**: Node 백엔드 실행 + OneDrive 폴더(Excel, 첨부 파일) 접근
- **GitHub**: 프론트엔드 코드 저장 + GitHub Pages로 정적 배포

## 0. 로컬 OneDrive + Excel 상세 (폴더·환경변수·Excel 준비)

<!-- 로컬 데이터 경로와 Excel/첨부 파일 구조. 다른 경로 사용 시 .env 에서 변경. -->

### 폴더 구조 (Windows 예시)

```
C:\Users\User\OneDrive - AJ네트웍스\소모품발주\
  ├── 소모품발주.xlsx      ← 데이터 (신청내역, 사용자관리, 코드관리, 배송지관리, 로그 시트)
  └── 첨부 파일\           ← 신청번호별 이미지 폴더
      ├── 2501010001\      ← 신청번호 폴더
      │   ├── 2501010001_1735123456789.jpg
      │   └── ...
      ├── 2501010002\
      └── ...
```

- **소모품발주.xlsx**: 하나의 Excel 파일에 시트별로 데이터 저장 (`신청내역`, `사용자관리`, `코드관리`, `배송지관리`, `로그`)
- **첨부 파일**: 신청 시 업로드한 이미지는 `첨부 파일\{신청번호}\` 아래에 저장됨

### 폴더 생성

- `C:\Users\User\OneDrive - AJ네트웍스\소모품발주` (다른 경로 사용 시 아래 `.env`의 `LOCAL_ONEDRIVE_PATH`로 지정)

### 백엔드 환경 변수 (.env)

`backend/` 디렉터리에 `.env` 파일 생성 후:

```env
LOCAL_ONEDRIVE_PATH=C:\Users\User\OneDrive - AJ네트웍스\소모품발주
EXCEL_FILE=소모품발주.xlsx
ATTACHMENTS_FOLDER=첨부 파일
PORT=3030
JWT_SECRET=비밀키-프로덕션에서-변경
JWT_EXPIRES_IN=24h
```

- `LOCAL_ONEDRIVE_PATH`: 소모품발주 폴더 전체 경로
- `EXCEL_FILE`: 그 안의 Excel 파일명 (기본: `소모품발주.xlsx`)
- `ATTACHMENTS_FOLDER`: 이미지 저장 폴더명 (기본: `첨부 파일`)

### Excel 파일 준비

- **소모품발주.xlsx**가 없으면: 백엔드 첫 실행 시 위 경로에 자동 생성 (시트: 신청내역, 사용자관리, 코드관리, 배송지관리, 로그)
- 기존 파일 사용 시: 같은 폴더에 두고 `EXCEL_FILE` 이름·시트 이름(`신청내역`, `사용자관리` 등) 맞출 것

### 첨부 파일(이미지) 저장 규칙

- 신청 이미지는 **첨부 파일\{신청번호}\** 아래에 `{신청번호}_타임스탬프.jpg` 형태로 저장됨

## 1. 로컬에서 할 일

### 백엔드 실행 (OneDrive 있는 PC)

```bash
cd backend
npm install
# .env 에 LOCAL_ONEDRIVE_PATH 등 설정
npm run dev
```

- API: `http://localhost:3030`
- 이 PC에서만 접속해서 쓸 거면 여기까지로 끝낼 수 있음.

### 외부에서 접속하게 하려면 (선택)

백엔드를 **인터넷에서 접근 가능한 URL**로 열어두어야 GitHub Pages 프론트가 호출할 수 있습니다.

| 방법 | 설명 |
|------|------|
| **ngrok** | `ngrok http 3030` → `https://xxxx.ngrok.io` 같은 URL 발급. 이 URL을 프론트 설정에 사용 |
| **공유기 포트포워딩** | PC의 3030 포트를 공유기에서 외부로 열고, 공인 IP 또는 도메인으로 접근 |
| **VPN** | 사용자를 VPN으로 같은 네트워크에 묶고, 내부 IP로 접근 |

예: ngrok 사용 시

```bash
ngrok http 3030
# Forwarding  https://conglomeratic-christena-unstraight.ngrok-free.dev -> http://localhost:3030
```

→ 프론트 빌드 시 `VITE_API_URL=https://conglomeratic-christena-unstraight.ngrok-free.dev` 로 설정 (끝에 `/api` 없어도 자동 보정됨).

## 2. 프론트엔드 (GitHub Pages 배포)

### 2-1. GitHub 저장소 설정

1. **Settings → Pages → Build and deployment**
   - Source: **GitHub Actions** 선택

2. **Settings → Secrets and variables → Actions**
   - **New repository secret** 추가:
     - Name: `VITE_API_URL`
     - Value: 백엔드 공개 URL, **끝에 `/api` 포함 권장** (예: `https://conglomeratic-christena-unstraight.ngrok-free.dev/api`)  
       → `/api` 없어도 프론트에서 보정하지만, 배포 빌드가 오래된 경우 404가 나므로 **Secret에는 `/api` 포함** 후 워크플로 다시 실행.
   - (선택) 서브경로 배포 시:
     - Name: `VITE_BASE_PATH`
     - Value: `/{저장소이름}/` (예: `/ordering_consumables/`)

### 2-2. 배포

- `main` 브랜치에 push 하면 `.github/workflows/deploy-pages.yml` 이 실행되어 프론트를 빌드하고 GitHub Pages에 배포합니다.
- 빌드 시 위에서 넣은 `VITE_API_URL` 이 적용됩니다.

**ngrok 주소가 바뀌었을 때 (기존 링크로 호출되는 CORS/404 해결)**

- GitHub Pages에 배포된 프론트는 **빌드할 때** 사용한 `VITE_API_URL` 이 그대로 박혀 있습니다. ngrok을 다시 켜면 URL이 바뀌므로, **Secret을 새 주소로 바꾼 뒤 다시 빌드**해야 합니다.
1. **Settings → Secrets and variables → Actions** 에서 `VITE_API_URL` 을 **편집(Update)** 하여 새 ngrok 주소로 변경  
   (예: `https://conglomeratic-christena-unstraight.ngrok-free.dev`)
2. **Actions** 탭 → **Deploy Frontend to GitHub Pages** 워크플로 → **Run workflow** (Run workflow 버튼) 로 **한 번 더 빌드·배포** 실행.
3. 배포가 끝난 뒤, 브라우저에서 **캐시 비우기** 또는 **시크릿 창**으로 `https://ajinnovationpart-dev.github.io/consumables/` 접속 후 로그인 다시 시도.

### 2-3. 수동 빌드 (로컬에서 빌드 후 배포)

```bash
cd frontend
cp env.production.example .env.production
# .env.production 에 VITE_API_URL=https://your-ngrok-url/api 입력
npm install
npm run build
```

- `dist/` 를 GitHub Pages 소스로 사용하거나, `gh-pages` 브랜치에 push

## 3. 동작 정리

| 접속 경로 | API 요청 대상 |
|-----------|----------------|
| 로컬 개발 `http://localhost:5173` | `/api` → Vite 프록시 → `localhost:3030` ✅ |
| GitHub Pages `https://user.github.io/repo/` | `VITE_API_URL`에 넣은 백엔드 URL (ngrok 등) ✅ |

- 백엔드는 **로컬 PC**에서만 실행되고, **로컬 OneDrive**만 접근합니다.
- GitHub에는 **프론트 코드와 빌드 결과**만 올라가고, GitHub 쪽에서는 OneDrive에 접근하지 않습니다.

## 4. 설정 체크리스트

| 단계 | 할 일 |
|------|--------|
| 로컬 | `backend/.env` 에 `LOCAL_ONEDRIVE_PATH`, `JWT_SECRET` 등 설정 |
| 로컬 | OneDrive PC에서 `cd backend && npm run dev` 로 백엔드 실행 |
| (선택) | 외부 접속 시 ngrok: `ngrok http 3030` → 나온 URL 복사 |
| GitHub | 저장소 **Settings → Pages → Source**: **GitHub Actions** 선택 |
| GitHub | **Settings → Secrets → Actions**: `VITE_API_URL` = `https://ngrok-url/api` 추가 |
| GitHub | `main` 브랜치에 push → 자동 빌드·배포 |

## 5. 직접 URL 접속 시 안 될 때 (예: /admin/requests)

- **증상**: `https://user.github.io/consumables/admin/requests` 처럼 직접 주소로 들어가면 404 또는 빈 화면.
- **원인**: GitHub Pages는 실제 파일만 서비스하므로 `/consumables/admin/requests` 경로에 파일이 없으면 404.html이 뜨고, 그다음 base(`/consumables/`)로 리다이렉트된 뒤 SPA가 `sessionStorage`에 저장된 경로로 이동해야 함. 이 과정이 정상이려면 **빌드 시 base가 `/consumables/`로 되어 있어야** asset 경로가 맞음.
- **확인·조치**:
  1. **Settings → Pages → Build and deployment**: Source가 **GitHub Actions**인지 확인.
  2. **main 브랜치에 최신 코드 push** 후 Actions 탭에서 "Deploy Frontend to GitHub Pages" 워크플로가 성공했는지 확인.
  3. 브라우저 **캐시 비우기** 또는 **시크릿 창**으로 `https://user.github.io/consumables/` 접속 후, 메뉴에서 `/admin/requests`로 이동해 보기.
  4. 로컬에서 수동 빌드해 dist를 올리는 경우, 반드시 **base가 `/consumables/`인 상태로** 빌드했는지 확인 (프로젝트의 `vite.config.js`는 빌드 시 기본 base를 `/consumables/`로 사용함).

## 6. 요약

- **로컬(OneDrive + 백엔드)** + **GitHub(프론트)** 구조로 갈 수 있음.
- 프론트는 GitHub Pages, 백엔드는 OneDrive 있는 PC에서 실행.
- 다른 사람/다른 기기에서 쓰려면 백엔드를 ngrok 등으로 공개하고, GitHub Secrets에 `VITE_API_URL`을 넣으면 됨.
