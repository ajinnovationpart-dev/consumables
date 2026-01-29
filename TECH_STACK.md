# 🛠️ 기술 스택 (Tech Stack)

## 📋 프로젝트 개요
**부품 발주 시스템 (Ordering Consumables System)**
- Google Apps Script 기반 웹 애플리케이션
- Google Sheets를 데이터베이스로 활용
- 실시간 협업 및 권한 관리 기능

---

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
│  - HTML5 + CSS3 + JavaScript (ES6+)                     │
│  - Bootstrap 5.3.2 (UI Framework)                       │
│  - Chart.js 4.4.0 (데이터 시각화)                        │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTPS
                   │ google.script.run (RPC)
┌──────────────────┴──────────────────────────────────────┐
│              Google Apps Script Runtime                  │
│  - Server-side JavaScript (V8 Engine)                   │
│  - MVC Pattern (Models, Services, Controllers)          │
│  - Session Management (CacheService)                     │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┬──────────────────┐
        │                     │                  │
┌───────▼────────┐  ┌────────▼───────┐  ┌──────▼──────┐
│ Google Sheets  │  │ Google Drive   │  │ Properties  │
│ (Database)     │  │ (File Storage) │  │ (Config)    │
└────────────────┘  └────────────────┘  └─────────────┘
```

---

## 💻 Frontend Technologies

### 1. **HTML5**
- **버전**: HTML5
- **역할**: 페이지 구조 및 시맨틱 마크업
- **주요 기능**:
  - `<!DOCTYPE html>` 선언
  - `<meta charset="UTF-8">` (UTF-8 인코딩)
  - `<meta name="viewport">` (반응형 디자인)
  - Semantic tags: `<nav>`, `<section>`, `<article>`

### 2. **CSS3**
- **버전**: CSS3
- **역할**: 스타일링 및 레이아웃
- **주요 기능**:
  - Flexbox 레이아웃
  - Grid 시스템 (Bootstrap)
  - CSS Variables (커스텀 속성)
  - Media Queries (반응형)
  - Transitions & Animations

### 3. **JavaScript (ES6+)**
- **버전**: ECMAScript 2015+ (ES6+)
- **엔진**: V8 (Chrome/Apps Script)
- **주요 기능**:
  ```javascript
  // Async/Await
  async function loadData() {
    const data = await callServer('getData');
  }
  
  // Arrow Functions
  const filtered = data.filter(item => item.status === 'active');
  
  // Destructuring
  const { name, team, region } = user;
  
  // Template Literals
  const html = `<div>${name}</div>`;
  
  // Promise.all (병렬 처리)
  const [stats, requests] = await Promise.all([
    callServer('getStats'),
    callServer('getRequests')
  ]);
  
  // Spread Operator
  const newArray = [...oldArray, newItem];
  
  // sessionStorage API
  sessionStorage.setItem('user', JSON.stringify(user));
  
  // Performance API
  const startTime = performance.now();
  ```

### 4. **Bootstrap 5.3.2**
- **공식 사이트**: https://getbootstrap.com/
- **CDN**: 
  ```html
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  ```
- **주요 사용 컴포넌트**:
  - **Grid System**: 12-column responsive layout
  - **Navbar**: 상단 네비게이션 바
  - **Cards**: 정보 카드 레이아웃
  - **Forms**: 폼 입력 요소
  - **Buttons**: 버튼 스타일
  - **Modals**: 모달 다이얼로그
  - **Alerts & Toasts**: 알림 메시지
  - **Tables**: 데이터 테이블
  - **Badges**: 상태 뱃지
  - **Spinners**: 로딩 인디케이터

### 5. **Chart.js 4.4.0**
- **공식 사이트**: https://www.chartjs.org/
- **CDN**:
  ```html
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
  ```
- **사용 차트 타입**:
  - **Doughnut Chart**: 상태별 분포 (원형 차트)
  - **Bar Chart**: 지역별 통계 (막대 차트)
  - **Line Chart**: 일별 추이 (선형 차트)
- **주요 설정**:
  ```javascript
  new Chart(ctx, {
    type: 'doughnut',
    data: { labels: [...], datasets: [...] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
  ```

---

## 🖥️ Backend Technologies

### 1. **Google Apps Script**
- **버전**: V8 Runtime
- **언어**: JavaScript (ES6+ 지원)
- **공식 문서**: https://developers.google.com/apps-script
- **주요 특징**:
  - 서버리스 아키텍처
  - Google Workspace 완벽 통합
  - 무료 호스팅 (quota 제한 있음)
  - HTTPS 자동 제공

- **Quota & Limits**:
  ```
  - 실행 시간: 최대 6분/실행
  - 일일 실행: 90분 (무료), 6시간 (Workspace)
  - 동시 실행: 30회
  - URL Fetch: 20,000회/일
  - 이메일: 100통/일 (무료)
  ```

### 2. **Google Apps Script Services**

#### a) **SpreadsheetApp**
```javascript
// Google Sheets 데이터 액세스
const ss = SpreadsheetApp.openById(SHEET_ID);
const sheet = ss.getSheetByName('시트명');
const data = sheet.getDataRange().getValues();
```

#### b) **DriveApp**
```javascript
// 파일 업로드 및 관리
const folder = DriveApp.getFolderById(FOLDER_ID);
const file = folder.createFile(blob);
const fileUrl = file.getUrl();
```

#### c) **CacheService**
```javascript
// 세션 관리 (최대 6시간)
const cache = CacheService.getScriptCache();
cache.put(sessionToken, JSON.stringify(user), 21600); // 6시간
```

#### d) **PropertiesService**
```javascript
// 설정 저장 (영구 저장)
const props = PropertiesService.getScriptProperties();
props.setProperty('SHEET_ID', 'xxx');
```

#### e) **HtmlService**
```javascript
// HTML 템플릿 렌더링
const template = HtmlService.createTemplateFromFile('Page');
return template.evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
```

#### f) **Utilities**
```javascript
// 유틸리티 함수
const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
const uuid = Utilities.getUuid();
const date = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
```

### 3. **Architecture Pattern: MVC**

```
apps-script/
├── Code.gs           # Controller (라우팅, API 엔드포인트)
├── Models.gs         # Model (데이터 액세스 레이어)
├── Services.gs       # Business Logic (비즈니스 로직)
├── Auth.gs           # Authentication (인증 서비스)
├── Config.gs         # Configuration (설정)
├── Utils.gs          # Utilities (유틸리티 함수)
├── Triggers.gs       # Time-based Triggers (스케줄러)
└── Views/            # View (HTML 템플릿)
    ├── LoginPage.html
    ├── UserDashboard.html
    ├── AdminDashboard.html
    └── ...
```

---

## 💾 Database & Storage

### 1. **Google Sheets (Database)**
- **역할**: 관계형 데이터베이스 대체
- **장점**:
  - 실시간 협업 가능
  - GUI로 직접 데이터 확인/수정
  - 백업/복원 간편
  - 버전 관리 자동
  - 무료 (제한: 5백만 셀)

- **시트 구조**:
  ```
  📊 시트 목록:
  1. 신청관리 - 신청 데이터 (25개 컬럼)
  2. 사용자관리 - 사용자 정보 (8개 컬럼)
  3. 코드관리_상태 - 상태 코드 (2개 컬럼)
  4. 코드관리_소속팀 - 팀 코드 (2개 컬럼)
  5. 코드관리_지역 - 지역 코드 (2개 컬럼)
  ```

- **데이터 액세스 패턴**:
  ```javascript
  // Read (O(n) - 전체 스캔)
  const data = sheet.getDataRange().getValues();
  
  // Write (O(1) - 직접 쓰기)
  sheet.appendRow(rowData);
  
  // Update (O(n) - 검색 후 업데이트)
  sheet.getRange(rowIndex, colIndex).setValue(value);
  
  // Batch Operations (권장)
  const range = sheet.getRange(startRow, startCol, numRows, numCols);
  range.setValues(dataArray);
  ```

### 2. **Google Drive (File Storage)**
- **역할**: 첨부 파일 저장 (이미지, PDF 등)
- **저장 방식**:
  ```javascript
  // 1. Base64 → Blob 변환
  const base64Data = imageData.split(',')[1];
  const blob = Utilities.newBlob(
    Utilities.base64Decode(base64Data), 
    'image/jpeg', 
    'photo.jpg'
  );
  
  // 2. Drive에 저장
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const file = folder.createFile(blob);
  
  // 3. 공유 URL 생성
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileUrl = file.getUrl();
  ```

---

## 🔐 Security & Authentication

### 1. **세션 기반 인증**
```javascript
// 1. 로그인 시 세션 생성
const sessionToken = Utilities.getUuid();
const cache = CacheService.getScriptCache();
cache.put(sessionToken, JSON.stringify(user), 21600); // 6시간

// 2. 클라이언트에 토큰 전달
sessionStorage.setItem('sessionToken', sessionToken);

// 3. 매 요청마다 토큰 검증
function getCurrentUser(sessionToken) {
  const cached = cache.get(sessionToken);
  return cached ? JSON.parse(cached) : null;
}
```

### 2. **비밀번호 암호화**
```javascript
// SHA-256 해싱
function hashPassword(password) {
  const hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, 
    password
  );
  return hash.map(byte => 
    ('0' + (byte & 0xFF).toString(16)).slice(-2)
  ).join('');
}
```

### 3. **권한 관리**
```javascript
// 역할 기반 접근 제어 (RBAC)
const CONFIG = {
  ROLES: {
    ADMIN: '관리자',
    USER: '신청자'
  }
};

// 권한 체크
if (user.role !== CONFIG.ROLES.ADMIN) {
  throw new Error('관리자 권한이 필요합니다.');
}
```

### 4. **XSS 방지**
```javascript
// HTML 이스케이프
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
```

---

## 🚀 Performance Optimization

### 1. **클라이언트 측 최적화**

#### a) **캐싱 전략**
```javascript
// sessionStorage를 활용한 사용자 정보 캐싱
let user = sessionStorage.getItem('currentUser');
if (user) {
  user = JSON.parse(user);  // 캐시 히트 (0ms)
} else {
  user = await callServer('getCurrentUser');  // 캐시 미스 (~1000ms)
  sessionStorage.setItem('currentUser', JSON.stringify(user));
}
```

#### b) **병렬 API 호출**
```javascript
// Before: 순차 호출 (3초)
const stats = await callServer('getStats');      // 1초
const requests = await callServer('getRequests'); // 1초
const notifications = await callServer('getNotifications'); // 1초

// After: 병렬 호출 (1초)
const [stats, requests, notifications] = await Promise.all([
  callServer('getStats'),
  callServer('getRequests'),
  callServer('getNotifications')
]);
```

#### c) **로그 최소화**
```javascript
// Before: 과도한 로깅 (252개 로그)
Logger.log('Step 1...');
Logger.log('Data: ' + JSON.stringify(data));
// ... 250 more logs

// After: 필수 로그만 (10개 이하)
Logger.log('Error: ' + error);
```

### 2. **서버 측 최적화**

#### a) **데이터 직렬화**
```javascript
// Date 객체를 문자열로 변환 (직렬화 문제 해결)
return {
  requestDate: req.requestDate ? String(req.requestDate) : '',
  orderDate: req.orderDate ? String(req.orderDate) : ''
};
```

#### b) **효율적인 데이터 액세스**
```javascript
// Batch Read (한 번에 읽기)
const data = sheet.getDataRange().getValues(); // 1회 API 호출

// 대신 피해야 할 패턴:
for (let i = 1; i <= lastRow; i++) {
  const value = sheet.getRange(i, 1).getValue(); // N회 API 호출 (느림!)
}
```

---

## 📊 Data Flow

### 1. **신청 생성 플로우**
```
User Input (Form)
    ↓
Client-side Validation
    ↓
Photo Upload (Base64 → Blob → Drive)
    ↓
google.script.run.createRequest(data)
    ↓
Server-side Validation
    ↓
Generate RequestNo (YYMMDD0001)
    ↓
Save to Google Sheets
    ↓
Return Success/Error
    ↓
Show Modal & Redirect
```

### 2. **데이터 조회 플로우**
```
Page Load
    ↓
Check sessionStorage (Cache)
    ↓
If cached → Use cached data (Fast!)
    ↓
If not cached → Call Server API
    ↓
google.script.run.getAllRequests()
    ↓
Read from Google Sheets
    ↓
Transform Data (Date → String)
    ↓
Return JSON Array
    ↓
Client-side Filtering
    ↓
Render Table/Chart
```

---

## 🛠️ Development Tools

### 1. **IDE**
- **Google Apps Script Editor**: 온라인 IDE
- **Cursor / VS Code**: 로컬 개발 (clasp 사용 시)

### 2. **Version Control**
- **Git**: 버전 관리
- **GitHub**: 원격 저장소

### 3. **Debugging Tools**
```javascript
// 1. Console Logging
console.log('Debug:', data);

// 2. Apps Script Logger
Logger.log('Server log:', data);

// 3. Performance Monitoring
const startTime = performance.now();
// ... code ...
console.log(`Execution time: ${performance.now() - startTime}ms`);

// 4. Browser DevTools
// F12 → Console, Network, Performance tabs
```

### 4. **Testing**
```javascript
// 단위 테스트 (Apps Script)
function testGetAllRequests() {
  const sessionToken = login('admin', 'admin');
  const requests = getAllRequests({}, sessionToken);
  Logger.log('Test result: ' + requests.length + ' items');
}
```

---

## 📦 Dependencies

### Frontend
```json
{
  "bootstrap": "5.3.2",
  "chart.js": "4.4.0"
}
```

### Backend
```json
{
  "google-apps-script": "latest (V8 Runtime)"
}
```

---

## 🌐 Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome  | 90+     | ✅ Full |
| Edge    | 90+     | ✅ Full |
| Firefox | 88+     | ✅ Full |
| Safari  | 14+     | ✅ Full |
| Mobile  | Modern  | ✅ Responsive |

---

## 📈 Performance Metrics

### 페이지 로드 시간 (After 최적화)
```
UserDashboard:      ~800ms  (Before: 3000ms) ⚡ 3.75x faster
AdminDashboard:     ~1200ms (Before: 3500ms) ⚡ 2.9x faster
MyRequestsPage:     ~900ms  (Before: 2500ms) ⚡ 2.8x faster
AdminPage:          ~1200ms (Before: 3000ms) ⚡ 2.5x faster
RequestDetailPage:  ~600ms  (Before: 1500ms) ⚡ 2.5x faster
NewRequestPage:     ~300ms  (Before: 1000ms) ⚡ 3.3x faster
```

### API 응답 시간
```
getCurrentUser:     ~500ms  (캐시 사용 시: 0ms)
getAllRequests:     ~1000ms (5건 기준)
createRequest:      ~1500ms (사진 업로드 포함)
updateRequest:      ~800ms
```

---

## 🔄 Deployment Process

### 1. **개발 환경**
```bash
# 로컬에서 개발
git clone <repository>
cd ordering_consumables
# VS Code로 개발
```

### 2. **배포**
```
1. Apps Script Editor 접속
2. 코드 복사/붙여넕기
3. "배포" → "배포 관리"
4. "새 버전" 생성
5. 설명 입력
6. "배포" 클릭
```

### 3. **URL 구조**
```
Production URL:
https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec

Development URL:
https://script.google.com/macros/s/{DEPLOYMENT_ID}/dev
```

---

## 📝 Code Style & Conventions

### JavaScript
```javascript
// 1. 변수명: camelCase
const userName = 'John';
const requestList = [];

// 2. 함수명: camelCase (동사로 시작)
function getUserInfo() { }
async function loadData() { }

// 3. 상수: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const API_ENDPOINT = '/api/requests';

// 4. 클래스명: PascalCase
class RequestModel { }
class AuthService { }

// 5. 비동기 함수: async/await 사용
async function fetchData() {
  try {
    const data = await callServer('getData');
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### HTML
```html
<!-- 1. 들여쓰기: 2 spaces -->
<div class="container">
  <h1>Title</h1>
</div>

<!-- 2. 속성 순서: class → id → data-* → others -->
<button class="btn btn-primary" id="submitBtn" data-action="submit" onclick="submit()">
```

---

## 🚧 Known Limitations

### Google Apps Script
1. **실행 시간 제한**: 최대 6분
2. **메모리 제한**: 100MB
3. **동시 실행**: 최대 30회
4. **URL Fetch**: 20,000회/일

### Google Sheets
1. **셀 제한**: 5백만 셀
2. **행 제한**: ~400만 행 (실질적으로 ~10만 행 권장)
3. **읽기 성능**: O(n) - 전체 스캔

### Browser
1. **sessionStorage**: 탭 닫으면 삭제
2. **localStorage**: 5-10MB 제한

---

## 🔮 Future Improvements

1. **성능 최적화**
   - IndexedDB 도입
   - Service Worker 캐싱
   - Lazy Loading

2. **기능 추가**
   - 실시간 알림 (Push Notification)
   - 다국어 지원 (i18n)
   - 오프라인 모드

3. **인프라 개선**
   - Database 마이그레이션 (Sheets → Cloud SQL)
   - CDN 도입
   - Load Balancing

---

## 📚 References

- [Google Apps Script 공식 문서](https://developers.google.com/apps-script)
- [Bootstrap 5 문서](https://getbootstrap.com/docs/5.3/)
- [Chart.js 문서](https://www.chartjs.org/docs/latest/)
- [MDN Web Docs](https://developer.mozilla.org/)

---

**최종 업데이트**: 2026-01-08
**버전**: v11.0




