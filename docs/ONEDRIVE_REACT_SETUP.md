# OneDrive + React 아키텍처 설정 가이드

이 문서는 **구글 시트 없이** OneDrive + React로 구성된 부품발주시스템의 설치 및 운영 방법을 안내합니다.

## 아키텍처 개요

- **백엔드**: Node.js + Express + Microsoft Graph API
- **데이터 저장**: OneDrive 내 CSV 파일 (신청내역, 사용자관리, 코드관리, 배송지관리, 로그)
- **파일 저장**: OneDrive 폴더 `부품발주/사진첨부`
- **프론트엔드**: React (Vite) + AJ 디자인 시스템 기반 스타일

## 1. Azure 앱 등록 (Microsoft Graph API)

1. [Azure Portal](https://portal.azure.com) → **Azure Active Directory** → **앱 등록** → **새 등록**
2. 이름: `부품발주시스템`, 지원 계정: **이 조직 디렉터리만**
3. 등록 후 **애플리케이션(클라이언트) ID**, **디렉터리(테넌트) ID** 복사
4. **인증서 및 비밀** → **클라이언트 비밀** 새로 만들기 → **값** 복사
5. **API 권한** → **권한 추가** → **Microsoft Graph** → **애플리케이션 권한**:
   - `Files.ReadWrite.All` (OneDrive 읽기/쓰기)
   - `User.Read.All` (필요 시)
6. **관리자 동의 허용** 실행

## 2. OneDrive 준비

- 백엔드가 사용할 **OneDrive 드라이브**가 필요합니다.
  - **개인 OneDrive**: `ONEDRIVE_BASE_PATH=/me/drive/root` 사용 시, 앱은 **애플리케이션 권한**으로 특정 사용자 드라이브에 접근하려면 **사이트 ID** 또는 **사용자 ID**가 필요할 수 있습니다.
  - **SharePoint 사이트**의 문서 라이브러리를 사용하는 것을 권장합니다.
    - SharePoint 사이트 URL에서 사이트 ID 확인 후  
      `ONEDRIVE_BASE_PATH=/sites/{siteId}/drive/root` 로 설정

또는 **개인 OneDrive**를 쓰는 경우:

- 테넌트의 **한 사용자 OneDrive**에 `부품발주` 폴더를 만들고, 앱이 해당 사용자 드라이브에 접근하도록 설정합니다.
- Graph API 호출 시 드라이브 경로: `/users/{userId}/drive/root`  
  → `ONEDRIVE_BASE_PATH=/users/{userId}/drive/root` 로 설정

## 3. 백엔드 설정

```bash
cd backend
npm install
```

`env.example.txt`를 참고하여 프로젝트 루트에 `.env` 파일 생성:

```env
PORT=3030
NODE_ENV=development
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
ONEDRIVE_BASE_PATH=/me/drive/root
ONEDRIVE_APP_FOLDER=부품발주
JWT_SECRET=your-jwt-secret-change-in-production
JWT_EXPIRES_IN=24h
```

- `ONEDRIVE_BASE_PATH`: 위 2번에서 결정한 드라이브 경로
- `ONEDRIVE_APP_FOLDER`: OneDrive 내 앱 데이터가 들어갈 폴더 이름 (예: `부품발주`)

실행:

```bash
npm run dev
```

API: `http://localhost:3030`

## 4. OneDrive 초기 데이터

`부품발주` 폴더 아래에 다음 CSV 파일을 업로드합니다. (기존 구글 시트 템플릿과 동일한 형식)

- `신청내역.csv` – 컬럼: 신청번호, 신청일시, 신청자이메일, 신청자이름, 기사코드, 소속팀, 지역, 품명, 모델명, 시리얼번호, 수량, 관리번호, 수령지, 전화번호, 업체명, 비고, 사진URL, 상태, 접수담당자, 담당자비고, 발주일시, 예상납기일, 수령확인일시, 최종수정일시, 최종수정자
- `사용자관리.csv` – 사용자ID, 비밀번호해시, 이름, 기사코드, 소속팀, 지역, 역할, 활성화
- `코드관리.csv` – 지역/팀/상태 코드 (기존 템플릿 형식)
- `배송지관리.csv` – 배송지명, 소속팀, 주소, 연락처, 담당자, 활성화, 비고
- `로그.csv` – 일시, 레벨, 액션, 신청번호, 사용자, 상세내용

비밀번호 해시는 SHA-256 해시입니다. Node로 생성 예:

```js
const crypto = require('crypto');
console.log(crypto.createHash('sha256').update('비밀번호', 'utf8').digest('hex'));
```

## 5. 프론트엔드 설정

```bash
cd frontend
npm install
npm run dev
```

브라우저: `http://localhost:5173`  
Vite 개발 서버가 `/api`를 `http://localhost:3030`로 프록시하므로, 동일 출처처럼 API 호출이 됩니다.

빌드:

```bash
npm run build
```

`dist` 폴더를 정적 호스팅(예: Nginx, Vercel, Netlify)에 배포하고, API 요청은 백엔드 URL(`/api` 또는 별도 도메인)로 보내도록 설정합니다.

## 6. 프로덕션 배포

- **백엔드**: Node 서버를 VM/컨테이너(Azure App Service, AWS, Docker 등)에 배포하고, 환경 변수에 프로덕션 값 설정
- **프론트엔드**: `dist`를 CDN/정적 호스팅에 배포 후, API 베이스 URL을 백엔드 주소로 맞춤 (또는 리버스 프록시로 `/api` → 백엔드)

## 7. 폴더 구조

```
ordering_consumables/
  backend/           # Node.js API
    src/
      index.js
      config.js
      graph.js
      middleware/
      routes/
      services/
  frontend/          # React (Vite)
    src/
      components/
      context/
      pages/
      services/
  docs/
    ONEDRIVE_REACT_SETUP.md
```

기존 `apps-script/` 및 `templates/`는 구글 시트용이며, OneDrive 버전에서는 `templates/`의 CSV를 OneDrive에 업로드해 사용하면 됩니다.
