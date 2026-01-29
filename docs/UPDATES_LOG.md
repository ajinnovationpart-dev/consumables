# 업데이트 로그

## 2025-01-07: 전체 페이지 데이터 로딩 및 디버깅 개선

### 주요 변경사항

#### 1. API 함수 추가 (Code.gs)
- **getRequestStats(sessionToken)**: 사용자의 신청 통계 조회 (접수중, 진행중, 완료, 전체)
- **getNotifications(sessionToken)**: 사용자 알림 조회 (최근 7일 이내 상태 변경 건)

#### 2. 관리자 페이지 개선

##### AdminDashboardPage.html
- 데이터 로딩 시 상세한 콘솔 로그 추가
- 통계, 긴급 처리 건, 지연 건 로딩 시 JSON 형식으로 로그 출력
- 에러 발생 시 상세한 스택 트레이스 출력

##### AdminPage.html (전체 신청 목록)
- 페이지 초기화 시 상세 로그 추가
- 코드 목록(상태, 지역) 로딩 로그
- 신청 목록 로딩 및 테이블 렌더링 로그
- null/undefined 값 안전 처리 (escapeHtml, 기본값 표시)

##### AdminRequestDetailPage.html (신청 상세 관리)
- 신청번호 파라미터 검증 로그
- 관리자 권한 확인 로그
- 신청 상세 정보 로딩 로그

#### 3. 사용자 페이지 개선

##### UserDashboard.html (사용자 대시보드)
- **getRequestStats** API 호출로 변경 (기존 로컬 함수 제거)
- **getNotifications** API 호출 추가
- 각 단계별 상세 로그 출력

##### NewRequestPage.html (신규 신청 등록)
- 페이지 초기화 시 사용자 정보 로딩 로그
- 폼 제출 시 데이터 검증 및 전송 과정 로그
- Base64 인코딩 진행 상황 로그
- 신청 완료 후 신청번호 로그

##### MyRequestsPage.html (내 신청 목록)
- 사용자 정보 및 신청 목록 로딩 로그
- 데이터 개수 확인 로그

#### 4. 디버깅 개선사항
모든 페이지에 다음 로그 추가:
- `console.log('[페이지명]: Initializing...')` - 초기화 시작
- `console.log('Session token:', ...)` - 세션 토큰 존재 여부
- `console.log('User info:', ...)` - 사용자 정보
- `console.log('Loading [데이터]...')` - 데이터 로딩 시작
- `console.log('[데이터] loaded:', ...)` - 데이터 로딩 완료
- `console.error('[페이지명] init error:', ...)` - 에러 발생
- `console.error('Error stack:', ...)` - 에러 스택 트레이스
- `console.log('[페이지명]: Initialization complete')` - 초기화 완료

#### 5. 안전성 개선
- null/undefined 체크 강화
- 기본값 설정 (빈 문자열, 0, 빈 배열)
- Optional chaining 활용 (`req.status || ''`)
- 에러 메시지 개선 (`error.message || '알 수 없는 오류'`)

### 테스트 방법

각 페이지 접속 시 브라우저 개발자 도구(F12) 콘솔에서 다음을 확인:

1. **로그인 후 리다이렉트**
   ```
   Login successful, redirecting to: [URL]
   User role: 관리자 또는 신청자
   ```

2. **관리자 대시보드**
   ```
   AdminDashboard: Initializing...
   Session token: Present
   Loading dashboard stats...
   Stats received: { today: { ... } }
   Loading urgent requests...
   Urgent requests received: N items
   AdminDashboard: Initialization complete
   ```

3. **사용자 신규 신청**
   ```
   NewRequestPage: Initializing...
   Current user: { userId, name, team, ... }
   handleSubmit: Starting...
   Form data: { itemName, quantity, ... }
   createRequest result: { success: true, requestNo: ... }
   Navigating to dashboard...
   ```

4. **관리자 전체 목록**
   ```
   AdminPage: Initializing...
   Loading code list...
   Loading all requests...
   getAllRequests result: N items
   Table rendered with N rows
   AdminPage: Initialization complete
   ```

### 주의사항

1. **샘플 데이터 날짜**: `templates/신청내역.csv`의 데이터가 과거 날짜(2025-01-01~02)이므로, 오늘 날짜 기준 통계에는 표시되지 않을 수 있습니다.

2. **긴급 처리 필요 조건**: 접수중 상태이고 신청일시가 1일 이상 경과한 건만 표시됩니다.

3. **브라우저 콘솔 확인**: 데이터가 제대로 표시되지 않으면 반드시 콘솔 로그를 확인하여 어느 단계에서 문제가 발생했는지 파악하세요.

### 해결된 문제

- ✅ 관리자 대시보드 데이터 로딩 및 표시
- ✅ 사용자 신규 신청 등록 기능
- ✅ 관리자 전체 신청 목록 표시
- ✅ 사용자 대시보드 통계 및 알림
- ✅ 내 신청 목록 표시
- ✅ 관리자 신청 상세 관리

### 다음 단계

1. Google Apps Script Editor에 코드 배포
2. 실제 데이터로 테스트
3. 브라우저 콘솔 로그 확인
4. 문제 발생 시 콘솔 로그 내용 공유





