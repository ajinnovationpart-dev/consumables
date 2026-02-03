# 유사 시스템 인프라 구성 가이드

이 문서는 **로컬(OneDrive + Node 백엔드) + GitHub(React 프론트)** 구조를 새로 구성할 때, **어디서 가입하고, 어떻게 연결하고, PowerShell에서 무엇을 실행하는지** 단계별로 정리한 가이드입니다.

---

## 목차

1. [전체 구조 요약](#1-전체-구조-요약)
2. [필요한 사이트·가입](#2-필요한-사이트가입)
3. [구성 순서 (체크리스트)](#3-구성-순서-체크리스트)
4. [PowerShell로 할 일](#4-powershell로-할-일)
5. [사이트별 연결·설정](#5-사이트별-연결설정)
6. [동작 확인](#6-동작-확인)
7. [문제 해결 요약](#7-문제-해결-요약)
8. [다른 백엔드(A) 연동 시 실행 방법](#8-다른-백엔드a-연동-시-실행-방법)  
   - [8-5. A 레포에서 VITE_API_URL 세팅](#8-5-a-레포다른-github-저장소에서-vite_api_url-세팅-방법)

---

## 1. 전체 구조 요약

```
[사용자 브라우저]
       │
       ├── 프론트: https://<GitHub사용자>.github.io/<저장소이름>/  (GitHub Pages)
       │
       └── API 요청 → 백엔드 공개 URL (ngrok 등)
                           │
                           └── 로컬 PC: Node 백엔드 + OneDrive 폴더(Excel, 첨부 파일)
```

| 구분 | 역할 | 위치 |
|------|------|------|
| **프론트** | React SPA (로그인·대시보드·신청·관리) | GitHub Pages에 배포 |
| **백엔드** | Node.js + Express (API·인증·Excel 읽기/쓰기) | 로컬 PC에서 실행 |
| **데이터** | Excel 파일 + 첨부 이미지 폴더 | 로컬 OneDrive(또는 지정 폴더) |

- **GitHub**: 코드 저장 + GitHub Pages로 프론트 정적 배포
- **ngrok**(선택): 로컬 백엔드를 인터넷에서 접근 가능한 URL로 터널링
- **OneDrive**(또는 로컬 폴더): Excel·첨부 파일 저장 위치

---

## 2. 필요한 사이트·가입

| 순서 | 사이트/서비스 | 용도 | 가입·설치 |
|------|----------------|------|-----------|
| 1 | **GitHub** | 코드 저장, GitHub Pages(프론트 배포) | [github.com](https://github.com) 가입 → 저장소 생성 |
| 2 | **Node.js** | 백엔드·프론트 빌드 실행 | [nodejs.org](https://nodejs.org) 에서 LTS 다운로드 후 설치 |
| 3 | **ngrok** (선택) | 로컬 백엔드를 외부 URL로 공개 | [ngrok.com](https://ngrok.com) 가입 → 앱 다운로드 또는 `choco install ngrok` |
| 4 | **OneDrive** (또는 로컬 폴더) | Excel·첨부 파일 저장 | 이미 사용 중이면 폴더만 만들면 됨. 없으면 일반 폴더 경로 사용 |

### 2-1. GitHub

- **가입**: [https://github.com/join](https://github.com/join)
- **저장소 생성**: 로그인 후 **New repository** → 이름 예: `ordering_consumables` (또는 원하는 이름) → **Create repository**
- **Pages 설정**: 저장소 **Settings → Pages → Build and deployment → Source**: **GitHub Actions** 선택

### 2-2. ngrok (외부에서 API 접근할 때만)

- **가입**: [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup)
- **설치**: [https://ngrok.com/download](https://ngrok.com/download) 또는 PowerShell(관리자):
  ```powershell
  choco install ngrok
  ```
- **토큰 설정**(가입 후 대시보드에서 복사):
  ```powershell
  ngrok config add-authtoken <YOUR_TOKEN>
  ```

### 2-3. Node.js

- **다운로드**: [https://nodejs.org](https://nodejs.org) → LTS 버전 설치
- **확인**:
  ```powershell
  node -v
  npm -v
  ```

---

## 3. 구성 순서 (체크리스트)

| 단계 | 할 일 | 참고 |
|------|--------|------|
| 1 | 로컬에 **데이터 폴더** 생성 (OneDrive 또는 일반 경로) | [4. PowerShell로 할 일](#4-powershell로-할-일) |
| 2 | **백엔드 .env** 생성 및 경로·JWT 등 설정 | [4. PowerShell로 할 일](#4-powershell로-할-일) |
| 3 | **백엔드 실행** (npm install, npm run dev) | [4. PowerShell로 할 일](#4-powershell로-할-일) |
| 4 | (선택) **ngrok** 실행 → 나온 URL 복사 | [4. PowerShell로 할 일](#4-powershell로-할-일) |
| 5 | **GitHub** 저장소에 코드 push, **Pages = GitHub Actions** 설정 | [5. 사이트별 연결·설정](#5-사이트별-연결설정) |
| 6 | **GitHub Secrets**에 `VITE_API_URL` 추가(백엔드 공개 URL) | [5. 사이트별 연결·설정](#5-사이트별-연결설정) |
| 7 | **Actions**에서 배포 워크플로 실행 후 접속 확인 | [6. 동작 확인](#6-동작-확인) |

---

## 4. PowerShell로 할 일

아래는 **Windows PowerShell** 기준입니다. `cd` 경로는 실제 프로젝트 위치로 바꾸세요.

### 4-1. 데이터 폴더 생성

OneDrive 사용 시 (경로는 회사/개인 OneDrive에 맞게 수정):

```powershell
# OneDrive 내 소모품발주 폴더 생성
$basePath = "$env:USERPROFILE\OneDrive - AJ네트웍스\소모품발주"
New-Item -ItemType Directory -Force -Path $basePath
New-Item -ItemType Directory -Force -Path "$basePath\첨부 파일"
# 생성 확인
Get-ChildItem $basePath
```

OneDrive 없이 로컬만 사용 시:

```powershell
$basePath = "C:\data\소모품발주"
New-Item -ItemType Directory -Force -Path $basePath
New-Item -ItemType Directory -Force -Path "$basePath\첨부 파일"
```

→ 이 경로를 아래 `.env`의 `LOCAL_ONEDRIVE_PATH`에 넣습니다.

---

### 4-2. 백엔드 .env 파일 생성

프로젝트 루트가 `E:\ordering_consumables` 라고 가정:

```powershell
cd E:\ordering_consumables\backend

# env.example.txt 를 복사해 .env 생성
Copy-Item env.example.txt .env

# .env 편집 (메모장 또는 VS Code)
notepad .env
```

**.env에 넣을 내용 예시** (경로는 위에서 만든 폴더로):

```env
LOCAL_ONEDRIVE_PATH=C:\Users\User\OneDrive - AJ네트웍스\소모품발주
EXCEL_FILE=소모품발주.xlsx
ATTACHMENTS_FOLDER=첨부 파일
PORT=3030
NODE_ENV=development
JWT_SECRET=비밀키-프로덕션에서-반드시-변경
JWT_EXPIRES_IN=24h
```

PowerShell로 한 줄씩 덮어쓰려면:

```powershell
$envPath = "E:\ordering_consumables\backend\.env"
@"
LOCAL_ONEDRIVE_PATH=C:\Users\User\OneDrive - AJ네트웍스\소모품발주
EXCEL_FILE=소모품발주.xlsx
ATTACHMENTS_FOLDER=첨부 파일
PORT=3030
NODE_ENV=development
JWT_SECRET=your-jwt-secret-change-in-production
JWT_EXPIRES_IN=24h
"@ | Set-Content -Path $envPath -Encoding UTF8
```

---

### 4-3. 백엔드 의존성 설치 및 실행

```powershell
cd E:\ordering_consumables\backend

# 의존성 설치
npm install

# 개발 서버 실행 (포트 3030)
npm run dev
```

- 정상이면 터미널에 `API running at http://localhost:3030` 같은 메시지가 나옵니다.
- **Excel 파일이 없으면** 첫 실행 시 `LOCAL_ONEDRIVE_PATH` 아래에 `소모품발주.xlsx`가 자동 생성됩니다.
- 이 터미널은 **계속 켜 둔 상태**에서 사용합니다. (중단하면 API 중단)

**백그라운드로 실행하고 싶을 때** (선택):

```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd E:\ordering_consumables\backend; npm run dev"
```

---

### 4-4. ngrok 실행 (외부에서 API 쓸 때)

백엔드가 이미 `npm run dev`로 떠 있는 상태에서 **새 PowerShell 창**에서:

```powershell
# 포트 3030 을 공개 URL 로 터널링
ngrok http 3030
```

- 터미널에 나오는 **Forwarding** URL(예: `https://xxxx.ngrok-free.app`)을 복사합니다.
- 이 URL을 **GitHub Secrets**의 `VITE_API_URL` 값으로 넣습니다. (끝에 `/api` 포함 권장, 예: `https://xxxx.ngrok-free.app/api`)
- ngrok을 끄면 URL이 바뀌므로, **URL 변경 시마다** GitHub Secret 수정 후 Actions에서 배포를 다시 실행해야 합니다.

---

### 4-5. 프론트엔드 로컬 개발 (선택)

API를 로컬 백엔드(localhost:3030)로 쓰려면:

```powershell
cd E:\ordering_consumables\frontend
npm install
npm run dev
```

- 브라우저에서 `http://localhost:5173` 접속 (Vite가 `/api`를 3030으로 프록시하도록 설정되어 있어야 함).

---

### 4-6. Git 초기화 및 GitHub에 push (처음 한 번)

```powershell
cd E:\ordering_consumables

# Git이 없으면
git init
git add .
git commit -m "Initial commit"

# GitHub 저장소 연결 (본인 저장소 URL로 변경)
git remote add origin https://github.com/<사용자명>/<저장소이름>.git
git branch -M main
git push -u origin main
```

이후 코드 수정 후 배포하려면:

```powershell
git add .
git commit -m "메시지"
git push origin main
```

---

## 5. 사이트별 연결·설정

### 5-1. GitHub 저장소 설정

1. **Pages**
   - 저장소 **Settings → Pages**
   - **Build and deployment → Source**: **GitHub Actions** 선택

2. **Secrets (API 주소 넣기)**
   - **Settings → Secrets and variables → Actions**
   - **New repository secret**
     - **Name**: `VITE_API_URL`
     - **Value**: 백엔드 공개 URL  
       - ngrok 사용 시: `https://xxxx.ngrok-free.app/api` (끝에 `/api` 포함 권장)  
       - 로컬만 쓸 때 Pages는 외부에서 접속하므로, **외부에서 접근 가능한 URL**이어야 합니다. (로컬호스트는 안 됨)

3. **워크플로 파일**
   - 저장소에 `.github/workflows/deploy-pages.yml` 이 있어야 합니다.
   - 내용은 “main 브랜치 push 시 frontend 빌드 후 GitHub Pages에 배포” 형태로, `VITE_API_URL`을 빌드 시 주입하는 구조면 됩니다.

### 5-2. ngrok과 GitHub 연결

- ngrok 실행 → 나온 **https://xxxx.ngrok-free.app** 복사
- GitHub **Settings → Secrets → Actions** 에서 `VITE_API_URL` 값을  
  `https://xxxx.ngrok-free.app/api` 로 설정(또는 업데이트)
- **Actions** 탭 → **Deploy Frontend to GitHub Pages** (또는 해당 워크플로) → **Run workflow** 로 한 번 다시 빌드·배포

이렇게 해야 배포된 프론트가 **현재 켜 둔 ngrok URL**로 API를 호출합니다.

### 5-3. 접속 주소 정리

| 접속처 | URL |
|--------|-----|
| **프론트 (GitHub Pages)** | `https://<GitHub사용자명>.github.io/<저장소이름>/` |
| **백엔드 (로컬)** | `http://localhost:3030` |
| **백엔드 (ngrok)** | 터미널에 표시된 `https://xxxx.ngrok-free.app` |

---

## 6. 동작 확인

1. **백엔드**
   - 브라우저 또는 PowerShell:  
     `Invoke-RestMethod -Uri "http://localhost:3030/health"`  
     → `ok: true` 나오면 정상

2. **Excel 경로 (디버그)**
   - `http://localhost:3030/api/debug/excel-path`  
     → `path`, `exists` 등 확인

3. **프론트 (Pages)**
   - `https://<사용자명>.github.io/<저장소>/` 접속
   - 로그인 화면까지 나오고, 로그인 시 **ngrok URL로 API 요청**이 나가면 연결된 것입니다.
   - ngrok 사용 시 브라우저에서 **ngrok URL을 한 번 열어 "Visit Site"** 한 뒤 로그인하면, 경고 페이지 때문에 생기는 오류를 줄일 수 있습니다.

---

## 7. 문제 해결 요약

| 증상 | 확인·조치 |
|------|-----------|
| API 404 | `VITE_API_URL`이 **끝에 `/api` 포함**인지 확인. 프론트는 없으면 보정하지만, Secret에는 `/api` 포함 권장. |
| 로그인 실패 (연결 안 됨) | 백엔드 실행 여부, ngrok 실행 여부, Secret의 URL과 현재 ngrok URL 일치 여부 확인. |
| Pages 404 (직접 URL) | SPA이므로 루트(`/저장소이름/`)로 들어온 뒤 메뉴로 이동. 빌드 시 base path가 `/저장소이름/`인지 확인. |
| Excel/첨부 못 찾음 | `backend\.env`의 `LOCAL_ONEDRIVE_PATH`가 실제 폴더 경로와 일치하는지 확인. PowerShell로 `Get-ChildItem $env:LOCAL_ONEDRIVE_PATH` 등으로 확인. |

---

## 8. 다른 백엔드(A) 연동 시 실행 방법

B(3030)만 ngrok으로 노출하고, **A 백엔드(3000)**는 같은 PC의 다른 폴더에서 실행해 B가 내부적으로 호출하는 구조일 때의 실행 방법입니다.

### 8-1. A 백엔드는 폴더 옮기지 않아도 됨

- A는 **그대로** 예: `E:\hr-sample\backend` 에 두고 실행하면 됩니다.
- B(ordering_consumables)와 **같은 PC**에서만 A가 3000 포트로 떠 있으면, B가 `http://localhost:3000` 으로 A를 호출할 수 있습니다.

### 8-2. A 백엔드(3000) 실행 방법

A가 **E:\hr-sample\backend** 라고 가정할 때:

```powershell
# A 백엔드 폴더로 이동
cd E:\hr-sample\backend

# 의존성 설치 (최초 1회)
npm install

# 개발 모드 실행 (포트 3000)
npm run dev
```

또는 배치 파일이 있다면:

```powershell
cd E:\hr-sample\backend
.\start-server.bat
```

- 정상이면 서버가 **3000** 포트에서 대기합니다. (A의 `server.ts`에서 `PORT = process.env.PORT || 3000`)
- **3000 포트가 이미 사용 중**이면:
  - 기존에 A가 이미 실행 중인 것이므로 그대로 두거나,
  - 사용 중인 프로세스를 종료한 뒤 다시 실행합니다.
  - PowerShell에서 3000 사용 프로세스 확인:  
    `Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object OwningProcess`

### 8-3. GitHub / 로컬에서의 실행 순서

| 순서 | 할 일 | 비고 |
|------|--------|------|
| 1 | **A 백엔드** 실행 (`E:\hr-sample\backend` → `npm run dev`) | 3000 포트 |
| 2 | **B 백엔드** 실행 (`E:\ordering_consumables\backend` → `npm run dev`) | 3030 포트 |
| 3 | (선택) **ngrok** 실행 (`ngrok http 3030`) | B만 외부 노출 |
| 4 | GitHub Pages는 그대로 B의 ngrok URL(`VITE_API_URL`)로 API 호출 | 변경 없음 |

- **GitHub 저장소**: B(ordering_consumables)만 Pages·Secrets와 연결됩니다. A는 별도 프로젝트(다른 저장소)일 수 있으며, **GitHub에 올려두지 않아도** 로컬에서 A만 실행하면 됩니다.
- **다른 PC에서 구성할 때**: A 소스가 `E:\hr-sample\backend` 가 아니라면, 해당 PC에서 A가 있는 **폴더 경로만** 위 명령의 `cd` 경로로 바꿔서 실행하면 됩니다.

### 8-4. B에서 A 프록시 사용 (B 쪽 설정)

B(ordering_consumables) 백엔드 `.env`에 다음을 추가하면, **/api/a/** 로 들어오는 요청이 자동으로 A(3000)로 전달됩니다.

```env
A_BACKEND_URL=http://localhost:3000
```

- B를 재시작한 뒤 `http://localhost:3030/api/a/health` 등으로 호출해 보면 A로 프록시되는지 확인할 수 있습니다.
- A 백엔드(3000)가 같은 PC에서 실행 중이어야 합니다.

### 8-5. A 레포(다른 GitHub 저장소)에서 VITE_API_URL 세팅 방법

A 백엔드가 **다른 Git 저장소**(예: hr-sample)에 있고, 그 레포의 **프론트엔드를 GitHub Pages로 배포**할 때는 아래처럼 설정합니다.

- A 백엔드(3000)는 **ngrok에 직접 연결하지 않습니다.**  
  B(3030)만 ngrok으로 열고, B가 **/api/a** 를 A(3000)로 프록시합니다.
- 따라서 **A 레포의 프론트**가 호출해야 할 API 주소는 **B의 ngrok URL + /api/a** 입니다.

#### A 레포에서 할 일

1. **GitHub 저장소**(A 쪽, 예: hr-sample) → **Settings → Secrets and variables → Actions**
2. **New repository secret** 추가
   - **Name**: `VITE_API_URL`
   - **Value**: **B의 ngrok URL + `/api/a`**  
     예: `https://xxxx.ngrok-free.app/api/a`  
     (B와 **같은 ngrok URL**을 쓰고, 끝에 `/api/a`만 붙입니다.)
3. A 레포의 **워크플로**(GitHub Actions)에서 빌드 시 위 `VITE_API_URL`을 환경 변수로 넣어 두었는지 확인합니다. (Vite 기준이면 `VITE_API_URL`이 빌드 시 주입되도록 설정)
4. A 프론트엔드 코드에서 API 베이스 URL을 `import.meta.env.VITE_API_URL` 로 쓰고, **경로는 `/api` 없이** 사용합니다.  
   - 예: `VITE_API_URL = https://xxx.ngrok-free.app/api/a` 이면  
     `GET ${VITE_API_URL}/auth/login` → 실제 요청은 `https://xxx.ngrok-free.app/api/a/auth/login` → B가 A의 `/api/auth/login`으로 프록시

#### 정리

| 구분 | VITE_API_URL 값 | 비고 |
|------|------------------|------|
| **B 레포**(ordering_consumables) 프론트 | `https://xxxx.ngrok-free.app/api` | B API 직접 호출 |
| **A 레포**(hr-sample 등) 프론트 | `https://xxxx.ngrok-free.app/api/a` | B를 경유해 A로 프록시 |

- ngrok URL이 바뀌면 **B 레포와 A 레포 둘 다** Secrets의 `VITE_API_URL`을 **같은 새 ngrok URL**로 맞춰서 업데이트한 뒤, 각각 Actions에서 배포를 다시 실행하면 됩니다.

---

## 요약: “어디 가입하고, 뭘 연결하고, PowerShell로 뭘 하나?”

| 구분 | 내용 |
|------|------|
| **가입** | GitHub, (선택) ngrok, Node.js 설치 |
| **연결** | GitHub Secrets에 `VITE_API_URL` = 백엔드 공개 URL(ngrok 등), Pages = GitHub Actions |
| **PowerShell** | ① 데이터 폴더 생성 ② backend `.env` 생성 ③ `backend`에서 `npm install` → `npm run dev` ④ (선택) 다른 창에서 `ngrok http 3030` ⑤ 필요 시 `frontend`에서 `npm run dev` ⑥ Git push로 배포. **A 백엔드 연동 시**: 먼저 A 폴더(`예: E:\hr-sample\backend`)에서 `npm run dev`(3000) 실행 → 그다음 B(3030) 실행. |

이 가이드를 따라하면, 동일한 “로컬 백엔드 + GitHub 프론트” 구조를 새 환경에도 그대로 구성할 수 있습니다.
