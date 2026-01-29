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
# Forwarding  https://abc123.ngrok-free.app -> http://localhost:3030
```

→ 프론트 빌드 시 `VITE_API_URL=https://abc123.ngrok-free.app/api` 로 설정 (아래 참고).

## 2. 프론트엔드 (GitHub Pages 배포)

### 2-1. GitHub 저장소 설정

1. **Settings → Pages → Build and deployment**
   - Source: **GitHub Actions** 선택

2. **Settings → Secrets and variables → Actions**
   - **New repository secret** 추가:
     - Name: `VITE_API_URL`
     - Value: 백엔드 공개 URL (예: `https://xxxx.ngrok-free.app/api`)  
       → 로컬 백엔드를 ngrok 등으로 공개한 URL, **반드시 `/api` 포함**
   - (선택) 서브경로 배포 시:
     - Name: `VITE_BASE_PATH`
     - Value: `/{저장소이름}/` (예: `/ordering_consumables/`)

### 2-2. 배포

- `main` 브랜치에 push 하면 `.github/workflows/deploy-pages.yml` 이 실행되어 프론트를 빌드하고 GitHub Pages에 배포합니다.
- 빌드 시 위에서 넣은 `VITE_API_URL` 이 적용됩니다.

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

## 5. 요약

- **로컬(OneDrive + 백엔드)** + **GitHub(프론트)** 구조로 갈 수 있음.
- 프론트는 GitHub Pages, 백엔드는 OneDrive 있는 PC에서 실행.
- 다른 사람/다른 기기에서 쓰려면 백엔드를 ngrok 등으로 공개하고, GitHub Secrets에 `VITE_API_URL`을 넣으면 됨.
