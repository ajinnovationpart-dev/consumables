<!--
  목적: 프로젝트 전체(Apps Script + HTML/JS/CSS)의 파일 구조와 데이터 흐름 문서.
        서버/클라이언트 파일 역할, 파일 간 연관도, 기능별 데이터 흐름.
  대상: Apps Script 웹앱 기준. React+Node 구조는 SYSTEM_INFRASTRUCTURE.md 참고.
-->

# 📁 파일 구조 및 데이터 흐름 문서

## 📋 목차
- [1. 프로젝트 구조 개요](#1-프로젝트-구조-개요)
- [2. 서버 사이드 파일 (Google Apps Script)](#2-서버-사이드-파일-google-apps-script)
- [3. 클라이언트 사이드 파일 (HTML/JS/CSS)](#3-클라이언트-사이드-파일-htmljscss)
- [4. 파일 간 연관도](#4-파일-간-연관도)
- [5. 데이터 흐름도](#5-데이터-흐름도)
- [6. 주요 기능별 데이터 흐름](#6-주요-기능별-데이터-흐름)

---

## 1. 프로젝트 구조 개요

```
ordering_consumables/
├── apps-script/                    # Google Apps Script 서버 코드
│   ├── Code.gs                     # 메인 컨트롤러 & Public API
│   ├── Models.gs                   # 데이터 모델 (DAL)
│   ├── Services.gs                 # 비즈니스 로직 레이어
│   ├── Auth.gs                     # 인증 및 세션 관리
│   ├── Config.gs                   # 전역 설정
│   ├── Utils.gs                    # 유틸리티 함수
│   ├── Triggers.gs                 # 자동화 트리거
│   ├── appsscript.json            # Apps Script 설정
│   └── Views/                      # HTML 템플릿
│       ├── JavaScript.html         # 공통 JavaScript
│       ├── Stylesheet.html          # 공통 CSS
│       ├── LoginPage.html          # 로그인 페이지
│       ├── UserDashboard.html      # 사용자 대시보드
│       ├── AdminDashboardPage.html # 관리자 대시보드
│       ├── NewRequestPage.html     # 신청 등록
│       ├── MyRequestsPage.html     # 내 신청 목록
│       ├── RequestDetailPage.html  # 신청 상세 (사용자)
│       ├── AdminPage.html          # 전체 신청 목록 (관리자)
│       ├── AdminRequestDetailPage.html # 신청 상세 관리 (관리자)
│       ├── AdminStatisticsPage.html   # 통계 및 리포트
│       ├── AdminMasterPage.html       # 기준정보 관리
│       ├── MyInfoPage.html            # 내 정보
│       ├── UserPage.html              # 사용자 페이지 (레거시)
│       └── Unauthorized.html          # 권한 없음 페이지
└── docs/                          # 문서
```

---

## 2. 서버 사이드 파일 (Google Apps Script)

### 2.1 Code.gs
**역할**: 메인 컨트롤러 및 Public API 엔드포인트

#### 주요 함수

| 함수명 | 역할 | 호출 위치 | 반환값 |
|--------|------|-----------|--------|
| `doGet(e)` | 웹 앱 진입점, 페이지 라우팅 | 브라우저 요청 | HTML 페이지 |
| `getWebAppUrl()` | 웹 앱 배포 URL 반환 | 클라이언트 | string |
| `getCurrentUser(sessionToken)` | 현재 사용자 정보 조회 | 모든 페이지 | Object |
| `login(userId, password)` | 로그인 처리 | LoginPage | {success, sessionToken} |
| `logout(sessionToken)` | 로그아웃 처리 | 모든 페이지 | {success} |
| `createRequest(formData, sessionToken)` | 신청 생성 | NewRequestPage | {success, requestNo} |
| `getMyRequests(filter, sessionToken)` | 내 신청 목록 조회 | MyRequestsPage, UserDashboard | Array |
| `getAllRequests(filter, sessionToken)` | 전체 신청 목록 조회 (관리자) | AdminPage | Array |
| `getRequest(requestNo, sessionToken)` | 신청 상세 조회 | RequestDetailPage | Object |
| `getRequestStats(sessionToken)` | 신청 통계 조회 | UserDashboard | Object |
| `getDashboardData(sessionToken)` | 대시보드 데이터 배치 조회 | UserDashboard | Object |
| `getAdminDashboardData(sessionToken)` | 관리자 대시보드 데이터 | AdminDashboardPage | Object |
| `updateRequestStatus(...)` | 신청 상태 변경 | AdminRequestDetailPage | {success} |
| `confirmReceipt(requestNo, sessionToken)` | 수령 확인 | RequestDetailPage | {success} |
| `cancelRequest(requestNo, sessionToken)` | 신청 취소 | MyRequestsPage | {success} |
| `getCodeList(type)` | 코드 목록 조회 | 여러 페이지 | Object/Array |
| `changePassword(...)` | 비밀번호 변경 | MyInfoPage | {success} |

#### 의존성
- `Auth.gs`: `getCurrentSession()`, `login()`, `logout()`
- `Models.gs`: `RequestModel`, `UserModel`, `CodeModel`
- `Services.gs`: `RequestService`
- `Utils.gs`: `CacheManager`, `ErrorHandler`
- `Config.gs`: `CONFIG` 상수

---

### 2.2 Models.gs
**역할**: 데이터 접근 레이어 (Data Access Layer)

#### 주요 클래스

##### RequestModel
- **역할**: 신청 데이터 CRUD 작업
- **데이터 소스**: Google Sheets `신청내역` 시트
- **주요 메서드**:
  - `findAll(filter, options)`: 전체 조회 (필터링, 페이징 지원)
  - `findById(requestNo)`: 단건 조회
  - `create(requestData)`: 신청 생성
  - `update(requestNo, updates)`: 신청 수정
  - `_rowToObject(headers, row, rowIndex)`: 행을 객체로 변환
  - `_objectToRow(obj)`: 객체를 행으로 변환
  - `_matchFilter(obj, filter)`: 필터 매칭

##### UserModel
- **역할**: 사용자 데이터 조회
- **데이터 소스**: Google Sheets `사용자관리` 시트
- **주요 메서드**:
  - `findByUserId(userId)`: 사용자 ID로 조회
  - `findByEmail(email)`: 이메일로 조회
  - `findAll()`: 전체 사용자 조회
  - `findAllAdmins()`: 관리자 목록 조회
  - `update(userId, updates)`: 사용자 정보 수정

##### CodeModel
- **역할**: 코드 데이터 조회 (지역, 소속팀, 상태 등)
- **데이터 소스**: Google Sheets `코드관리_*` 시트
- **주요 메서드**:
  - `findAll(type)`: 코드 목록 조회
  - `findByCode(type, code)`: 코드로 조회

#### 의존성
- `Config.gs`: `CONFIG.SHEETS`

---

### 2.3 Services.gs
**역할**: 비즈니스 로직 레이어

#### 주요 클래스

##### RequestService
- **역할**: 신청 관련 비즈니스 로직 처리
- **주요 메서드**:
  - `createRequest(formData, user)`: 신청 생성 (검증, 중복 체크, 사진 업로드)
  - `updateStatus(requestNo, newStatus, remarks, user)`: 상태 변경
  - `_validateRequestData(formData)`: 입력 데이터 검증
  - `_checkDuplicateRequest(formData, user)`: 중복 접수 체크
  - `_generateRequestNo()`: 신청번호 생성 (YYMMDD0001 형식)
  - `_uploadPhoto(requestNo, photoBase64)`: 사진 업로드 (Google Drive)

##### LogService
- **역할**: 로그 기록
- **데이터 소스**: Google Sheets `로그` 시트
- **주요 메서드**:
  - `log(action, requestNo, userId)`: 로그 기록
  - `error(action, requestNo, userId, errorMessage)`: 에러 로그 기록

#### 의존성
- `Models.gs`: `RequestModel`, `UserModel`
- `Config.gs`: `CONFIG`
- `Utils.gs`: `formatDate()`

---

### 2.4 Auth.gs
**역할**: 인증 및 세션 관리

#### 주요 클래스/함수

##### SessionManager
- **역할**: 세션 생성/조회/삭제
- **데이터 소스**: Google Apps Script `CacheService`
- **주요 메서드**:
  - `createSession(userId, userInfo)`: 세션 생성 (TTL: 1시간)
  - `getSession(sessionToken)`: 세션 조회
  - `deleteSession(sessionToken)`: 세션 삭제
  - `extendSession(sessionToken)`: 세션 연장

##### 주요 함수
- `login(userId, password)`: 로그인 처리 (비밀번호 해시 검증)
- `logout(sessionToken)`: 로그아웃 처리
- `getCurrentSession(sessionToken)`: 현재 세션 확인
- `hashPassword(password)`: 비밀번호 해시 (SHA-256)
- `verifyPassword(password, hash)`: 비밀번호 검증

#### 의존성
- `Models.gs`: `UserModel`
- `Utils.gs`: `hashPassword()`, `verifyPassword()`

---

### 2.5 Config.gs
**역할**: 전역 설정 관리

#### 주요 내용
- `CONFIG`: 전역 설정 객체
  - `SPREADSHEET_ID`: 스프레드시트 ID
  - `SHEETS`: 시트 이름 매핑
  - `DRIVE_FOLDER_ID`: Drive 폴더 ID
  - `STATUS`: 상태 코드 상수
  - `ROLES`: 역할 상수
  - `CACHE`: 캐시 설정
  - `DEBUG`: 디버그 설정

#### 주요 함수
- `getProperty(key)`: Script Properties에서 값 조회
- `setProperty(key, value)`: Script Properties에 값 저장
- `initializeProperties()`: 시스템 초기화 (Drive 폴더 생성)

---

### 2.6 Utils.gs
**역할**: 유틸리티 함수 및 헬퍼 클래스

#### 주요 클래스

##### CacheManager
- **역할**: 서버 측 캐싱 관리
- **데이터 소스**: Google Apps Script `CacheService`
- **주요 메서드**:
  - `get(key)`: 캐시 조회
  - `set(key, value, ttl)`: 캐시 저장
  - `remove(key)`: 캐시 삭제
  - `clear()`: 전체 캐시 삭제

##### LockManager
- **역할**: 동시성 제어 (Lock 메커니즘)
- **주요 메서드**:
  - `acquire(timeout)`: Lock 획득
  - `release()`: Lock 해제
  - `withLock(callback, timeout)`: Lock 내에서 함수 실행

##### ErrorHandler
- **역할**: 에러 처리 및 사용자 친화적 메시지 변환
- **주요 메서드**:
  - `handle(error, context)`: 에러 처리
  - `_getUserFriendlyMessage(technicalMessage)`: 에러 메시지 변환

##### Validator
- **역할**: 데이터 검증
- **주요 메서드**:
  - `isEmail(email)`: 이메일 검증
  - `isPhone(phone)`: 전화번호 검증
  - `isNotEmpty(value)`: 빈 값 검증
  - `isNumber(value)`: 숫자 검증

#### 주요 함수
- `formatDate(date, format)`: 날짜 포맷팅
- `isSameDate(date1, date2)`: 날짜 비교
- `log(level, message)`: 로깅
- `include(filename)`: HTML 파일 포함

#### 의존성
- `Config.gs`: `CONFIG`

---

### 2.7 Triggers.gs
**역할**: 자동화 트리거 관리

#### 주요 함수
- `setupAllTriggers()`: 모든 트리거 설정
  - 매일 새벽 2시: 백업 (`performDailyBackup`)
  - 매시간: 발주 지연 체크 (`checkDelayedRequests`)
  - 매일 오전 9시: 일일 리포트 (`sendDailyReport`)
- `deleteAllTriggers(functionName)`: 트리거 삭제
- `performDailyBackup()`: 일일 백업 수행
- `checkDelayedRequests()`: 지연 건 체크 및 알림
- `sendDailyReport()`: 일일 리포트 전송
- `sendErrorNotification(...)`: 에러 알림 전송

#### 의존성
- `Models.gs`: `RequestModel`, `UserModel`
- `Utils.gs`: `formatDate()`
- `Config.gs`: `CONFIG`

---

## 3. 클라이언트 사이드 파일 (HTML/JS/CSS)

### 3.1 공통 파일

#### JavaScript.html
**역할**: 공통 JavaScript 유틸리티

##### 주요 기능
- **성능 최적화**:
  - `MemoryCache`: 메모리 캐시 클래스
  - `BatchRequestManager`: 배치 요청 관리
  - `debounce()`, `throttle()`: 디바운싱/쓰로틀링
- **서버 통신**:
  - `callServer(functionName, ...args)`: Google Apps Script 호출 (캐싱 지원)
- **UI 관리**:
  - `showLoading(message)`: 로딩 오버레이 표시
  - `hideLoading()`: 로딩 오버레이 숨김
  - `showToast(message, type)`: 토스트 알림 표시
- **유틸리티**:
  - `escapeHtml(text)`: XSS 방지 (HTML 이스케이프, 캐싱)
  - `formatDate(dateString)`: 날짜 포맷팅 (캐싱)
  - `uploadPhoto(fileInput)`: 사진 업로드
  - `resizeImage(file, maxWidth, maxHeight)`: 이미지 리사이징
  - `createStatusBadge(status)`: 상태 배지 생성 (캐싱)
  - `handleError(error)`: 에러 처리
  - `getSessionToken()`: 세션 토큰 조회
  - `navigateTo(page)`: 페이지 네비게이션 (디바운싱)

##### 사용 위치
- 모든 HTML 페이지에서 `<?!= include('JavaScript'); ?>`로 포함

---

#### Stylesheet.html
**역할**: 공통 CSS 스타일 (AJ 디자인 시스템 v3.0 기반)

##### 주요 내용
- **디자인 토큰**: CSS 변수로 색상, 타이포그래피, 간격, 보더 반경, 그림자 정의
- **컴포넌트 스타일**: 버튼, 카드, 폼, 테이블, 배지, 네비게이션 바
- **애니메이션**: fadeIn, slideIn 트랜지션
- **반응형 디자인**: 모바일 최적화
- **성능 최적화**: GPU 가속, 이미지 최적화

##### 사용 위치
- 모든 HTML 페이지에서 `<?!= include('Stylesheet'); ?>`로 포함

---

### 3.2 페이지 파일

#### LoginPage.html
**역할**: 로그인 페이지

##### 주요 기능
- 사용자 ID/PW 입력
- 로그인 처리 (`login()` API 호출)
- 성공 시 역할별 대시보드로 리다이렉트
- 세션 토큰 저장

##### 데이터 흐름
```
사용자 입력 → login(userId, password) → Auth.gs → SessionManager.createSession()
→ sessionToken 반환 → sessionStorage 저장 → 역할별 대시보드로 이동
```

##### 연관 파일
- `Code.gs`: `login()`
- `Auth.gs`: `SessionManager`
- `UserDashboard.html` / `AdminDashboardPage.html`: 리다이렉트 대상

---

#### UserDashboard.html
**역할**: 사용자 대시보드

##### 주요 기능
- 통계 카드 표시 (접수중, 진행중, 완료, 전체)
- 최근 신청 내역 (최대 5건)
- 중요 알림 목록
- 빠른 액션 버튼 (새 신청, 내 신청 목록, 내 정보)

##### 데이터 흐름
```
페이지 로드 → getDashboardData(sessionToken) → Code.gs
→ RequestModel.findAll() → 통계 계산, 최근 신청, 알림 생성
→ 클라이언트 렌더링
```

##### API 호출
- `getDashboardData(sessionToken)`: 배치 API (통계, 최근 신청, 알림)
- `getCurrentUser(sessionToken)`: 사용자 정보 (캐시 확인)

##### 연관 파일
- `Code.gs`: `getDashboardData()`, `getCurrentUser()`
- `Models.gs`: `RequestModel`
- `NewRequestPage.html`: 새 신청 등록
- `MyRequestsPage.html`: 내 신청 목록
- `MyInfoPage.html`: 내 정보

---

#### AdminDashboardPage.html
**역할**: 관리자 대시보드

##### 주요 기능
- 기간별 통계 (일별/주별/월별/분기별)
- 긴급 처리 필요 건 (1일 이상 경과)
- 지연 건 (3일 이상 경과)
- 빠른 액션 버튼

##### 데이터 흐름
```
페이지 로드 → getAdminDashboardData(sessionToken) → Code.gs
→ getDashboardStats(), getUrgentRequests(), getDelayedRequests()
→ RequestModel.findAll() → 필터링 및 계산
→ 클라이언트 렌더링
```

##### API 호출
- `getAdminDashboardData(sessionToken)`: 배치 API
- `getDashboardStats(sessionToken, period)`: 기간별 통계
- `getUrgentRequests(sessionToken)`: 긴급 건
- `getDelayedRequests(sessionToken)`: 지연 건

##### 연관 파일
- `Code.gs`: `getAdminDashboardData()`, `getDashboardStats()`, `getUrgentRequests()`, `getDelayedRequests()`
- `Models.gs`: `RequestModel`
- `AdminPage.html`: 전체 신청 목록
- `AdminStatisticsPage.html`: 통계 및 리포트

---

#### NewRequestPage.html
**역할**: 신청 등록 페이지

##### 주요 기능
- 부품 정보 입력 (품명, 모델명, 수량, 관리번호 등)
- 사진 첨부 (촬영/파일 선택, 리사이징)
- 수령 정보 입력 (배송지, 연락처)
- 신청 제출

##### 데이터 흐름
```
사용자 입력 → 사진 Base64 인코딩 → createRequest(formData, sessionToken)
→ Code.gs → RequestService.createRequest()
→ 검증 → 중복 체크 → 신청번호 생성 → 사진 업로드 (Drive)
→ RequestModel.create() → Google Sheets 저장
→ 성공 응답 → 모달 표시 → 대시보드로 이동
```

##### API 호출
- `createRequest(formData, sessionToken)`: 신청 생성
- `getCodeList('region')`: 지역 코드 목록
- `getCodeList('team')`: 소속팀 코드 목록

##### 연관 파일
- `Code.gs`: `createRequest()`
- `Services.gs`: `RequestService.createRequest()`
- `Models.gs`: `RequestModel`, `CodeModel`
- `UserDashboard.html`: 제출 후 이동

---

#### MyRequestsPage.html
**역할**: 내 신청 목록 페이지

##### 주요 기능
- 내 신청 목록 조회 (필터링, 페이징)
- 상태별 탭 (전체, 접수중, 진행중, 완료)
- 검색 (키워드, 날짜 범위)
- 정렬 기능
- 액션 버튼 (취소, 수령확인)

##### 데이터 흐름
```
페이지 로드 → getMyRequests(filter, sessionToken) → Code.gs
→ RequestModel.findAll({ requesterUserId }) → 필터링
→ 클라이언트 페이징/정렬 → 테이블 렌더링
```

##### API 호출
- `getMyRequests(filter, sessionToken)`: 신청 목록 조회
- `cancelRequest(requestNo, sessionToken)`: 신청 취소
- `confirmReceipt(requestNo, sessionToken)`: 수령 확인

##### 연관 파일
- `Code.gs`: `getMyRequests()`, `cancelRequest()`, `confirmReceipt()`
- `Models.gs`: `RequestModel`
- `RequestDetailPage.html`: 상세 조회

---

#### RequestDetailPage.html
**역할**: 신청 상세 조회 페이지 (사용자)

##### 주요 기능
- 신청 상세 정보 표시
- 사진 미리보기
- 상태별 액션 버튼 (취소, 수령확인)

##### 데이터 흐름
```
페이지 로드 → getRequest(requestNo, sessionToken) → Code.gs
→ RequestModel.findById() → 상세 정보 반환
→ 클라이언트 렌더링
```

##### API 호출
- `getRequest(requestNo, sessionToken)`: 신청 상세 조회
- `cancelRequest(requestNo, sessionToken)`: 신청 취소
- `confirmReceipt(requestNo, sessionToken)`: 수령 확인

##### 연관 파일
- `Code.gs`: `getRequest()`, `cancelRequest()`, `confirmReceipt()`
- `Models.gs`: `RequestModel`

---

#### AdminPage.html
**역할**: 전체 신청 목록 페이지 (관리자)

##### 주요 기능
- 전체 신청 목록 조회 (필터링, 페이징)
- 상태별/지역별 필터링
- 일괄 처리 (상태 변경, 담당자 배정)
- 상세 관리 페이지로 이동

##### 데이터 흐름
```
페이지 로드 → getAllRequests(filter, sessionToken) → Code.gs
→ RequestModel.findAll() → 서버 측 필터링/페이징
→ 클라이언트 렌더링
```

##### API 호출
- `getAllRequests(filter, sessionToken)`: 전체 신청 목록
- `getCodeList('status')`: 상태 코드 목록
- `getCodeList('region')`: 지역 코드 목록
- `bulkUpdateStatus(...)`: 일괄 상태 변경
- `assignHandler(...)`: 담당자 배정

##### 연관 파일
- `Code.gs`: `getAllRequests()`, `bulkUpdateStatus()`, `assignHandler()`
- `Models.gs`: `RequestModel`, `CodeModel`
- `AdminRequestDetailPage.html`: 상세 관리

---

#### AdminRequestDetailPage.html
**역할**: 신청 상세 관리 페이지 (관리자)

##### 주요 기능
- 신청 상세 정보 표시 및 수정
- 상태 변경 (접수중 → 발주진행 → 처리완료)
- 담당자 배정
- 발주 정보 입력 (발주일, 예상납기일)
- 비고 작성

##### 데이터 흐름
```
페이지 로드 → getRequest(requestNo, sessionToken) → Code.gs
→ RequestModel.findById() → 상세 정보 반환
→ 사용자 수정 → updateRequestStatus(...) → Code.gs
→ RequestService.updateStatus() → RequestModel.update()
→ Google Sheets 업데이트 → 캐시 무효화
```

##### API 호출
- `getRequest(requestNo, sessionToken)`: 신청 상세 조회
- `updateRequestStatus(...)`: 상태 변경
- `assignHandler(...)`: 담당자 배정
- `getCodeList('status')`: 상태 코드 목록

##### 연관 파일
- `Code.gs`: `getRequest()`, `updateRequestStatus()`, `assignHandler()`
- `Services.gs`: `RequestService.updateStatus()`
- `Models.gs`: `RequestModel`

---

#### AdminStatisticsPage.html
**역할**: 통계 및 리포트 페이지 (관리자)

##### 주요 기능
- 상태별 분포 차트 (Chart.js)
- 지역별 통계
- 일별 추이 그래프
- Excel 내보내기

##### 데이터 흐름
```
페이지 로드 → getDashboardStats(sessionToken, period) → Code.gs
→ RequestModel.findAll() → 통계 계산
→ Chart.js로 차트 렌더링
```

##### API 호출
- `getDashboardStats(sessionToken, period)`: 기간별 통계
- `getAllRequests(filter, sessionToken)`: 전체 신청 목록 (통계용)

##### 연관 파일
- `Code.gs`: `getDashboardStats()`, `getAllRequests()`
- `Models.gs`: `RequestModel`

---

#### AdminMasterPage.html
**역할**: 기준정보 관리 페이지 (관리자)

##### 주요 기능
- 사용자 관리 (CSV 업로드)
- 배송지 관리 (CSV 업로드)
- 코드 관리 (CSV 업로드)
- 신청 내역 마스터 다운로드 (Excel)

##### 데이터 흐름
```
CSV 파일 선택 → 파일 읽기 → parseCSV() → validateData()
→ Models 업데이트 → Google Sheets 저장
```

##### API 호출
- `uploadUsers(csvData)`: 사용자 업로드
- `uploadDeliveryPlaces(csvData)`: 배송지 업로드
- `uploadCodes(csvData)`: 코드 업로드
- `downloadMasterData()`: 마스터 데이터 다운로드

##### 연관 파일
- `Code.gs`: `uploadUsers()`, `uploadDeliveryPlaces()`, `uploadCodes()`
- `Models.gs`: `UserModel`, `CodeModel`

---

#### MyInfoPage.html
**역할**: 내 정보 페이지

##### 주요 기능
- 사용자 정보 표시
- 비밀번호 변경

##### 데이터 흐름
```
페이지 로드 → getCurrentUser(sessionToken) → Code.gs
→ UserModel.findByUserId() → 사용자 정보 반환
→ 비밀번호 변경 → changePassword(...) → Code.gs
→ Auth.gs (비밀번호 해시) → UserModel.update()
```

##### API 호출
- `getCurrentUser(sessionToken)`: 사용자 정보 조회
- `changePassword(oldPassword, newPassword, sessionToken)`: 비밀번호 변경

##### 연관 파일
- `Code.gs`: `getCurrentUser()`, `changePassword()`
- `Auth.gs`: 비밀번호 해시/검증
- `Models.gs`: `UserModel`

---

#### Unauthorized.html
**역할**: 권한 없음 페이지

##### 주요 기능
- 권한 부족 안내
- 로그인 페이지로 이동

---

## 4. 파일 간 연관도

### 4.1 서버 사이드 연관도

```
Code.gs (메인 컨트롤러)
├── Auth.gs (인증)
│   └── Models.gs (UserModel)
├── Services.gs (비즈니스 로직)
│   ├── Models.gs (RequestModel, UserModel)
│   └── Utils.gs (formatDate)
├── Models.gs (데이터 접근)
│   └── Config.gs (CONFIG.SHEETS)
├── Utils.gs (유틸리티)
│   └── Config.gs (CONFIG)
└── Triggers.gs (자동화)
    ├── Models.gs (RequestModel, UserModel)
    └── Utils.gs (formatDate)
```

### 4.2 클라이언트 사이드 연관도

```
모든 HTML 페이지
├── JavaScript.html (공통 JS)
│   └── Code.gs (callServer로 API 호출)
├── Stylesheet.html (공통 CSS)
└── Code.gs (doGet으로 페이지 라우팅)
```

### 4.3 페이지 간 네비게이션

```
LoginPage
├── UserDashboard (신청자)
│   ├── NewRequestPage
│   ├── MyRequestsPage
│   │   └── RequestDetailPage
│   └── MyInfoPage
└── AdminDashboardPage (관리자)
    ├── AdminPage
    │   └── AdminRequestDetailPage
    ├── AdminStatisticsPage
    └── AdminMasterPage
```

---

## 5. 데이터 흐름도

### 5.1 전체 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    클라이언트 (브라우저)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  HTML Pages  │  │  JavaScript  │  │  Stylesheet  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘  │
│         │                  │                             │
│         └──────────┬───────┘                             │
│                    │ google.script.run                   │
└────────────────────┼─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│              Google Apps Script                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Code.gs    │──│  Services.gs │──│  Models.gs   │  │
│  │ (Controller) │  │ (Business)   │  │   (DAL)      │  │
│  └──────┬───────┘  └──────────────┘  └──────┬───────┘  │
│         │                                     │          │
│  ┌──────▼───────┐                    ┌────────▼────────┐ │
│  │   Auth.gs    │                    │  Google Sheets │ │
│  │  (Session)   │                    │   (Database)    │ │
│  └──────┬───────┘                    └────────────────┘ │
│         │                                               │
│  ┌──────▼───────┐                    ┌────────────────┐ │
│  │  CacheService│                    │  Google Drive  │ │
│  │  (Session)   │                    │  (File Store)   │ │
│  └──────────────┘                    └────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 5.2 요청 처리 흐름

```
1. 클라이언트 요청
   ↓
2. Code.gs (doGet 또는 API 함수)
   ↓
3. Auth.gs (세션 확인)
   ↓
4. Services.gs (비즈니스 로직)
   ↓
5. Models.gs (데이터 접근)
   ↓
6. Google Sheets (데이터 읽기/쓰기)
   ↓
7. 응답 반환
   ↓
8. 클라이언트 렌더링
```

---

## 6. 주요 기능별 데이터 흐름

### 6.1 로그인 프로세스

```
[LoginPage.html]
  ↓ 사용자 입력 (userId, password)
[callServer('login', userId, password)]
  ↓
[Code.gs: login()]
  ↓
[Auth.gs: login()]
  ├── UserModel.findByUserId(userId)
  ├── verifyPassword(password, hash)
  └── SessionManager.createSession()
      └── CacheService.put(sessionToken)
  ↓
[반환: {success: true, sessionToken}]
  ↓
[sessionStorage.setItem('sessionToken')]
  ↓
[역할별 대시보드로 리다이렉트]
```

### 6.2 신청 생성 프로세스

```
[NewRequestPage.html]
  ↓ 사용자 입력 (품명, 수량, 사진 등)
[uploadPhoto() → Base64 인코딩]
  ↓
[callServer('createRequest', formData, sessionToken)]
  ↓
[Code.gs: createRequest()]
  ├── getCurrentUser(sessionToken)
  └── RequestService.createRequest()
      ├── _validateRequestData()
      ├── _checkDuplicateRequest()
      ├── _generateRequestNo()
      ├── _uploadPhoto() → Google Drive
      └── RequestModel.create()
          └── Google Sheets 저장
  ↓
[반환: {success: true, requestNo}]
  ↓
[성공 모달 표시 → UserDashboard로 이동]
```

### 6.3 대시보드 데이터 로딩

```
[UserDashboard.html]
  ↓ 페이지 로드
[callServer('getDashboardData', sessionToken)]
  ↓
[Code.gs: getDashboardData()]
  ├── 캐시 확인 (CacheManager)
  ├── RequestModel.findAll({ requesterUserId })
  ├── 통계 계산 (메모리에서)
  ├── 최근 신청 추출 (최대 5건)
  └── 알림 생성 (최근 7일 이내)
  ↓
[반환: {stats, recentRequests, notifications}]
  ↓
[클라이언트 렌더링]
  ├── 통계 카드 표시
  ├── 최근 신청 테이블 표시
  └── 알림 목록 표시
```

### 6.4 상태 변경 프로세스

```
[AdminRequestDetailPage.html]
  ↓ 관리자 입력 (상태, 비고 등)
[callServer('updateRequestStatus', ...)]
  ↓
[Code.gs: updateRequestStatus()]
  ├── getCurrentUser() (관리자 확인)
  └── RequestService.updateStatus()
      ├── RequestModel.findById()
      ├── RequestModel.update()
      └── LogService.log()
  ↓
[캐시 무효화]
  ├── CacheManager.remove('request_' + requestNo)
  └── CacheManager.remove('request_stats_' + userId)
  ↓
[반환: {success: true}]
  ↓
[성공 토스트 → 페이지 새로고침]
```

### 6.5 파일 업로드 프로세스

```
[AdminMasterPage.html]
  ↓ CSV 파일 선택
[FileReader.readAsText()]
  ↓
[parseCSV() → 데이터 파싱]
  ↓
[validateData() → 데이터 검증]
  ↓
[callServer('uploadUsers', csvData)]
  ↓
[Code.gs: uploadUsers()]
  ├── CSV 파싱
  ├── 데이터 검증
  └── UserModel.bulkCreate()
      └── Google Sheets 업데이트
  ↓
[반환: {success: true, count}]
  ↓
[성공 토스트 → 페이지 새로고침]
```

---

## 7. 캐싱 전략

### 7.1 서버 측 캐싱 (CacheService)

| 캐시 키 | 데이터 | TTL | 무효화 시점 |
|---------|--------|-----|------------|
| `session_{token}` | 세션 데이터 | 1시간 | 로그아웃 시 |
| `dashboard_data_{userId}` | 대시보드 데이터 | 30초 | 신청 생성/수정 시 |
| `request_stats_{userId}` | 통계 데이터 | 60초 | 신청 생성/수정 시 |
| `all_requests_{filter}` | 전체 신청 목록 | 60초 | 신청 생성/수정 시 |
| `codes_{type}` | 코드 목록 | 10분 | 코드 업데이트 시 |

### 7.2 클라이언트 측 캐싱 (MemoryCache)

| 캐시 타입 | 데이터 | TTL | 용도 |
|-----------|--------|-----|------|
| API 응답 | 서버 응답 | 1분 | 중복 요청 방지 |
| HTML 이스케이프 | 이스케이프된 문자열 | 무제한 | 성능 최적화 |
| 날짜 포맷팅 | 포맷팅된 날짜 | 무제한 | 성능 최적화 |
| 배지 생성 | 생성된 HTML | 무제한 | 성능 최적화 |

---

## 8. 에러 처리 흐름

```
에러 발생
  ↓
[ErrorHandler.handle(error, context)]
  ├── Logger.log() (서버 로그)
  ├── console.error() (Stackdriver)
  └── _getUserFriendlyMessage() (사용자 친화적 메시지)
  ↓
[반환: {success: false, message, technical}]
  ↓
[클라이언트: handleError()]
  └── showToast(message, 'danger')
```

---

## 9. 성능 최적화 포인트

### 9.1 서버 측
- **배치 API**: `getDashboardData()` - 단일 호출로 모든 데이터 조회
- **서버 측 필터링**: `RequestModel.findAll()` - 클라이언트 전송량 감소
- **캐싱**: `CacheManager` - 자주 조회되는 데이터 캐싱
- **단일 데이터 읽기**: `getDataRange().getValues()` - N회 호출 → 1회 호출

### 9.2 클라이언트 측
- **메모리 캐싱**: `MemoryCache` - API 응답 캐싱
- **디바운싱/쓰로틀링**: 불필요한 함수 호출 감소
- **배치 요청**: `BatchRequestManager` - 여러 요청을 하나로 묶기
- **렌더링 최적화**: HTML 이스케이프, 날짜 포맷팅 캐싱

---

## 10. 보안 고려사항

### 10.1 인증
- 세션 토큰 기반 인증 (CacheService)
- 비밀번호 SHA-256 해시 저장
- 세션 TTL: 1시간

### 10.2 권한
- 역할 기반 접근 제어 (RBAC)
- 관리자 전용 API: `user.role === CONFIG.ROLES.ADMIN` 체크

### 10.3 데이터 보호
- XSS 방지: `escapeHtml()` 사용
- 입력 검증: `Validator` 클래스
- 에러 메시지: 기술적 세부사항 숨김

---

**최종 업데이트**: 2026-01-27  
**버전**: v1.0  
**작성자**: AI Assistant
