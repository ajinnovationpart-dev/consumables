# API 전수 점검 (프론트 ↔ 백엔드)

프론트엔드 `api.js` 및 페이지별 호출과 백엔드 라우트를 하나씩 대조한 결과입니다.

---

## 1. 인증 (`/api/auth`)

| 프론트 호출 | 메서드 | 경로 | 백엔드 라우트 | 요청/응답 | 일치 |
|-------------|--------|------|----------------|-----------|------|
| `auth.login(userId, password)` | POST | `/auth/login` | `POST /login` (auth.js) | body: `{ userId, password }` → `{ success, token, user, redirectUrl }` | ✅ |
| `auth.me()` | GET | `/auth/me` | `GET /me` (authMiddleware) | - → `{ success, user: { userId, name, role, team, region, employeeCode } }` | ✅ |
| `auth.changePassword(userId, oldPassword, newPassword)` | POST | `/auth/change-password` | `POST /change-password` (authMiddleware) | body: `{ userId, oldPassword, newPassword }` → `{ success, message }` | ✅ |

**마운트**: `app.use('/api/auth', authRoutes)` → 실제 경로 `/api/auth/login`, `/api/auth/me`, `/api/auth/change-password`

---

## 2. 신청 (`/api/requests`)

| 프론트 호출 | 메서드 | 경로 | 백엔드 라우트 | 요청/응답 | 일치 |
|-------------|--------|------|----------------|-----------|------|
| `requests.my()` | GET | `/requests/my` | `GET /my` (authMiddleware) | - → `Array` (본인 신청 목록, canCancel, canConfirmReceipt 포함) | ✅ |
| `requests.all(params)` | GET | `/requests/all?status=` | `GET /all` (adminOnly) | query: `status` → `Array` | ✅ |
| `requests.dashboard(params)` | GET | `/requests/dashboard?startDate=&endDate=` | `GET /dashboard` | query: `startDate`, `endDate` → `{ stats, recent, urgent, delayed, notifications, requests }` | ✅ |
| `requests.notificationCount()` | GET | `/requests/notification-count` | `GET /notification-count` | - → `{ count }` | ✅ |
| `requests.get(requestNo)` | GET | `/requests/:requestNo` | `GET /:requestNo` | - → 단일 신청 객체 (본인 또는 관리자) | ✅ |
| `requests.create(formData)` | POST | `/requests` | `POST /` | body: itemName, quantity, assetNo, photoBase64, region, deliveryPlace, phone, company, remarks, modelName, serialNo → `{ success, requestNo }` 또는 `{ isDuplicate, duplicateRequestNo }` | ✅ |
| `requests.updateStatus(requestNo, status, remarks, options)` | PATCH | `/requests/:requestNo/status` | `PATCH /:requestNo/status` | body: `{ status, remarks, handler?, expectedDeliveryDate? }` → `{ success, message }` | ✅ |

**라우트 순서**: `/my`, `/dashboard`, `/notification-count`, `/all` 가 `/:requestNo` 보다 **앞에** 정의되어 있어 `notification-count`, `all` 이 `:requestNo` 로 잡히지 않음. ✅

---

## 3. 코드 (`/api/codes`)

| 프론트 호출 | 메서드 | 경로 | 백엔드 라우트 | 요청/응답 | 일치 |
|-------------|--------|------|----------------|-----------|------|
| `codes.regions()` | GET | `/codes/regions` | `GET /regions` | - → `Array` (지역 목록) | ✅ |
| `codes.teams()` | GET | `/codes/teams` | `GET /teams` | - → `Array` (소속팀 목록) | ✅ |
| `codes.deliveryPlaces(team)` | GET | `/codes/delivery-places` 또는 `?team=` | `GET /delivery-places` (query.team) | query: `team` → 팀별 배송지 목록 | ✅ |

**마운트**: `app.use('/api/codes', codeRoutes)` → 실제 경로 `/api/codes/regions` 등

---

## 4. 관리자 (`/api/admin`)

| 프론트 호출 | 메서드 | 경로 | 백엔드 라우트 | 요청/응답 | 일치 |
|-------------|--------|------|----------------|-----------|------|
| `admin.users.list()` | GET | `/admin/users` | `GET /users` (adminOnly) | - → `Array` (userId, name, employeeCode, team, region, role, active) | ✅ |
| `admin.users.create(body)` | POST | `/admin/users` | `POST /users` | body: userId, name, employeeCode, team, region, role, active, password? → `{ success, message }` | ✅ |
| `admin.users.update(userId, body)` | PATCH | `/admin/users/:userId` | `PATCH /users/:userId` | body: name, employeeCode, team, region, role, active, password? → `{ success, message }` | ✅ |
| `admin.deliveryPlaces.list()` | GET | `/admin/delivery-places` | `GET /delivery-places` | - → `Array` (전체 배송지) | ✅ |
| `admin.deliveryPlaces.create(body)` | POST | `/admin/delivery-places` | `POST /delivery-places` | body: name, team, address, contact, manager, active, remarks → `{ success, message }` | ✅ |
| `admin.deliveryPlaces.update(body)` | PATCH | `/admin/delivery-places` | `PATCH /delivery-places` | body: **originalName, originalTeam** + name, team, address, contact, manager, active, remarks → `{ success, message }` | ✅ |
| `admin.importCsv(csvContent)` | POST | `/admin/import-csv` | `POST /import-csv` | body: `{ csvContent }` (또는 content) → `{ success, message, ... }` | ✅ |
| `admin.exportMaster()` | GET | `fetch(API_BASE + '/admin/export-master')` | `GET /export-master` | - → **Blob** (Excel 파일) | ✅ |

**참고**: `exportMaster` 는 `api()` 대신 `fetch()` + `API_BASE` 사용. `API_BASE` 가 항상 `/api` 포함하므로 경로는 `/api/admin/export-master` 로 일치. ✅

---

## 5. 첨부 파일 (이미지)

| 용도 | 프론트 | 백엔드 | 일치 |
|------|--------|--------|------|
| 이미지 URL | `getAttachmentUrl(photoUrl)` | - | - |
| 실제 서빙 | `origin + photoUrl` (photoUrl 예: `/api/attachments/xxx`) | `GET /api/attachments/:path(*)` (index.js) | ✅ |

**마운트**: `app.get('/api/attachments/:path(*)', ...)` → 프론트에서 `photoUrl` 이 `/api/attachments/...` 형태이면 `getApiOrigin() + photoUrl` 로 전체 URL 생성. 배포 시 `VITE_API_URL` 이 백엔드 주소이면 origin 이 백엔드로 설정됨. ✅

---

## 6. 페이지별 API 사용 정리

| 페이지 | 사용 API | 비고 |
|--------|----------|------|
| Login | `auth.login` | redirectUrl 로 역할별 이동 |
| Dashboard | `requests.dashboard` | stats, recent, notifications |
| Layout | `requests.notificationCount` | 신청자만, 배지용 |
| NewRequest | `codes.deliveryPlaces(team)`, `requests.my`, `requests.create` | 배송지 팀 기준, 자주 쓴 배송지, 생성 |
| MyRequests | `requests.my`, `requests.updateStatus` | 목록, 취소/수령확인 |
| RequestDetail | `requests.get`, `requests.updateStatus`, `admin.users.list` | 상세, 상태/담당자/예상납기일, 강제취소, 담당자 목록(관리자) |
| MyInfo | `auth.me`, `auth.changePassword` | 프로필, 비밀번호 변경 |
| AdminDashboard | `requests.dashboard`, `requests.all` (간접 없음) | 대시 데이터는 dashboard 만 사용 |
| AdminRequests | `requests.all`, `codes.regions`, `requests.updateStatus` | 전체 목록, 지역 필터, 접수완료/발주완료 |
| AdminMaster | `admin.users.*`, `admin.deliveryPlaces.*`, `admin.importCsv`, `admin.exportMaster` | 사용자/배송지 CRUD, CSV, Excel 내보내기 |
| AdminStatistics | `requests.dashboard(range)`, `requests.all` | 기간별 통계, 전체 목록 필터 |

---

## 7. 점검 결과 요약

- **인증**: 3개 모두 경로·메서드·요청/응답 일치. ✅  
- **신청**: 7개 모두 일치, 라우트 순서로 인한 충돌 없음. ✅  
- **코드**: 3개 모두 일치. ✅  
- **관리자**: 8개 모두 일치. ✅  
- **첨부 파일**: 서빙 경로 및 프론트 URL 조합 일치. ✅  
- **exportMaster**: Blob 응답, `fetch` + `API_BASE` 사용으로 경로 일치. ✅  

**결론**: 현재 프론트엔드에서 사용하는 API는 모두 백엔드 라우트와 일치하며, 메서드·경로·요청/응답 형태에 불일치 없음.

---

**점검일**: 2026-01-27
