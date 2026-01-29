# 부품발주시스템 (OneDrive + React 버전)

구글 시트를 사용하지 않고 **OneDrive + React**로 구성한 부품발주시스템입니다.

## 구조

| 구분 | 기술 |
|------|------|
| 백엔드 | Node.js, Express, Microsoft Graph API |
| 데이터 | OneDrive 내 CSV 파일 |
| 파일 저장 | OneDrive `부품발주/사진첨부` 폴더 |
| 프론트엔드 | React 18, Vite, React Router |
| 디자인 | AJ 디자인 시스템 기반 CSS 변수 |

## 빠른 실행

### 1. Azure 앱 등록

- Azure Portal에서 앱 등록 후 **테넌트 ID**, **클라이언트 ID**, **클라이언트 비밀** 발급
- Microsoft Graph 권한: `Files.ReadWrite.All` (애플리케이션 권한) 추가 후 관리자 동의

### 2. 백엔드

```bash
cd backend
cp env.example.txt .env
# .env에 AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, ONEDRIVE_BASE_PATH, JWT_SECRET 등 설정
npm install
npm run dev
```

### 3. OneDrive 폴더 및 CSV

- OneDrive에 `부품발주` 폴더 생성
- `templates/` 의 CSV 파일들을 해당 폴더에 업로드 (신청내역, 사용자관리, 코드관리, 배송지관리, 로그)

### 4. 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속 후 로그인 (사용자관리.csv에 등록된 계정 사용).

## 상세 설정

- [docs/ONEDRIVE_REACT_SETUP.md](docs/ONEDRIVE_REACT_SETUP.md) 참고

## 제공 기능

- 로그인 / 로그아웃
- 신청자: 대시보드, 신규 신청(사진 첨부), 내 신청 목록, 신청 상세, 수령 확인
- 관리자: 대시보드, 전체 신청 목록, 상태 변경(발주진행, 발주완료 등)

데이터는 모두 OneDrive CSV와 사진첨부 폴더에 저장됩니다.
