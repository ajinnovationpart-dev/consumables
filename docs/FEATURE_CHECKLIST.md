# 전체 기능 점검 체크리스트

메뉴·페이지·API·연계성 기준 점검 결과입니다.

---

## 1. 라우트·권한

| 경로 | 권한 | 레이아웃 | 비고 |
|------|------|----------|------|
| `/login` | 비로그인 | 없음 | 성공 시 역할별 `/admin` 또는 `/dashboard` |
| `/` | 로그인 필수 | PrivateRoute | HomeRedirect → 관리자 `/admin`, 신청자 `/dashboard` |
| `*` | - | - | `/`로 리다이렉트 후 위 규칙 적용 |
| `/dashboard` | 로그인 | Layout | 사용자 대시보드 |
| `/new-request` | 로그인 | Layout | 신규 신청 |
| `/my-requests` | 로그인 | Layout | 내 신청 목록 |
| `/my-info` | 로그인 | Layout | 내 정보·비밀번호 변경 |
| `/request/:requestNo` | 로그인, 본인 또는 관리자 | Layout | 신청 상세(공통) |
| `/admin` | 관리자만 | Layout | 관리자 대시보드 |
| `/admin/requests` | 관리자만 | Layout | 전체 신청 목록 |
| `/admin/master` | 관리자만 | Layout | 기준정보 등록/관리 |
| `/admin/statistics` | 관리자만 | Layout | 통계 및 리포트 |
| `/unauthorized` | 로그인 | Layout | 권한 없음 안내 |

---

## 2. 메뉴(Layout) ↔ 페이지 연계

### 사용자
- **대시보드** → `/dashboard`
- **신규 신청** → `/new-request`
- **내 신청** → `/my-requests`
- **내 정보** → `/my-info`
- **알림(🔔)** → `/my-requests` (배지: 발주완료 수령 확인 대기 건수)

### 관리자
- **관리자 대시보드** → `/admin`
- **전체 신청** → `/admin/requests`
- **통계 및 리포트** → `/admin/statistics`
- **기준정보 등록/관리** → `/admin/master`

---

## 3. 페이지별 주요 기능·API·연계

| 페이지 | 주요 기능 | API | 이동 링크 |
|--------|-----------|-----|-----------|
| Login | 로그인 | POST /auth/login | 성공 시 redirectUrl |
| Dashboard | 통계 카드, 중요 알림, 최근 5건 | GET /requests/dashboard, /notification-count | /new-request, /my-requests, /my-info, /request/:id |
| NewRequest | 신청 등록, 기타 배송지, 촬영, 전화번호 포맷 | codes.deliveryPlaces, requests.my, requests.create | 성공 → /my-requests, 중복 시 기존 신청 상세 링크 |
| MyRequests | 키워드 검색, 상태·날짜 필터, 페이징, 정렬, 관리번호 컬럼 | GET /requests/my | /request/:id, 취소/수령확인 → updateStatus |
| RequestDetail | 진행바, 이미지 복사, 수령 확인(사용자), 상태/담당자/예상납기일/강제취소(관리자) | GET /requests/:id, PATCH status, admin.users.list | 목록으로(navigate -1), 관리자 시 /admin/requests |
| MyInfo | 기본 정보, 비밀번호 변경 | GET /auth/me, POST /auth/change-password | /dashboard |
| AdminDashboard | 기간, 통계 카드, 긴급/지연 테이블, 최근 신청 | GET /requests/dashboard | /admin/requests, /request/:id, /admin/statistics, /admin/master |
| AdminRequests | 상태·지역·날짜 필터, 발주진행/발주완료 버튼, 신청자(이름+ID) | GET /requests/all, codes.regions, PATCH status | /request/:id, /admin, /admin/statistics, /admin/master |
| AdminMaster | 사용자·배송지·CSV | GET/POST/PATCH /admin/users, delivery-places, import-csv, export-master | - |
| AdminStatistics | 기간, 통계, 차트 | GET /requests/dashboard, /requests/all | - |
| Unauthorized | 권한 없음 안내 | - | 다시 시도, 대시보드/로그인 |

---

## 4. 데이터·워딩 일치

- **신청자 ID(사번)**: Excel 헤더·UI는 "신청자ID" / "ID(사번)". API 키는 `requesterEmail`(값은 ID/사번).
- **지역**: 신청 건의 `region` vs **수령지**: `deliveryPlace`(배송지). 명칭 구분 유지.
- **상태**: 접수중, 발주진행, 발주완료(납기확인/납기미정), 처리완료, 접수취소 — 모두 `status`와 일치.

---

## 5. 점검 완료 항목

- [x] 루트(/) 역할별 리다이렉트 (관리자 → /admin, 신청자 → /dashboard)
- [x] 404(*) → / → HomeRedirect
- [x] 중복 접수 시 기존 신청 상세 링크 표시 (NewRequest)
- [x] 관리자 신청 상세: 목록으로 → /admin/requests 링크
- [x] 내 정보: 대시보드 링크
- [x] 발주 확인 시 신청자 ID(사번) 표기 (이메일 아님) — Excel·UI 반영
- [x] WORDING_FUNCTION_CHECK.md, LEGACY_HTML_FEATURE_ANALYSIS.md와 정합성

---

**최종 점검일**: 2026-01-27
