<!--
  목적: 로컬(OneDrive+백엔드) + GitHub(프론트) 구성의 설정 체크리스트와
        프론트엔드 API/데이터 로딩 점검 목록을 한 문서로 통합.
  구성: 1부 설정 체크리스트, 2부 프론트 데이터 로딩 점검.
-->

# 설정 및 점검 체크리스트

<!-- 목차: 1. 설정 체크리스트 (로컬·GitHub) / 2. 프론트 데이터 로딩 점검 / 3. 한 번에 체크 / 4. 문제 발생 시 -->

---

## 1부. 필요한 설정 체크리스트

**로컬(OneDrive + 백엔드) + GitHub(프론트)** 구조로 쓰기 위한 설정을 순서대로 정리했습니다.

**적용된 정보**
- OneDrive 폴더: `C:\Users\User\OneDrive - AJ네트웍스\소모품발주`
- Excel 파일: `소모품발주.xlsx` (위 폴더 안)
- 첨부 파일: `첨부 파일` 폴더 안에 **신청번호별** 하위 폴더로 이미지 저장

### 1. 로컬 PC (OneDrive + 백엔드)

#### 1-1. 폴더 준비

- [ ] 아래 폴더가 있는지 확인 (없으면 생성)

```
C:\Users\User\OneDrive - AJ네트웍스\소모품발주
```

- 이 폴더 안에 **소모품발주.xlsx** 와 **첨부 파일** 폴더가 사용됩니다.
- 다른 경로를 쓰려면 아래 `.env` 에서 `LOCAL_ONEDRIVE_PATH` 를 그 경로로 지정하면 됩니다.

#### 1-2. 백엔드 환경 변수 (.env)

- [ ] `backend` 폴더 안에 **`.env`** 파일 생성
- [ ] 아래 내용을 넣고, 필요하면 값만 수정

```env
# 로컬 OneDrive 경로 (AJ네트웍스 OneDrive → 소모품발주 폴더)
LOCAL_ONEDRIVE_PATH=C:\Users\User\OneDrive - AJ네트웍스\소모품발주

# Excel 파일명 (위 폴더 안에 있는 소모품발주.xlsx)
EXCEL_FILE=소모품발주.xlsx

# 첨부 파일: 위 폴더 안에 "첨부 파일" 폴더, 그 안에 신청번호별 폴더로 이미지 저장
ATTACHMENTS_FOLDER=첨부 파일

PORT=3030
NODE_ENV=development

# 로그인 세션용 비밀키 (반드시 본인만 아는 값으로 변경)
JWT_SECRET=여기에-긴-랜덤-문자열-입력
JWT_EXPIRES_IN=24h
```

| 항목 | 적용값 | 설명 |
|------|--------|------|
| `LOCAL_ONEDRIVE_PATH` | `C:\Users\User\OneDrive - AJ네트웍스\소모품발주` | 소모품발주 폴더 전체 경로 |
| `EXCEL_FILE` | `소모품발주.xlsx` | 위 폴더 안의 Excel 파일 |
| `ATTACHMENTS_FOLDER` | `첨부 파일` | 신청번호별 이미지가 저장되는 폴더명 |
| `JWT_SECRET` | (직접 입력) | 아무 긴 문자열 (예: 비밀번호처럼) |

- **참고**: `backend/env.example.txt` 를 복사해서 `.env` 로 이름 바꾼 뒤 수정해도 됩니다.

#### 1-3. 백엔드 실행

- [ ] 터미널에서 아래 실행

```bash
cd backend
npm install
npm run dev
```

- [ ] 콘솔에 `API running at http://localhost:3030` 나오면 성공
- **소모품발주.xlsx** 가 없으면 이때 `C:\Users\User\OneDrive - AJ네트웍스\소모품발주` 안에 자동 생성됩니다.
- 이미지는 신청 시 `첨부 파일\{신청번호}\` 폴더에 저장됩니다.

#### 1-4. (선택) 외부에서 접속할 때 — ngrok

- GitHub Pages 에 올린 프론트가 **다른 PC/휴대폰**에서 접속할 때만 필요합니다.
- [ ] [ngrok](https://ngrok.com/) 설치 후:

```bash
ngrok http 3030
```

- [ ] 나온 **https://xxxx.ngrok-free.app** 주소 복사
- [ ] 아래 **2-3. GitHub Secrets** 에서 `VITE_API_URL` 값에 `https://xxxx.ngrok-free.app/api` 로 넣기 (끝에 `/api` 필수)

### 2. GitHub (프론트 배포)

#### 2-0. Index 페이지 (첫 화면) 안내

- **index 페이지는 있습니다.** React 앱의 진입점이 `frontend/index.html` 이고, 빌드 시 `frontend/dist/index.html` 로 나옵니다.
- GitHub Actions 가 이 `dist` 폴더를 그대로 GitHub Pages 에 올리므로, 접속 주소(`https://ajinnovationpart-dev.github.io/consumables/`)로 들어가면 **index.html** 이 로드됩니다.
- 앱 안에서는 **경로 `/`** 가 로그인 후 **`/dashboard`** 로 리다이렉트되도록 되어 있어, 첫 화면이 대시보드로 보이게 됩니다.

#### 2-1. 코드 올리기

- [ ] 이 프로젝트를 GitHub 저장소에 push (이미 했다면 생략)

#### 2-2. GitHub Pages 소스 설정

- [ ] 저장소 **Settings** → 왼쪽 **Pages**
- [ ] **Build and deployment** → **Source** 를 **GitHub Actions** 로 선택

#### 2-3. GitHub Secrets — 백엔드 주소(`VITE_API_URL`)

- **Name**: `VITE_API_URL`
- **Value**: 같은 PC만 쓸 때 `http://localhost:3030/api` / 다른 기기에서 쓸 때 ngrok URL + `/api` (예: `https://xxxx.ngrok-free.app/api`)
- Value 는 반드시 `/api` 로 끝나야 합니다.

#### 2-4. 배포 실행

- [ ] `main` 브랜치에 push 하면 자동으로 프론트 빌드 후 GitHub Pages 에 배포됩니다.
- [ ] 배포 완료 후 접속 주소: `https://<GitHub사용자명>.github.io/<저장소이름>/` (서브경로 사용 시 동일)

### 3. 로컬에서 프론트만 개발할 때

- [ ] `cd frontend` → `npm install` → `npm run dev`
- 브라우저: `http://localhost:5173` — API 는 자동으로 `localhost:3030` 로 프록시됩니다.

---

## 2부. 프론트엔드 데이터 로딩 점검 목록

모든 API 호출 및 데이터 불러오기 영역을 점검한 결과입니다.

### 1. API 호출 전체 목록

| API | 사용처 | 응답 형식 | 안전 처리 |
|-----|--------|-----------|-----------|
| `auth.login` | Login | `{ success, token, user, redirectUrl }` | 로그인 실패 시 throw, redirectUrl 없으면 `/dashboard` |
| `auth.me` | AuthContext | `{ user }` | `res?.user` 체크 후 setUser |
| `auth.changePassword` | (미사용) | - | - |
| `requests.dashboard` | Dashboard, AdminDashboard | `{ stats, recent }` | 응답 정규화: stats 객체/ recent 배열만 setState, 렌더 시 `stats?.total ?? 0`, `(Array.isArray(recent)?recent:[]).map` |
| `requests.my` | MyRequests | 배열 | `Array.isArray(res) ? res : []` setList, 렌더 시 배열 보호 |
| `requests.all` | AdminRequests | 배열 | 동일 |
| `requests.get(requestNo)` | RequestDetail | 단일 객체 | `res && typeof res === 'object' ? res : null`, 렌더 시 `request?.필드 ?? '-'` |
| `requests.create` | NewRequest | `{ success, requestNo, isDuplicate, ... }` | success/ isDuplicate 분기, 에러 catch |
| `requests.updateStatus` | MyRequests, AdminRequests | 결과 객체 | catch 후 alert, setList(prev) 시 `(Array.isArray(prev)?prev:[]).map` |
| `codes.regions` | NewRequest | 배열 | `Array.isArray(res) ? res : []` setRegions, 렌더 시 배열 보호 |
| `codes.deliveryPlaces(team)` | NewRequest | 배열 | 동일 setDeliveryPlaces, 배열 보호 |
| `codes.teams` | (미사용) | - | - |

### 2. 페이지별 데이터 로딩·표시 점검

| 페이지 | 로딩 데이터 | 로딩/에러 UI | null·비배열 방어 |
|--------|-------------|---------------|------------------|
| **Login** | 없음 (제출 시 auth.login) | error 표시, loading 버튼 | - |
| **Dashboard** | requests.dashboard() | loading/ error/ 빈 recent 메시지 | stats/recent 정규화, map 전 배열 검사 |
| **AdminDashboard** | requests.dashboard() | 동일 | 동일 |
| **NewRequest** | codes.regions(), codes.deliveryPlaces(user.team) | 에러만 (로딩 없음) | regions/deliveryPlaces 배열 보호, user?.team |
| **MyRequests** | requests.my() | loading/ error/ "신청 내역이 없습니다" | list 배열 보호, setList(prev) 시 배열 보호 |
| **AdminRequests** | requests.all() | loading/ error/ "신청이 없습니다" | 동일 |
| **RequestDetail** | requests.get(requestNo) | loading/ error/ "신청 건을 찾을 수 없습니다" | 응답 객체 검사, request?.필드 표시 |
| **Layout** | 없음 (AuthContext user) | - | user?.role, user?.name |
| **AuthContext** | auth.me() (토큰 있을 때) | loading 중 로딩 UI | res?.user 체크 |

### 3. 공통·기타

| 항목 | 점검 내용 |
|------|-----------|
| **api()** | !res.ok 시 throw, res.json 실패 시 {} 반환 후 throw 가능성 있음 → 각 .then에서 응답 형식 검사 |
| **getAttachmentUrl** | photoUrl 없으면 '', 절대 URL이면 origin 제거 후 반환 |
| **Router basename** | main.jsx `import.meta.env.BASE_URL` → /consumables/ 배포 시 경로 유지 |
| **404.html** | 빌드 시 복사 → 직접 URL/새로고침 시 SPA 로드 |
| **favicon** | index.html data URI → 404 방지 |

### 4. 미사용 API

- `auth.changePassword` — 화면 없음 (필요 시 추후 추가)
- `codes.teams` — 현재 미사용 (필요 시 추후 사용)

---

## 3. 한 번에 체크

| 구분 | 할 일 | 완료 |
|------|--------|------|
| 로컬 | `C:\Users\User\OneDrive - AJ네트웍스\소모품발주` 폴더 확인/생성 | ☐ |
| 로컬 | `backend/.env` 생성 (LOCAL_ONEDRIVE_PATH, EXCEL_FILE, 첨부 파일, JWT_SECRET) | ☐ |
| 로컬 | `cd backend && npm install && npm run dev` 실행 | ☐ |
| (선택) | ngrok 설치 후 `ngrok http 3030` 실행, URL 복사 | ☐ |
| GitHub | Pages → Source: **GitHub Actions** | ☐ |
| GitHub | Secrets → `VITE_API_URL` 추가 (끝에 `/api` 포함) | ☐ |
| GitHub | `main` 에 push → 자동 배포 확인 | ☐ |

---

## 4. 문제 발생 시

- **로그인이 안 될 때**  
  - `소모품발주.xlsx` 의 **사용자관리** 시트에 사용자 행이 있는지 확인  
  - 비밀번호 해시는 SHA-256 (Node: `require('crypto').createHash('sha256').update('비밀번호').digest('hex')`)

- **GitHub Pages 에서 API 호출 실패**  
  - Secrets 의 `VITE_API_URL` 이 `https://.../api` 형태인지 확인  
  - 같은 PC에서만 쓸 때는 `http://localhost:3030/api` 로 두면, **그 PC의 브라우저**에서만 동작합니다. 다른 기기는 ngrok URL 이 필요합니다.

- **이미지가 안 보일 때**  
  - 백엔드가 켜져 있는지, `VITE_API_URL` 이 맞는지 확인  
  - 첨부 파일 경로: `소모품발주\첨부 파일\{신청번호}\` 아래에 파일이 있는지 확인

- **Excel 에 데이터가 있는데 대시보드에 0 으로 나올 때 / 엑셀 시트 내용을 못 불러올 때**  
  1. **경로 확인**: 백엔드 실행 시 터미널에 `Excel 경로: ...` 가 출력됨. 그 경로가 **실제로 데이터가 있는 소모품발주.xlsx** 와 같은지 확인.  
  2. **브라우저에서 확인**: `http://localhost:3030/api/debug/excel-path` (또는 ngrok URL + `/api/debug/excel-path`) 접속 시 `path`, `exists`, `folderExists` 를 확인. `exists: false` 이면 `backend/.env` 의 `LOCAL_ONEDRIVE_PATH` 를 **소모품발주.xlsx 가 있는 폴더 경로**로 수정 후 백엔드 재시작.  
  3. **Excel 프로그램 종료**: 파일이 Excel 에서 열려 있으면 잠겨 있어 읽기 실패할 수 있음. Excel 을 닫은 뒤 백엔드 재시작.  
  4. **시트 이름**: 첫 번째 시트가 **신청내역** 이거나 이름에 "신청내역" 이 포함되어 있으면 읽음.  
  5. 위대로 해도 안 되면 터미널에 `[getRequests] Excel 읽기 실패: ...` 로그가 나오는지 확인.

이 체크리스트만 따라 하면 **로컬(OneDrive+백엔드) + GitHub(프론트)** 필요한 설정과 **프론트 데이터 로딩 점검**을 한 문서에서 확인할 수 있습니다.
