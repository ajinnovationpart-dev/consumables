# A 백엔드(3000) API 호출 경로 점검 결과

**점검 일시**: 2026-02-03  
**구성**: B(3030) → `/api/a/*` 프록시 → A(3000)

---

## 1. 점검 요약

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| 1 | A(3000) 직접 `/health` | ✅ 200 | `{"status":"ok","timestamp":"..."}` |
| 2 | B(3030) 경유 OPTIONS `/api/a/auth/login` | ✅ 204 | CORS `Access-Control-Allow-Origin: https://ajinnovationpart-dev.github.io` |
| 3 | A(3000) 직접 POST `/api/auth/login` | ✅ 도달 | 인증 실패(401) = A까지 요청 도달 |
| 4 | B(3030) 경유 POST `/api/a/auth/login` | ✅ 프록시 동작 | B → A(3000)로 전달됨 |
| 5 | B(3030) 경유 GET `/api/a/health` | ✅ 200 | A health 응답 수신 (B → A 프록시 정상) |

---

## 2. 흐름 확인

```
[브라우저/GitHub Pages]
  → https://xxx.ngrok-free.dev/api/a/auth/login
  → ngrok (3030)
  → B (ordering_consumables, 3030)
  → /api/a/* → pathRewrite → A (hr-sample, 3000) /api/*
  → A 응답 → B → ngrok → 브라우저
```

- **OPTIONS**: B에서 처리, CORS 헤더 포함 204 반환.
- **POST/GET**: B가 A(3000)로 프록시하고, A 응답을 그대로 전달.

---

## 3. 결론

- **3000 포트(A)로 API가 호출되는지**: ✅ **정상**
- B(3030)의 `/api/a/*` 요청이 A(3000)의 `/api/*` 로 전달되며, health·login 등 실제 라우트까지 도달함.
- GitHub Pages → ngrok → B → A 경로에서 CORS 허용 로그(`✅ CORS allowed (GitHub Pages)`)도 확인됨.

---

## 4. 로그인 로직 및 진단 (A Backend)

### 4-1. 현재 로그인 로직 (A Backend)

- **환경 변수만 사용**: `ALLOWED_ADMIN_EMAILS`, `ADMIN_PASSWORD`
- **Excel 파일에서 데이터를 읽지 않음**
- A Backend(`E:\hr-sample\backend`) `.env` 예시:
  ```env
  ALLOWED_ADMIN_EMAILS=test@example.com,admin@example.com
  ADMIN_PASSWORD=admin123
  ```

### 4-2. “파일 데이터 확인이 안 된다”는 의미

- 로그인은 **Excel과 무관**하므로, “파일 데이터 확인이 안 된다”는 것은 **로그인 요청이 A Backend에 도달했는지**를 로그로 확인하라는 의미입니다.

### 4-3. A Backend 로그 확인 (진단 방법 1)

로그인 요청 시 **A Backend 터미널**에서 다음 로그가 나와야 합니다.

| 로그 | 의미 |
|------|------|
| `🔐 Login attempt:` | 로그인 요청이 **A Backend에 도달함** (이메일·허용 목록 등 디버그 정보 포함) |
| `✅ Login successful for: ...` | 로그인 성공 |
| `❌ Email not allowed:` / `❌ Password mismatch.` | 권한/비밀번호 오류 |

- **`🔐 Login attempt:` 가 전혀 보이지 않으면** → 요청이 A Backend에 도달하지 않은 것입니다. (ngrok 꺼짐, B 프록시 미동작, CORS 등 확인)

### 4-4. 직접 테스트 (진단 방법 2)

**A Backend 직접 요청:**

```powershell
# PowerShell
$body = '{"email":"test@example.com","password":"admin123"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body $body
```

```bash
# curl
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"admin123"}'
```

**B Backend 경유 요청:**

```powershell
# PowerShell
$body = '{"email":"test@example.com","password":"admin123"}'
Invoke-RestMethod -Uri "http://localhost:3030/api/a/auth/login" -Method POST -ContentType "application/json" -Body $body
```

```bash
# curl
curl -X POST http://localhost:3030/api/a/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"admin123"}'
```

- 두 경우 모두 **A Backend 터미널에 `🔐 Login attempt:`** 가 출력되어야 합니다.

### 4-5. 로그인 후 데이터 조회 테스트 (진단 방법 3)

로그인 성공 후 받은 `accessToken`으로 다른 API 호출 (B 경유):

```powershell
# 대시보드 데이터 (Bearer 토큰 필요)
Invoke-RestMethod -Uri "http://localhost:3030/api/a/interviews/dashboard" -Headers @{ "Authorization" = "Bearer <accessToken>" }

# 면접관 목록
Invoke-RestMethod -Uri "http://localhost:3030/api/a/interviewers" -Headers @{ "Authorization" = "Bearer <accessToken>" }
```

```bash
# curl (토큰 치환)
curl -H "Authorization: Bearer <accessToken>" http://localhost:3030/api/a/interviews/dashboard
curl -H "Authorization: Bearer <accessToken>" http://localhost:3030/api/a/interviewers
```

### 4-6. 요약

| 확인 항목 | 조치 |
|-----------|------|
| A 로그에 `🔐 Login attempt:` 없음 | 요청이 A에 도달하지 않음 → ngrok/B 프록시/CORS 점검 |
| `🔐 Login attempt:` 있음, `✅ Login successful` 없음 | `ALLOWED_ADMIN_EMAILS`, `ADMIN_PASSWORD` 및 입력 이메일/비밀번호 확인 |
| `✅ Login successful` 있음 | 로그인 정상 → 이후 API는 토큰으로 호출 |

---

## 5. B → A 전달 방식 (코드 기준)

### 5-1. 흐름

```
클라이언트 요청  →  B(3030)  →  pathRewrite  →  A(3000)
예: POST /api/a/auth/login     →     POST /api/auth/login
```

- **B**는 `app.use('/api/a', createProxyMiddleware({ ... }))` 로 **/api/a** 로 들어오는 요청만 A로 넘깁니다.
- **target**: `config.aBackendUrl` = `http://localhost:3000` (B의 `.env` 에서 `A_BACKEND_URL`).
- **pathRewrite**: B가 받은 path를 A 라우트에 맞게 바꿉니다.

### 5-2. pathRewrite 규칙 (B `backend/src/index.js`)

| B가 받는 path (req.originalUrl) | pathRewrite 결과 | A가 받는 요청 |
|----------------------------------|------------------|----------------|
| `/api/a/auth/login` | `/api/auth/login` | `POST http://localhost:3000/api/auth/login` |
| `/api/a/auth/login` (Express mount 시 req.url = `/auth/login`) | `/api` + `/auth/login` = `/api/auth/login` | 동일 |
| `/api/a/api/auth/login` (중복 /api) | `/api/auth/login` | 동일 |
| `/api/a/interviews/dashboard` | `/api/interviews/dashboard` | `GET http://localhost:3000/api/interviews/dashboard` |

- **로직**:  
  - 먼저 `/api/a/api` → `/api`, `/api/a` → `/api` 로 치환.  
  - 결과가 `/api`로 시작하지 않으면 앞에 `/api` 를 붙임 (Express mount 시 `/api/a` 이후 경로만 오는 경우 대비).

### 5-3. A에서 받는 경로 확인

- **A 라우트**: `app.use('/api/auth', authRouter)` → 로그인은 **POST /api/auth/login**.
- 따라서 B는 반드시 A에게 **/api/auth/login** (앞에 `/api` 포함)으로 보내야 합니다.  
  `/auth/login` 만 보내면 A는 404 (Cannot POST /auth/login)를 반환합니다.

### 5-4. B 로그로 전달 경로 확인

B 터미널에 다음 로그가 찍힙니다.

| 로그 | 의미 |
|------|------|
| `[A Proxy] POST /api/a/auth/login → A http://localhost:3000/api/auth/login` | B가 A로 요청 전달 시도 (전달 경로 확인) |
| `[A Proxy] Response: 200 POST /api/a/auth/login` | A가 200으로 응답함 (정상) |
| `[A Proxy] Error: ... POST /api/a/auth/login` | A 연결 실패 또는 타임아웃 (502 반환) |

- **첫 번째 로그가 안 나오면** → 요청이 B의 `/api/a` 프록시까지 도달하지 않은 것 (라우트 순서, CORS, ngrok 등 확인).
- **첫 번째는 나오는데 Response/Error 로그가 없으면** → A 응답 대기 중 타임아웃 또는 클라이언트 연결 끊김 가능.
- **Response: 200** 이 나오면 → B → A 전달 및 A 응답까지 정상.

### 5-5. 502 Bad Gateway 시 확인

| 증상 | 의미 | 조치 |
|------|------|------|
| **502 Bad Gateway** | B가 A(3000)로 요청을 보냈지만 연결 실패 또는 A가 응답하지 않음 | ① A Backend(hr-sample)가 **포트 3000에서 실행 중**인지 확인 ② B 터미널에 `[A Proxy] Error: ...` 로그 확인 (연결 거부/타임아웃 등) |
| B 로그 `[A Proxy] Error: connect ECONNREFUSED` | A(3000)에 연결할 수 없음 | A Backend 실행: `cd E:\hr-sample\backend` → `npm run dev` |
| B 로그 `[A Proxy] Error: ... timeout` | A 응답 지연 | A가 살아 있는지, 해당 API가 느린지 확인 |

- **B Backend(ordering_consumables)** 에서 사용하는 환경 변수는 **`A_BACKEND_URL=http://localhost:3000`** 만 있으면 됩니다.  
  `A_BACKEND_ENABLED` 는 **A(hr-sample)** 쪽 설정이며, B는 사용하지 않습니다.
- **대시보드** `GET /api/a/interviews/dashboard` 는 A에서 **인증 필요**(`adminAuth`)이므로, 요청 시 **Authorization: Bearer &lt;accessToken&gt;** 헤더가 있어야 합니다.

### 5-6. 체크리스트 (A에서 안 받을 때)

| 확인 | 내용 |
|------|------|
| B 로그에 `[A Proxy] ... → A http://localhost:3000/...` 있음? | 있으면 B는 A로 전달 시도함. 없으면 B 프록시 진입 전에 막힘. |
| A(3000) 프로세스 실행 중? | `Get-NetTCPConnection -LocalPort 3000` 등으로 확인. |
| A 로그에 `🔐 Login attempt:` 있음? | 있으면 A까지 도달. 없으면 A 미도달 또는 path 불일치. |
| A 로그에 `Cannot POST /auth/login` 있음? | pathRewrite가 `/api` 를 빼먹어서 A가 `/auth/login` 만 받는 경우. B pathRewrite 확인. |

### 5-7. 직접 테스트 (PowerShell)

```powershell
# A Backend 직접
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body '{"email":"ajinnovationpart@gmail.com","password":"admin123"}' -ContentType "application/json"

# B Backend 경유 (A가 실행 중일 때)
Invoke-RestMethod -Uri "http://localhost:3030/api/a/auth/login" -Method POST -Body '{"email":"ajinnovationpart@gmail.com","password":"admin123"}' -ContentType "application/json"

# 대시보드 (로그인 후 받은 토큰으로)
$token = (Invoke-RestMethod -Uri "http://localhost:3030/api/a/auth/login" -Method POST -Body '{"email":"ajinnovationpart@gmail.com","password":"admin123"}' -ContentType "application/json").data.accessToken
Invoke-RestMethod -Uri "http://localhost:3030/api/a/interviews/dashboard" -Headers @{ Authorization = "Bearer $token" }
```
