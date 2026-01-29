# 📘 상세 기술 명세서 (Technical Specification)

## 📋 목차
- [1. 시스템 개요](#1-시스템-개요)
- [2. 아키텍처](#2-아키텍처)
- [3. 기술 스택 상세](#3-기술-스택-상세)
- [4. 데이터 모델](#4-데이터-모델)
- [5. 비즈니스 로직](#5-비즈니스-로직)
- [6. API 명세](#6-api-명세)
- [7. 인증 및 보안](#7-인증-및-보안)
- [8. 데이터 흐름](#8-데이터-흐름)
- [9. 클라이언트-서버 통신](#9-클라이언트-서버-통신)
- [10. 성능 최적화](#10-성능-최적화)
- [11. 에러 처리](#11-에러-처리)
- [12. 자동화 및 트리거](#12-자동화-및-트리거)
- [13. 파일 구조](#13-파일-구조)
- [14. 배포 및 운영](#14-배포-및-운영)

---

## 1. 시스템 개요

### 1.1 프로젝트명
**부품발주시스템 (Parts Ordering System)**

### 1.2 목적
- 부품 발주 신청의 디지털화 및 자동화
- 신청부터 수령까지 전 과정 추적
- 관리자의 효율적인 신청 관리 및 통계 분석

### 1.3 주요 기능
1. **사용자 기능**
   - 부품 발주 신청 등록
   - 내 신청 목록 조회
   - 신청 상세 조회
   - 수령 확인
   - 신청 취소 (접수중 상태만)

2. **관리자 기능**
   - 전체 신청 목록 조회 및 필터링
   - 신청 상태 변경
   - 담당자 배정
   - 발주 정보 입력
   - 통계 및 리포트 조회
   - 긴급/지연 건 모니터링

### 1.4 기술 환경
- **플랫폼**: Google Apps Script (GAS)
- **데이터베이스**: Google Sheets
- **파일 저장소**: Google Drive
- **인증**: 세션 기반 (CacheService)
- **프론트엔드**: HTML5, JavaScript (ES6+), Bootstrap 5.3.2

---

## 2. 아키텍처

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                    클라이언트 (브라우저)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  HTML Pages  │  │  JavaScript  │  │   Bootstrap  │  │
│  │  (Views)     │  │  (ES6+)      │  │     5.3.2    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          │  google.script.run                 │
          │  (비동기 호출)                      │
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼─────────┐
│         │                  │                  │         │
│  ┌──────▼──────────────────▼──────────────────▼──────┐  │
│  │         Google Apps Script (서버)                  │  │
│  │  ┌──────────────┐  ┌──────────────┐              │  │
│  │  │   Code.gs    │  │  Services.gs │              │  │
│  │  │  (API Layer) │  │  (Business)   │              │  │
│  │  └──────┬───────┘  └──────┬───────┘              │  │
│  │         │                 │                       │  │
│  │  ┌──────▼─────────────────▼───────┐              │  │
│  │  │         Models.gs               │              │  │
│  │  │      (Data Access Layer)       │              │  │
│  │  └──────┬─────────────────────────┘              │  │
│  │         │                                         │  │
│  │  ┌──────▼──────────┐  ┌──────────────┐          │  │
│  │  │  Google Sheets  │  │  Google Drive │          │  │
│  │  │   (Database)    │  │  (Storage)    │          │  │
│  │  └─────────────────┘  └───────────────┘          │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Auth.gs (인증)  │  Utils.gs  │  Triggers.gs    │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 2.2 레이어 구조

#### 2.2.1 프레젠테이션 레이어 (Presentation Layer)
- **위치**: `apps-script/Views/*.html`
- **역할**: 사용자 인터페이스 렌더링
- **기술**: HTML5, JavaScript (ES6+), Bootstrap 5.3.2

#### 2.2.2 API 레이어 (API Layer)
- **위치**: `apps-script/Code.gs`
- **역할**: 클라이언트 요청 처리 및 라우팅
- **주요 함수**: `doGet()`, `getCurrentUser()`, `createRequest()`, `getAllRequests()` 등

#### 2.2.3 비즈니스 로직 레이어 (Business Logic Layer)
- **위치**: `apps-script/Services.gs`
- **역할**: 핵심 비즈니스 로직 처리
- **주요 클래스**: `RequestService`, `LogService`

#### 2.2.4 데이터 접근 레이어 (Data Access Layer)
- **위치**: `apps-script/Models.gs`
- **역할**: Google Sheets 데이터 CRUD 작업
- **주요 클래스**: `RequestModel`, `UserModel`, `CodeModel`

#### 2.2.5 인증 레이어 (Authentication Layer)
- **위치**: `apps-script/Auth.gs`
- **역할**: 사용자 인증 및 세션 관리
- **주요 클래스**: `SessionManager`

---

## 3. 기술 스택 상세

### 3.1 서버 사이드 (Google Apps Script)

#### 3.1.1 핵심 서비스
| 서비스 | 용도 | 설명 |
|--------|------|------|
| `SpreadsheetApp` | 데이터베이스 접근 | Google Sheets 읽기/쓰기 |
| `DriveApp` | 파일 저장 | 사진 업로드 및 관리 |
| `CacheService` | 세션 관리 | 사용자 세션 토큰 저장 (TTL: 1시간) |
| `HtmlService` | HTML 렌더링 | 클라이언트 HTML 생성 |
| `MailApp` | 이메일 전송 | 알림 및 리포트 전송 |
| `Utilities` | 유틸리티 | 날짜 포맷팅, 해시 생성 등 |
| `ScriptApp` | 트리거 관리 | 자동화 스크립트 실행 |
| `PropertiesService` | 설정 저장 | 시스템 설정 저장 |

#### 3.1.2 주요 API 함수
```javascript
// 진입점
doGet(e) // 웹 앱 진입점, 페이지 라우팅

// 인증
login(userId, password) // 로그인
logout(sessionToken) // 로그아웃
getCurrentUser(sessionToken) // 현재 사용자 조회

// 신청 관리
createRequest(formData, sessionToken) // 신청 생성
getMyRequests(filter, sessionToken) // 내 신청 목록
getAllRequests(filter, sessionToken) // 전체 신청 목록 (관리자)
getRequest(requestNo, sessionToken) // 신청 상세 조회
updateRequestStatus(requestNo, newStatus, remarks, sessionToken) // 상태 변경
confirmReceipt(requestNo, sessionToken) // 수령 확인
cancelRequest(requestNo, sessionToken) // 신청 취소

// 통계
getRequestStats(sessionToken) // 사용자 통계
getDashboardStats(sessionToken) // 관리자 대시보드 통계
getUrgentRequests(sessionToken) // 긴급 건 조회
getDelayedRequests(sessionToken) // 지연 건 조회

// 코드 관리
getCodeList(type) // 코드 목록 조회 (지역, 팀, 상태)
```

### 3.2 클라이언트 사이드

#### 3.2.1 HTML 템플릿
- **템플릿 엔진**: `HtmlService.createTemplateFromFile()`
- **공통 파일**: `JavaScript.html`, `Stylesheet.html`
- **페이지별 파일**: `LoginPage.html`, `NewRequestPage.html`, `AdminPage.html` 등

#### 3.2.2 JavaScript (ES6+)
- **비동기 처리**: `Promise`, `async/await`
- **서버 통신**: `google.script.run`
- **상태 관리**: `sessionStorage`, `localStorage`
- **UI 프레임워크**: Bootstrap 5.3.2

#### 3.2.3 주요 클라이언트 함수
```javascript
// 공통 유틸리티 (JavaScript.html)
callServer(functionName, ...args) // 서버 함수 비동기 호출
showLoading(message) // 로딩 오버레이 표시
hideLoading() // 로딩 오버레이 숨김
showToast(message, type) // 토스트 알림 표시
escapeHtml(text) // XSS 방지
formatDate(dateString) // 날짜 포맷팅

// 세션 관리
getSessionToken() // URL 파라미터 또는 sessionStorage에서 토큰 가져오기
```

### 3.3 데이터베이스 (Google Sheets)

#### 3.3.1 스프레드시트 구조

시스템은 하나의 Google 스프레드시트 파일에 여러 시트를 사용합니다.

**시트 목록**:
- `신청내역` (REQUESTS): 부품 발주 신청 데이터
- `사용자관리` (USERS): 사용자 계정 정보
- `코드관리` (CODES): 지역, 팀, 상태 코드
- `로그` (LOGS): 시스템 로그
- `대시보드` (DASHBOARD): 대시보드 데이터 (미사용)

#### 3.3.2 신청내역 시트 (REQUESTS)

##### 컬럼 구조 (25개 컬럼)

| 컬럼 순서 | 컬럼명 | 타입 | 설명 | 필수 | 저장 방법 |
|----------|--------|------|------|------|----------|
| A (1) | 신청번호 | String | YYMMDD0001 형식 | ✅ | `appendRow()` 또는 `setValue()` |
| B (2) | 신청일시 | Date | 신청 생성 일시 | ✅ | `new Date()` 객체로 저장 |
| C (3) | 신청자ID | String | 사용자 ID (로그인 ID) | ✅ | 문자열로 저장 |
| D (4) | 신청자이름 | String | 사용자 이름 | ✅ | 문자열로 저장 |
| E (5) | 기사코드 | String | 기사 코드 | ❌ | 문자열로 저장 |
| F (6) | 소속팀 | String | 소속팀 | ✅ | 문자열로 저장 |
| G (7) | 지역 | String | 지역 | ✅ | 문자열로 저장 |
| H (8) | 품명 | String | 부품명 | ✅ | 문자열로 저장 |
| I (9) | 모델명 | String | 모델명 | ❌ | 문자열로 저장 |
| J (10) | 시리얼번호 | String | 시리얼번호 | ❌ | 문자열로 저장 |
| K (11) | 수량 | Number | 수량 | ✅ | 숫자로 저장 |
| L (12) | 관리번호 | String | 장비 관리번호 | ✅ | 문자열로 저장 |
| M (13) | 수령지 | String | 수령지 | ✅ | 문자열로 저장 |
| N (14) | 전화번호 | String | 전화번호 | ❌ | 문자열로 저장 |
| O (15) | 업체명 | String | 업체명 | ❌ | 문자열로 저장 |
| P (16) | 비고 | String | 비고 | ❌ | 문자열로 저장 |
| Q (17) | 사진URL | String | Google Drive URL | ❌ | 문자열로 저장 |
| R (18) | 상태 | String | 접수중/접수완료/발주진행/발주지연/발주완료/처리완료/접수취소 | ✅ | 문자열로 저장 |
| S (19) | 접수담당자 | String | 담당자 이름 | ❌ | 문자열로 저장 |
| T (20) | 담당자비고 | String | 담당자 비고 | ❌ | 문자열로 저장 |
| U (21) | 발주일시 | Date | 발주 일시 | ❌ | `new Date()` 객체로 저장 |
| V (22) | 예상납기일 | Date | 예상 납기일 | ❌ | `new Date()` 객체로 저장 |
| W (23) | 수령확인일시 | Date | 수령 확인 일시 | ❌ | `new Date()` 객체로 저장 |
| X (24) | 최종수정일시 | Date | 최종 수정 일시 | ✅ | `new Date()` 객체로 저장 |
| Y (25) | 최종수정자 | String | 최종 수정자 ID | ✅ | 문자열로 저장 |

##### 데이터 읽기 방법

```javascript
// 1. 전체 데이터 읽기
const sheet = SpreadsheetApp.getActiveSpreadsheet()
  .getSheetByName(CONFIG.SHEETS.REQUESTS);
const data = sheet.getDataRange().getValues(); // 2차원 배열 반환

// data[0]: 헤더 행
// data[1] ~ data[n]: 데이터 행

// 2. 헤더와 데이터 분리
const headers = data[0];
const rows = data.slice(1);

// 3. 행을 객체로 변환
rows.forEach((row, index) => {
  const obj = {};
  headers.forEach((header, colIndex) => {
    obj[header] = row[colIndex];
  });
  // obj = { '신청번호': '2601070001', '신청일시': Date, ... }
});
```

##### 데이터 쓰기 방법

```javascript
// 1. 새 행 추가 (신청 생성)
const requestData = {
  requestNo: '2601070001',
  requestDate: new Date(),
  requesterEmail: 'user@example.com',
  requesterName: '홍길동',
  // ... 기타 필드
};

// 객체를 행 배열로 변환
const row = [
  requestData.requestNo,
  requestData.requestDate,
  requestData.requesterEmail,
  requestData.requesterName,
  // ... 기타 필드
];

// 시트에 추가
sheet.appendRow(row);

// 2. 특정 셀 수정 (상태 변경 등)
const requestNo = '2601070001';
const data = sheet.getDataRange().getValues();

// 신청번호로 행 찾기
for (let i = 1; i < data.length; i++) {
  if (String(data[i][0]) === requestNo) {
    // 상태 변경 (R열 = 18번째 컬럼)
    sheet.getRange(i + 1, 18).setValue('발주진행');
    // 발주일시 기록 (U열 = 21번째 컬럼)
    sheet.getRange(i + 1, 21).setValue(new Date());
    // 최종수정일시 (X열 = 24번째 컬럼)
    sheet.getRange(i + 1, 24).setValue(new Date());
    // 최종수정자 (Y열 = 25번째 컬럼)
    sheet.getRange(i + 1, 25).setValue('admin');
    break;
  }
}
```

##### 컬럼 인덱스 매핑

```javascript
_getColumnIndex(key) {
  const reverseMap = {
    'requestNo': 0,           // A열 (1)
    'requestDate': 1,          // B열 (2)
    'requesterEmail': 2,       // C열 (3)
    'requesterName': 3,        // D열 (4)
    'employeeCode': 4,         // E열 (5)
    'team': 5,                 // F열 (6)
    'region': 6,               // G열 (7)
    'itemName': 7,             // H열 (8)
    'modelName': 8,            // I열 (9)
    'serialNo': 9,             // J열 (10)
    'quantity': 10,            // K열 (11)
    'assetNo': 11,             // L열 (12)
    'deliveryPlace': 12,       // M열 (13)
    'phone': 13,               // N열 (14)
    'company': 14,             // O열 (15)
    'remarks': 15,             // P열 (16)
    'photoUrl': 16,            // Q열 (17)
    'status': 17,              // R열 (18)
    'handler': 18,             // S열 (19)
    'handlerRemarks': 19,      // T열 (20)
    'orderDate': 20,           // U열 (21)
    'expectedDeliveryDate': 21, // V열 (22)
    'receiptDate': 22,         // W열 (23)
    'lastModified': 23,        // X열 (24)
    'lastModifiedBy': 24      // Y열 (25)
  };
  return reverseMap[key] !== undefined ? reverseMap[key] : -1;
}
```

#### 3.3.3 사용자관리 시트 (USERS)

##### 컬럼 구조 (8개 컬럼)

| 컬럼 순서 | 컬럼명 | 타입 | 설명 | 필수 | 저장 방법 |
|----------|--------|------|------|------|----------|
| A (1) | 사용자ID | String | 로그인 ID | ✅ | 문자열로 저장 |
| B (2) | 비밀번호해시 | String | SHA-256 해시 (64자) | ✅ | 문자열로 저장 |
| C (3) | 이름 | String | 사용자 이름 | ✅ | 문자열로 저장 |
| D (4) | 기사코드 | String | 기사 코드 | ❌ | 문자열로 저장 |
| E (5) | 소속팀 | String | 소속팀 | ✅ | 문자열로 저장 |
| F (6) | 지역 | String | 지역 | ✅ | 문자열로 저장 |
| G (7) | 역할 | String | 신청자/관리자 | ✅ | 문자열로 저장 |
| H (8) | 활성화 | String | Y/N | ✅ | 문자열로 저장 |

##### 데이터 읽기 방법

```javascript
// 사용자 ID로 조회
const sheet = SpreadsheetApp.getActiveSpreadsheet()
  .getSheetByName(CONFIG.SHEETS.USERS);
const data = sheet.getDataRange().getValues();

for (let i = 1; i < data.length; i++) {
  if (data[i][0] === userId && data[i][7] === 'Y') { // 활성화된 사용자만
    return {
      userId: data[i][0],        // A열
      passwordHash: data[i][1],  // B열
      name: data[i][2],          // C열
      employeeCode: data[i][3],  // D열
      team: data[i][4],          // E열
      region: data[i][5],        // F열
      role: data[i][6],          // G열
      active: data[i][7]         // H열
    };
  }
}
```

##### 데이터 쓰기 방법

```javascript
// 비밀번호 업데이트
const sheet = SpreadsheetApp.getActiveSpreadsheet()
  .getSheetByName(CONFIG.SHEETS.USERS);
const data = sheet.getDataRange().getValues();

for (let i = 1; i < data.length; i++) {
  if (data[i][0] === userId) {
    // B열 (2번째 컬럼)에 새 해시 저장
    sheet.getRange(i + 1, 2).setValue(newPasswordHash);
    return true;
  }
}
```

#### 3.3.4 코드관리 시트 (CODES)

##### 구조

이 시트는 여러 섹션으로 구성됩니다:

1. **지역 코드 섹션** (1행부터)
   - 컬럼: 코드, 이름, 활성화, 기타
   - 활성화 컬럼이 'Y'인 것만 조회

2. **소속팀 코드 섹션** (빈 행 이후)
   - 헤더: "코드", "팀명"
   - 컬럼: 코드, 팀명, 지역, 활성화
   - 활성화 컬럼이 'Y'인 것만 조회

3. **상태 코드 섹션** (빈 행 이후)
   - 헤더: "코드", "상태명"
   - 컬럼: 코드, 상태명, 활성화, 색상
   - 활성화 컬럼이 'Y'인 것만 조회

##### 데이터 읽기 방법

```javascript
// 지역 코드 조회
const sheet = SpreadsheetApp.getActiveSpreadsheet()
  .getSheetByName(CONFIG.SHEETS.CODES);
const data = sheet.getDataRange().getValues();

const regions = [];
for (let i = 1; i < data.length && i < 21; i++) {
  if (data[i][0] && data[i][2] === 'Y') { // 활성화된 것만
    regions.push({
      code: data[i][0],    // 코드
      name: data[i][1],    // 이름
      extra: data[i][3]    // 기타
    });
  }
}

// 소속팀 코드 조회
let startRow = -1;
for (let i = 0; i < data.length; i++) {
  if (data[i][0] === '코드' && data[i][1] === '팀명') {
    startRow = i;
    break;
  }
}

if (startRow !== -1) {
  for (let i = startRow + 1; i < data.length && i < startRow + 20; i++) {
    if (data[i][0] && data[i][3] === 'Y') {
      teams.push({
        code: data[i][0],      // 코드
        name: data[i][1],      // 팀명
        region: data[i][2]     // 지역
      });
    }
  }
}
```

#### 3.3.5 로그 시트 (LOGS)

##### 컬럼 구조 (6개 컬럼)

| 컬럼 순서 | 컬럼명 | 타입 | 설명 | 필수 | 저장 방법 |
|----------|--------|------|------|------|----------|
| A (1) | 일시 | Date | 로그 일시 | ✅ | `new Date()` 객체로 저장 |
| B (2) | 레벨 | String | INFO/ERROR | ✅ | 문자열로 저장 |
| C (3) | 액션 | String | 액션명 (예: "로그인", "신청 생성") | ✅ | 문자열로 저장 |
| D (4) | 신청번호 | String | 관련 신청번호 (없으면 빈 문자열) | ❌ | 문자열로 저장 |
| E (5) | 사용자 | String | 사용자 ID | ✅ | 문자열로 저장 |
| F (6) | 상세내용 | String | 상세 내용 | ❌ | 문자열로 저장 |

##### 데이터 쓰기 방법

```javascript
// 로그 기록
const sheet = SpreadsheetApp.getActiveSpreadsheet()
  .getSheetByName(CONFIG.SHEETS.LOGS);

sheet.appendRow([
  new Date(),           // 일시
  'INFO',               // 레벨
  '신청 생성',           // 액션
  requestNo || '',      // 신청번호
  userId,               // 사용자
  details || ''         // 상세내용
]);
```

#### 3.3.6 데이터 접근 패턴

##### 1. 전체 조회 (findAll)

```javascript
// RequestModel.findAll() 예시
findAll(filter = {}) {
  // 1. 시트에서 전체 데이터 읽기
  const data = this.sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  // 2. 헤더와 데이터 분리
  const headers = data[0];
  const rows = data.slice(1);
  
  // 3. 행을 객체로 변환
  const objects = rows.map((row, index) => {
    const obj = { _rowIndex: index + 2 }; // 시트 행 번호 (헤더 제외)
    headers.forEach((header, colIndex) => {
      const key = this._headerToKey(header); // '신청번호' → 'requestNo'
      obj[key] = row[colIndex];
    });
    return obj;
  });
  
  // 4. 필터 적용
  const filtered = objects.filter(obj => this._matchFilter(obj, filter));
  
  return filtered;
}
```

##### 2. ID로 조회 (findById)

```javascript
// RequestModel.findById() 예시
findById(requestNo) {
  const data = this.sheet.getDataRange().getValues();
  if (data.length <= 1) return null;
  
  const headers = data[0];
  const requestNoStr = String(requestNo); // 문자열로 변환
  
  // 첫 번째 컬럼(A열)에서 신청번호 검색
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === requestNoStr) {
      return this._rowToObject(headers, data[i], i + 1);
    }
  }
  
  return null;
}
```

##### 3. 데이터 생성 (create)

```javascript
// RequestModel.create() 예시
create(requestData) {
  // 1. 객체를 행 배열로 변환
  const row = this._objectToRow(requestData);
  
  // 2. 시트에 추가
  this.sheet.appendRow(row);
  
  return requestData;
}

_objectToRow(obj) {
  // 헤더 읽기
  const headers = this.sheet.getRange(1, 1, 1, this.sheet.getLastColumn())
    .getValues()[0];
  
  // 헤더 순서대로 값 매핑
  return headers.map(header => {
    const key = this._headerToKey(header);
    return obj[key] !== undefined ? obj[key] : '';
  });
}
```

##### 4. 데이터 수정 (update)

```javascript
// RequestModel.update() 예시
update(requestNo, updates) {
  const data = this.sheet.getDataRange().getValues();
  const requestNoStr = String(requestNo);
  
  // 신청번호로 행 찾기
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === requestNoStr) {
      // 업데이트할 필드들을 개별 셀에 저장
      Object.keys(updates).forEach(key => {
        const colIndex = this._getColumnIndex(key);
        if (colIndex >= 0) {
          // 시트 행 번호는 i + 1 (헤더 포함)
          // 컬럼 번호는 colIndex + 1 (1부터 시작)
          this.sheet.getRange(i + 1, colIndex + 1).setValue(updates[key]);
        }
      });
      return true;
    }
  }
  return false;
}
```

#### 3.3.7 헤더-키 매핑

시트의 한글 헤더를 코드의 영문 키로 변환:

```javascript
_headerToKey(header) {
  const map = {
    '신청번호': 'requestNo',
    '신청일시': 'requestDate',
    '신청자ID': 'requesterEmail',
    '신청자이름': 'requesterName',
    '기사코드': 'employeeCode',
    '소속팀': 'team',
    '지역': 'region',
    '품명': 'itemName',
    '모델명': 'modelName',
    '시리얼번호': 'serialNo',
    '수량': 'quantity',
    '관리번호': 'assetNo',
    '수령지': 'deliveryPlace',
    '전화번호': 'phone',
    '업체명': 'company',
    '비고': 'remarks',
    '사진URL': 'photoUrl',
    '상태': 'status',
    '접수담당자': 'handler',
    '담당자비고': 'handlerRemarks',
    '발주일시': 'orderDate',
    '예상납기일': 'expectedDeliveryDate',
    '수령확인일시': 'receiptDate',
    '최종수정일시': 'lastModified',
    '최종수정자': 'lastModifiedBy'
  };
  return map[header] || header;
}
```

#### 3.3.8 날짜 필터링

한국어 날짜 형식 파싱 및 필터링:

```javascript
_matchFilter(obj, filter) {
  // 날짜 필터링
  if (filter.dateFrom || filter.dateTo) {
    if (!obj.requestDate) return false;
    
    let reqDateStr;
    if (obj.requestDate instanceof Date) {
      // Date 객체인 경우
      reqDateStr = Utilities.formatDate(obj.requestDate, 'Asia/Seoul', 'yyyy-MM-dd');
    } else {
      // 문자열인 경우: "2026. 1. 7 오전 9:45:44" → "2026-01-07"
      const dateStr = String(obj.requestDate);
      if (dateStr.includes('.')) {
        const parts = dateStr.split(' ')[0].split('.').map(p => p.trim());
        if (parts.length >= 3) {
          const year = parts[0];
          const month = parts[1].padStart(2, '0');
          const day = parts[2].padStart(2, '0');
          reqDateStr = `${year}-${month}-${day}`;
        }
      }
    }
    
    // 문자열 비교 (YYYY-MM-DD 형식)
    if (filter.dateFrom && reqDateStr < filter.dateFrom) return false;
    if (filter.dateTo && reqDateStr > filter.dateTo) return false;
  }
  
  return true;
}
```

#### 3.3.9 성능 고려사항

1. **전체 데이터 읽기**: `getDataRange().getValues()`는 한 번에 모든 데이터를 메모리로 로드
   - 장점: 빠른 접근
   - 단점: 대량 데이터 시 메모리 사용량 증가

2. **인덱싱 없음**: Google Sheets는 자동 인덱싱을 제공하지 않음
   - `findById()`는 선형 검색 (O(n))
   - 대량 데이터 시 성능 저하 가능

3. **배치 업데이트**: 여러 셀을 한 번에 업데이트하는 것이 효율적
   ```javascript
   // ❌ 비효율적: 여러 번의 API 호출
   sheet.getRange(2, 1).setValue(value1);
   sheet.getRange(2, 2).setValue(value2);
   
   // ✅ 효율적: 한 번의 API 호출
   sheet.getRange(2, 1, 1, 2).setValues([[value1, value2]]);
   ```

4. **캐싱**: 자주 조회하는 데이터는 `CacheService` 사용
   - 코드 목록 등 변경 빈도가 낮은 데이터
   - TTL: 5분 (CONFIG.CACHE.TTL)

---

## 4. 데이터 모델

### 4.1 Request 모델

```javascript
class Request {
  // 기본 정보
  requestNo: string;        // 신청번호 (YYMMDD0001)
  requestDate: Date;        // 신청일시
  requesterEmail: string;   // 신청자 ID
  requesterName: string;    // 신청자 이름
  employeeCode?: string;    // 기사코드
  team: string;             // 소속팀
  region: string;           // 지역
  
  // 부품 정보
  itemName: string;          // 품명
  modelName?: string;       // 모델명
  serialNo?: string;        // 시리얼번호
  quantity: number;         // 수량
  assetNo: string;          // 관리번호
  
  // 수령 정보
  deliveryPlace: string;    // 수령지
  phone?: string;           // 전화번호
  company?: string;        // 업체명
  remarks?: string;        // 비고
  photoUrl?: string;       // 사진 URL
  
  // 처리 정보
  status: string;           // 상태
  handler?: string;         // 담당자
  handlerRemarks?: string;  // 담당자 비고
  orderDate?: Date;         // 발주일시
  expectedDeliveryDate?: Date; // 예상납기일
  receiptDate?: Date;       // 수령확인일시
  
  // 메타 정보
  lastModified: Date;      // 최종수정일시
  lastModifiedBy: string;   // 최종수정자
  _rowIndex: number;        // 시트 행 번호 (내부용)
}
```

### 4.2 User 모델

```javascript
class User {
  userId: string;           // 사용자 ID
  passwordHash: string;     // 비밀번호 해시 (SHA-256)
  name: string;            // 이름
  employeeCode?: string;    // 기사코드
  team: string;            // 소속팀
  region: string;          // 지역
  role: '신청자' | '관리자'; // 역할
  active: 'Y' | 'N';       // 활성화 여부
}
```

### 4.3 Session 모델

```javascript
class Session {
  userId: string;           // 사용자 ID
  userInfo: {               // 사용자 정보
    userId: string;
    name: string;
    employeeCode?: string;
    team: string;
    region: string;
    role: string;
  };
  createdAt: number;       // 생성 시간 (timestamp)
  expiresAt: number;       // 만료 시간 (timestamp)
}
```

---

## 5. 비즈니스 로직

### 5.1 신청 생성 프로세스

```javascript
RequestService.createRequest(formData, user) {
  1. 사용자 정보 확인
  2. 입력 데이터 유효성 검증
     - 품명 필수
     - 수량 >= 1
     - 관리번호 필수
     - 사진 필수
  3. 신청번호 생성 (_generateRequestNo)
     - 형식: YYMMDD0001
     - 오늘 날짜 기준
     - 시퀀스 자동 증가
  4. 사진 업로드 (_uploadPhoto)
     - Base64 → Blob 변환
     - Google Drive에 업로드
     - 공유 설정 (링크 공유)
  5. 데이터 저장 (RequestModel.create)
  6. 로그 기록 (LogService.log)
  7. 관리자 알림 (_notifyAdmins) - 선택사항
  8. 결과 반환
}
```

### 5.2 신청번호 생성 로직

```javascript
_generateRequestNo() {
  const today = new Date();
  const prefix = Utilities.formatDate(today, 'Asia/Seoul', 'yyMMdd');
  // 예: 260107
  
  const requests = this.requestModel.findAll();
  const todayRequests = requests.filter(r => {
    const requestNoStr = String(r.requestNo);
    return requestNoStr.startsWith(prefix);
  });
  
  let sequence = 1;
  if (todayRequests.length > 0) {
    const lastNo = String(todayRequests[todayRequests.length - 1].requestNo);
    sequence = parseInt(lastNo.substr(6)) + 1; // 마지막 4자리 추출
  }
  
  return prefix + String(sequence).padStart(4, '0');
  // 예: 2601070001
}
```

### 5.3 상태 변경 프로세스

```javascript
RequestService.updateStatus(requestNo, newStatus, remarks, user) {
  1. 사용자 정보 확인
  2. 신청 건 조회 (RequestModel.findById)
  3. 권한 체크 (_checkUpdatePermission)
     - 관리자: 모든 상태 변경 가능
     - 신청자: 
       - 접수중 → 접수취소 (본인 신청만)
       - 발주완료 → 처리완료 (수령 확인, 본인 신청만)
  4. 상태 변경 및 업데이트
     - 발주진행/발주완료: orderDate 기록
     - 처리완료: receiptDate 기록
  5. 데이터 저장 (RequestModel.update)
  6. 로그 기록
  7. 신청자 알림 (_notifyUser) - 선택사항
  8. 결과 반환
}
```

### 5.4 날짜 필터링 로직

```javascript
_matchFilter(obj, filter) {
  // 한국어 날짜 형식 파싱
  // "2026. 1. 7 오전 9:45:44" → "2026-01-07"
  
  if (filter.dateFrom || filter.dateTo) {
    let reqDateStr;
    if (obj.requestDate instanceof Date) {
      reqDateStr = Utilities.formatDate(obj.requestDate, 'Asia/Seoul', 'yyyy-MM-dd');
    } else {
      const dateStr = String(obj.requestDate);
      if (dateStr.includes('.')) {
        const parts = dateStr.split(' ')[0].split('.').map(p => p.trim());
        if (parts.length >= 3) {
          const year = parts[0];
          const month = parts[1].padStart(2, '0');
          const day = parts[2].padStart(2, '0');
          reqDateStr = `${year}-${month}-${day}`;
        }
      }
    }
    
    if (filter.dateFrom && reqDateStr < filter.dateFrom) return false;
    if (filter.dateTo && reqDateStr > filter.dateTo) return false;
  }
  
  return true;
}
```

---

## 6. API 명세

### 6.1 인증 API

#### 6.1.1 로그인
```javascript
login(userId: string, password: string): {
  success: boolean;
  sessionToken?: string;
  user?: {
    userId: string;
    name: string;
    role: string;
    team: string;
  };
  redirectUrl?: string;
  message?: string;
}
```

**프로세스**:
1. 사용자 ID로 사용자 조회
2. 비밀번호 해시 검증 (SHA-256)
3. 활성화 여부 확인
4. 세션 토큰 생성 (UUID)
5. CacheService에 세션 저장 (TTL: 1시간)
6. 로그 기록

#### 6.1.2 로그아웃
```javascript
logout(sessionToken: string): {
  success: boolean;
  message: string;
}
```

#### 6.1.3 현재 사용자 조회
```javascript
getCurrentUser(sessionToken: string): User | null
```

### 6.2 신청 관리 API

#### 6.2.1 신청 생성
```javascript
createRequest(formData: {
  itemName: string;
  modelName?: string;
  quantity: number;
  assetNo: string;
  serialNo?: string;
  deliveryPlace: string;
  phone?: string;
  company?: string;
  remarks?: string;
  photoBase64?: string; // Base64 인코딩된 이미지
}, sessionToken: string): {
  success: boolean;
  requestNo?: string;
  message: string;
}
```

#### 6.2.2 내 신청 목록 조회
```javascript
getMyRequests(filter?: {
  status?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
}, sessionToken: string): Array<Request>
```

#### 6.2.3 전체 신청 목록 조회 (관리자)
```javascript
getAllRequests(filter?: {
  status?: string;
  region?: string;
  dateFrom?: string;
  dateTo?: string;
}, sessionToken: string): Array<Request>
```

**참고**: 서버에서는 필터링하지 않고 전체 데이터를 반환하며, 클라이언트에서 필터링 처리

#### 6.2.4 신청 상세 조회
```javascript
getRequest(requestNo: string, sessionToken: string): Request | null
```

**권한 체크**:
- 관리자: 모든 신청 조회 가능
- 신청자: 본인 신청만 조회 가능

#### 6.2.5 상태 변경
```javascript
updateRequestStatus(
  requestNo: string,
  newStatus: string,
  remarks?: string,
  sessionToken: string
): {
  success: boolean;
  message: string;
}
```

#### 6.2.6 수령 확인
```javascript
confirmReceipt(requestNo: string, sessionToken: string): {
  success: boolean;
  message: string;
}
```

**프로세스**: 상태를 "발주완료" → "처리완료"로 변경하고 `receiptDate` 기록

#### 6.2.7 신청 취소
```javascript
cancelRequest(requestNo: string, sessionToken: string): {
  success: boolean;
  message: string;
}
```

**제약**: "접수중" 상태만 취소 가능

### 6.3 통계 API

#### 6.3.1 사용자 통계
```javascript
getRequestStats(sessionToken: string): {
  requested: number;    // 접수중 건수
  inProgress: number;   // 진행중 건수
  completed: number;    // 완료 건수
  total: number;        // 전체 건수
}
```

#### 6.3.2 관리자 대시보드 통계
```javascript
getDashboardStats(sessionToken: string): {
  today: {
    new: number;         // 신규 건수
    requested: number;   // 접수중 건수
    inProgress: number; // 진행중 건수
    delayed: number;     // 지연 건수
    completed: number;   // 완료 건수
    total: number;       // 전체 건수
  }
}
```

#### 6.3.3 긴급 처리 필요 건
```javascript
getUrgentRequests(sessionToken: string): Array<{
  requestNo: string;
  itemName: string;
  status: string;
  requesterName: string;
  requestDate: Date;
}>
```

**조건**: 상태가 "접수중"이고 신청일로부터 1일 이상 경과

#### 6.3.4 지연 건 조회
```javascript
getDelayedRequests(sessionToken: string): Array<{
  requestNo: string;
  itemName: string;
  requesterName: string;
  handler: string;
  delayDays: number;    // 지연 일수
}>
```

**조건**: 상태가 "발주진행" 또는 "발주지연"이고 발주일로부터 3일 이상 경과

---

## 7. 인증 및 보안

### 7.1 인증 메커니즘

#### 7.1.1 세션 기반 인증
- **세션 토큰**: UUID 생성
- **저장소**: Google Apps Script `CacheService`
- **TTL**: 1시간 (3600초)
- **자동 연장**: 세션 조회 시 TTL 갱신

#### 7.1.2 비밀번호 보안
- **해시 알고리즘**: SHA-256
- **저장**: 평문 비밀번호는 저장하지 않음
- **검증**: 입력 비밀번호를 해시하여 저장된 해시와 비교

```javascript
hashPassword(password) {
  const rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );
  
  // 바이트 배열을 16진수 문자열로 변환
  let hexString = '';
  for (let i = 0; i < rawHash.length; i++) {
    let byte = rawHash[i];
    if (byte < 0) byte = byte + 256;
    hexString += ('0' + byte.toString(16)).slice(-2);
  }
  
  return hexString;
}
```

### 7.2 권한 관리

#### 7.2.1 역할 기반 접근 제어 (RBAC)
- **관리자**: 모든 기능 접근 가능
- **신청자**: 본인 신청만 조회/수정 가능

#### 7.2.2 권한 체크 예시
```javascript
_checkUpdatePermission(user, request, newStatus) {
  // 관리자는 모든 변경 가능
  if (user.role === CONFIG.ROLES.ADMIN) {
    return;
  }
  
  // 신청자는 '접수중' 상태만 취소 가능
  if (user.userId === request.requesterEmail) {
    if (request.status === CONFIG.STATUS.REQUESTED && 
        newStatus === CONFIG.STATUS.CANCELLED) {
      return;
    }
    
    // 발주완료 상태에서 처리완료로 변경 (수령 확인)
    if (request.status === CONFIG.STATUS.COMPLETED && 
        newStatus === CONFIG.STATUS.FINISHED) {
      return;
    }
  }
  
  throw new Error('상태를 변경할 권한이 없습니다.');
}
```

### 7.3 보안 조치

#### 7.3.1 XSS 방지
```javascript
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

#### 7.3.2 입력 검증
- 클라이언트 측: HTML5 `required`, `pattern` 속성
- 서버 측: `Validator` 클래스 사용

```javascript
class Validator {
  static isEmail(email) { /* ... */ }
  static isPhone(phone) { /* ... */ }
  static isNotEmpty(value) { /* ... */ }
  static isNumber(value) { /* ... */ }
  static isInRange(value, min, max) { /* ... */ }
}
```

#### 7.3.3 파일 업로드 제한
- **최대 크기**: 5MB
- **허용 형식**: JPEG, JPG, PNG
- **검증**: 클라이언트 및 서버 측 모두 검증

---

## 8. 데이터 흐름

### 8.1 신청 생성 흐름

```
[클라이언트]                    [서버]                    [저장소]
     │                            │                          │
     │ 1. 폼 제출                 │                          │
     ├───────────────────────────>│                          │
     │                            │                          │
     │                            │ 2. 사용자 인증           │
     │                            ├─────────────────────────>│
     │                            │<─────────────────────────┤
     │                            │                          │
     │                            │ 3. 데이터 검증           │
     │                            │                          │
     │                            │ 4. 신청번호 생성         │
     │                            ├─────────────────────────>│
     │                            │<─────────────────────────┤
     │                            │                          │
     │                            │ 5. 사진 업로드           │
     │                            ├─────────────────────────>│
     │                            │                          │ Drive
     │                            │<─────────────────────────┤
     │                            │                          │
     │                            │ 6. 데이터 저장           │
     │                            ├─────────────────────────>│
     │                            │                          │ Sheets
     │                            │<─────────────────────────┤
     │                            │                          │
     │                            │ 7. 로그 기록             │
     │                            ├─────────────────────────>│
     │                            │                          │ Sheets
     │                            │                          │
     │<───────────────────────────┤                          │
     │ 8. 결과 반환                │                          │
     │                            │                          │
```

### 8.2 로그인 흐름

```
[클라이언트]                    [서버]                    [저장소]
     │                            │                          │
     │ 1. ID/PW 입력               │                          │
     ├───────────────────────────>│                          │
     │                            │                          │
     │                            │ 2. 사용자 조회           │
     │                            ├─────────────────────────>│
     │                            │                          │ Sheets
     │                            │<─────────────────────────┤
     │                            │                          │
     │                            │ 3. 비밀번호 검증         │
     │                            │                          │
     │                            │ 4. 세션 생성             │
     │                            ├─────────────────────────>│
     │                            │                          │ Cache
     │                            │                          │
     │<───────────────────────────┤                          │
     │ 5. 세션 토큰 반환          │                          │
     │                            │                          │
     │ 6. 페이지 리다이렉션        │                          │
     │                            │                          │
```

### 8.3 데이터 조회 흐름

```
[클라이언트]                    [서버]                    [저장소]
     │                            │                          │
     │ 1. 조회 요청                │                          │
     ├───────────────────────────>│                          │
     │                            │                          │
     │                            │ 2. 세션 확인             │
     │                            ├─────────────────────────>│
     │                            │                          │ Cache
     │                            │<─────────────────────────┤
     │                            │                          │
     │                            │ 3. 권한 체크             │
     │                            │                          │
     │                            │ 4. 데이터 조회           │
     │                            ├─────────────────────────>│
     │                            │                          │ Sheets
     │                            │<─────────────────────────┤
     │                            │                          │
     │                            │ 5. 데이터 포맷팅         │
     │                            │                          │
     │<───────────────────────────┤                          │
     │ 6. 데이터 반환              │                          │
     │                            │                          │
```

---

## 9. 클라이언트-서버 통신

### 9.1 통신 방식

#### 9.1.1 google.script.run
- **방식**: 비동기 호출
- **제약**: Date 객체 직렬화 문제 (문자열로 변환 필요)

```javascript
// 클라이언트
async function callServer(functionName, ...args) {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      [functionName](...args);
  });
}

// 사용 예시
const result = await callServer('getAllRequests', {}, sessionToken);
```

#### 9.1.2 Date 객체 직렬화 문제 해결
```javascript
// 서버 측 (Code.gs)
function getRequest(requestNo, sessionToken) {
  const request = requestModel.findById(requestNo);
  
  // Date 객체를 문자열로 변환
  return {
    requestNo: String(request.requestNo),
    requestDate: request.requestDate ? String(request.requestDate) : '',
    orderDate: request.orderDate ? String(request.orderDate) : '',
    // ...
  };
}
```

### 9.2 세션 토큰 전달

#### 9.2.1 URL 파라미터
```
https://script.google.com/.../exec?page=dashboard&token=xxx-xxx-xxx
```

#### 9.2.2 sessionStorage
```javascript
// 세션 토큰 저장
sessionStorage.setItem('sessionToken', token);

// 세션 토큰 조회
function getSessionToken() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('token') || sessionStorage.getItem('sessionToken');
}
```

### 9.3 네비게이션 처리

#### 9.3.1 OAuth 리다이렉션 문제
- **문제**: Google OAuth 리다이렉션 시 URL 파라미터 손실
- **해결**: `sessionStorage` 사용

```javascript
// 페이지 이동 전
sessionStorage.setItem('requestNo', requestNo);
sessionStorage.setItem('page', 'admin-detail');
window.top.location.href = targetUrl;

// 대상 페이지에서
const requestNo = sessionStorage.getItem('requestNo') || 
                  new URLSearchParams(window.location.search).get('requestNo');
```

#### 9.3.2 SecurityError 방지
- **문제**: `setTimeout` 기반 자동 네비게이션은 SecurityError 발생
- **해결**: 사용자 액션 기반 네비게이션 (버튼 클릭)

```javascript
// ❌ 잘못된 방법
setTimeout(() => {
  window.location.href = targetUrl; // SecurityError 발생
}, 2000);

// ✅ 올바른 방법
// 모달에서 사용자가 버튼을 클릭할 때만 네비게이션
document.getElementById('goToDashboardBtn').onclick = () => {
  window.top.location.href = targetUrl;
};
```

---

## 10. 성능 최적화

### 10.1 서버 측 최적화

#### 10.1.1 로깅 최소화
- **문제**: 과도한 `Logger.log` 호출로 성능 저하
- **해결**: 필수 로그만 남기고 나머지 제거

```javascript
// ❌ 과도한 로깅
Logger.log('getAllRequests: START');
Logger.log('getAllRequests: sessionToken = ' + sessionToken);
Logger.log('getAllRequests: filter = ' + JSON.stringify(filter));
// ... 수십 개의 로그

// ✅ 최소화된 로깅
// 에러 발생 시에만 로깅
catch (error) {
  Logger.log('getAllRequests error: ' + error);
}
```

#### 10.1.2 데이터 포맷팅 최적화
- **문제**: 모든 데이터를 서버에서 포맷팅하면 느림
- **해결**: 클라이언트에서 필터링 및 포맷팅

```javascript
// 서버: 전체 데이터만 반환
function getAllRequests(filter, sessionToken) {
  const requests = requestModel.findAll(); // 필터 없이 전체 조회
  return requests.map(req => ({
    // 최소한의 포맷팅만
    requestNo: String(req.requestNo),
    requestDate: String(req.requestDate),
    // ...
  }));
}

// 클라이언트: 필터링 및 포맷팅
const filtered = allRequests.filter(req => {
  if (statusFilter && req.status !== statusFilter) return false;
  if (dateFrom && parseKoreanDate(req.requestDate) < dateFrom) return false;
  // ...
});
```

### 10.2 클라이언트 측 최적화

#### 10.2.1 병렬 API 호출
```javascript
// ❌ 순차 호출 (느림)
const stats = await callServer('getRequestStats', sessionToken);
const requests = await callServer('getMyRequests', {}, sessionToken);
const notifications = await callServer('getNotifications', sessionToken);
// 총 시간: 3초

// ✅ 병렬 호출 (빠름)
const [stats, requests, notifications] = await Promise.all([
  callServer('getRequestStats', sessionToken),
  callServer('getMyRequests', {}, sessionToken),
  callServer('getNotifications', sessionToken)
]);
// 총 시간: 1초
```

#### 10.2.2 클라이언트 캐싱
```javascript
// 사용자 정보 캐싱
let user = sessionStorage.getItem('currentUser');
if (user) {
  user = JSON.parse(user);
} else {
  user = await callServer('getCurrentUser', sessionToken);
  sessionStorage.setItem('currentUser', JSON.stringify(user));
}
```

#### 10.2.3 성능 측정
```javascript
window.onload = async function() {
  const startTime = performance.now();
  
  // ... 페이지 로딩 로직 ...
  
  const loadTime = (performance.now() - startTime).toFixed(0);
  console.log(`✅ Page loaded in ${loadTime}ms`);
};
```

### 10.3 데이터베이스 최적화

#### 10.3.1 인덱싱 (Google Sheets 제약)
- Google Sheets는 자동 인덱싱 없음
- `requestNo`로 조회 시 전체 스캔 필요
- 대량 데이터 시 성능 저하 가능

#### 10.3.2 캐싱 전략
```javascript
class CacheManager {
  constructor() {
    this.cache = CacheService.getScriptCache();
  }
  
  get(key) {
    if (!CONFIG.CACHE.ENABLED) return null;
    const cached = this.cache.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  set(key, value, ttl = CONFIG.CACHE.TTL) {
    if (!CONFIG.CACHE.ENABLED) return;
    this.cache.put(key, JSON.stringify(value), ttl);
  }
}
```

---

## 11. 에러 처리

### 11.1 에러 핸들링 클래스

```javascript
class ErrorHandler {
  static handle(error, context = '') {
    const errorMessage = error.message || error.toString();
    
    Logger.log(`Error in ${context}: ${errorMessage}`);
    Logger.log(error.stack);
    
    // Stackdriver Logging
    console.error(`${context}: ${errorMessage}`, error.stack);
    
    return {
      success: false,
      message: this._getUserFriendlyMessage(errorMessage),
      technical: errorMessage
    };
  }
  
  static _getUserFriendlyMessage(technicalMessage) {
    const messages = {
      'Authorization required': '권한이 필요합니다. 다시 로그인해주세요.',
      'Service invoked too many times': '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      'Quota exceeded': '일일 사용량을 초과했습니다. 내일 다시 시도해주세요.',
      'Timeout': '처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
    };
    
    for (const [key, value] of Object.entries(messages)) {
      if (technicalMessage.includes(key)) {
        return value;
      }
    }
    
    return '오류가 발생했습니다. 관리자에게 문의해주세요.';
  }
}
```

### 11.2 클라이언트 에러 처리

```javascript
// 전역 에러 핸들러
window.addEventListener('error', function(e) {
  console.error('Global error:', e.error || e.message);
  showToast('페이지 로딩 중 오류가 발생했습니다.', 'danger');
});

// API 호출 에러 처리
try {
  const result = await callServer('createRequest', formData, sessionToken);
  if (!result.success) {
    showToast(result.message || '신청에 실패했습니다.', 'danger');
  }
} catch (error) {
  console.error('API error:', error);
  showToast('서버와 통신 중 오류가 발생했습니다.', 'danger');
}
```

### 11.3 사용자 친화적 에러 메시지

```javascript
function showErrorModal(message, onClose) {
  const modal = document.createElement('div');
  modal.className = 'modal fade show';
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">오류</h5>
        </div>
        <div class="modal-body">
          <p>${escapeHtml(message)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
            확인
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
```

---

## 12. 자동화 및 트리거

### 12.1 트리거 설정

```javascript
function setupAllTriggers() {
  // 기존 트리거 삭제
  deleteAllTriggers();
  
  // 1. 매일 새벽 2시 백업
  ScriptApp.newTrigger('performDailyBackup')
    .timeBased()
    .atHour(2)
    .everyDays(1)
    .create();
  
  // 2. 매시간 지연 건 체크
  ScriptApp.newTrigger('checkDelayedRequests')
    .timeBased()
    .everyHours(1)
    .create();
  
  // 3. 매일 오전 9시 일일 리포트
  ScriptApp.newTrigger('sendDailyReport')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();
}
```

### 12.2 자동화 기능

#### 12.2.1 일일 백업
```javascript
function performDailyBackup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const backupFolder = DriveApp.getFolderById(getProperty('BACKUP_FOLDER_ID'));
  
  const today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd');
  const backupName = `부품발주_백업_${today}`;
  const backup = ss.copy(backupName);
  
  DriveApp.getFileById(backup.getId()).moveTo(backupFolder);
  
  // 30일 이전 백업 삭제
  deleteOldBackups(backupFolder, 30);
}
```

#### 12.2.2 지연 건 알림
```javascript
function checkDelayedRequests() {
  const requestModel = new RequestModel();
  const requests = requestModel.findAll({ status: CONFIG.STATUS.ORDERING });
  
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  const delayedRequests = requests.filter(req => {
    if (!req.orderDate) return false;
    return new Date(req.orderDate) < threeDaysAgo;
  });
  
  if (delayedRequests.length > 0) {
    notifyDelayedRequests(delayedRequests);
  }
}
```

#### 12.2.3 일일 리포트
```javascript
function sendDailyReport() {
  const requestModel = new RequestModel();
  const today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  
  const requests = requestModel.findAll();
  const todayRequests = requests.filter(req => {
    const reqDate = Utilities.formatDate(new Date(req.requestDate), 'Asia/Seoul', 'yyyy-MM-dd');
    return reqDate === today;
  });
  
  const stats = {
    total: todayRequests.length,
    byStatus: {}
  };
  
  todayRequests.forEach(req => {
    stats.byStatus[req.status] = (stats.byStatus[req.status] || 0) + 1;
  });
  
  // 관리자들에게 이메일 전송
  const admins = new UserModel().findAllAdmins();
  admins.forEach(admin => {
    MailApp.sendEmail({
      to: admin.userId,
      subject: '[부품발주] 일일 리포트 - ' + today,
      body: `일일 신청 현황 리포트\n\n날짜: ${today}\n전체 신청: ${stats.total}건\n...`
    });
  });
}
```

---

## 13. 파일 구조

```
apps-script/
├── Code.gs                    # 메인 진입점 및 API 함수
├── Config.gs                  # 전역 설정
├── Auth.gs                     # 인증 및 세션 관리
├── Models.gs                   # 데이터 접근 레이어
├── Services.gs                 # 비즈니스 로직
├── Utils.gs                    # 유틸리티 함수
├── Triggers.gs                 # 자동화 트리거
├── appsscript.json             # Apps Script 설정
│
└── Views/                      # HTML 템플릿
    ├── JavaScript.html         # 공통 JavaScript
    ├── Stylesheet.html         # 공통 CSS
    ├── LoginPage.html          # 로그인 페이지
    ├── UserDashboard.html      # 사용자 대시보드
    ├── AdminDashboardPage.html # 관리자 대시보드
    ├── NewRequestPage.html     # 신청 등록
    ├── MyRequestsPage.html     # 내 신청 목록
    ├── AdminPage.html          # 전체 신청 목록
    ├── AdminStatisticsPage.html # 통계 및 리포트
    ├── RequestDetailPage.html  # 신청 상세 (사용자)
    ├── AdminRequestDetailPage.html # 신청 상세 (관리자)
    ├── MyInfoPage.html         # 내 정보
    └── Unauthorized.html       # 권한 없음 페이지
```

### 13.1 주요 파일 설명

#### Code.gs
- `doGet(e)`: 웹 앱 진입점, 페이지 라우팅
- 사용자 API: `getMyRequests()`, `createRequest()`, `getRequestStats()` 등
- 관리자 API: `getAllRequests()`, `getDashboardStats()`, `updateRequestStatus()` 등
- 공통 API: `getRequest()`, `getCodeList()`, `changePassword()` 등

#### Models.gs
- `RequestModel`: 신청 데이터 CRUD
- `UserModel`: 사용자 데이터 조회
- `CodeModel`: 코드 데이터 조회

#### Services.gs
- `RequestService`: 신청 생성, 상태 변경 등 비즈니스 로직
- `LogService`: 로그 기록

#### Auth.gs
- `SessionManager`: 세션 생성/조회/삭제
- `login()`: 로그인 처리
- `logout()`: 로그아웃 처리
- `getCurrentSession()`: 현재 세션 확인

---

## 14. 배포 및 운영

### 14.1 초기 설정

#### 14.1.1 시스템 초기화
```javascript
function initialSetup() {
  // 1. Properties 초기화
  initializeProperties();
  
  // 2. 시트 생성 및 헤더 설정
  createSheets();
  
  // 3. 트리거 설정
  setupAllTriggers();
  
  return { success: true, message: '초기 설정이 완료되었습니다.' };
}
```

#### 14.1.2 시트 생성
```javascript
function createSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = [
    CONFIG.SHEETS.REQUESTS,  // 신청내역
    CONFIG.SHEETS.USERS,     // 사용자관리
    CONFIG.SHEETS.CODES,     // 코드관리
    CONFIG.SHEETS.LOGS       // 로그
  ];
  
  sheetNames.forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      setupSheetHeaders(sheet, name);
    }
  });
}
```

### 14.2 배포

#### 14.2.1 웹 앱 배포
1. Apps Script 편집기에서 "배포" → "새 배포" 선택
2. 유형: "웹 앱" 선택
3. 실행 사용자: "나" 선택
4. 액세스 권한: "모든 사용자" 또는 "내 조직" 선택
5. 배포 후 URL 복사

#### 14.2.2 권한 설정
- 스프레드시트: 편집 권한 부여
- Drive 폴더: 공유 설정 (링크 공유)

### 14.3 모니터링

#### 14.3.1 로그 확인
- Apps Script 편집기 → "실행" 탭에서 로그 확인
- Stackdriver Logging에서 상세 로그 확인

#### 14.3.2 에러 알림
- `sendErrorNotification()` 함수로 관리자에게 이메일 전송

### 14.4 백업

#### 14.4.1 자동 백업
- 매일 새벽 2시 자동 백업 (`performDailyBackup`)
- 30일 이전 백업 자동 삭제

#### 14.4.2 수동 백업
```javascript
// 스프레드시트 복사
const backup = SpreadsheetApp.getActiveSpreadsheet().copy('백업_날짜');
```

---

## 15. 제약사항 및 한계

### 15.1 Google Apps Script 제약

#### 15.1.1 실행 시간 제한
- 웹 앱 요청: 6분
- 트리거: 6분
- **해결**: 대량 데이터 처리는 배치로 분할

#### 15.1.2 할당량 제한
- 일일 실행 시간: 6시간
- 동시 실행: 30개
- **해결**: 캐싱 및 최적화

#### 15.1.3 Date 객체 직렬화
- `google.script.run`은 Date 객체를 제대로 직렬화하지 못함
- **해결**: 서버에서 문자열로 변환하여 반환

### 15.2 Google Sheets 제약

#### 15.2.1 인덱싱 없음
- 대량 데이터 조회 시 성능 저하
- **해결**: 클라이언트 측 필터링

#### 15.2.2 동시성 제어
- 동시 수정 시 충돌 가능
- **해결**: `LockService` 사용 (현재 미사용, 향후 추가 가능)

### 15.3 브라우저 제약

#### 15.3.1 SecurityError
- `setTimeout` 기반 자동 네비게이션 불가
- **해결**: 사용자 액션 기반 네비게이션

#### 15.3.2 OAuth 리다이렉션
- URL 파라미터 손실
- **해결**: `sessionStorage` 사용

---

## 16. 향후 개선 사항

### 16.1 성능 개선
- [ ] 서버 측 페이지네이션 구현
- [ ] 데이터베이스 인덱싱 (마이그레이션 시)
- [ ] Redis 캐싱 (마이그레이션 시)

### 16.2 기능 개선
- [ ] 실시간 알림 (WebSocket 또는 Server-Sent Events)
- [ ] 파일 다중 업로드
- [ ] Excel 내보내기
- [ ] PDF 리포트 생성

### 16.3 보안 강화
- [ ] CSRF 토큰 추가
- [ ] Rate Limiting
- [ ] 입력 데이터 Sanitization 강화

### 16.4 사용자 경험 개선
- [ ] 반응형 디자인 개선
- [ ] 다국어 지원
- [ ] 다크 모드

---

**최종 업데이트**: 2026-01-08  
**버전**: v1.0  
**작성자**: AI Assistant  
**상태**: ✅ Complete

