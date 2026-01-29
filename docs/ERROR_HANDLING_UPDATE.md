# 에러 처리 및 빈 페이지 방지 업데이트

## 업데이트 일자: 2025-01-07

### 🎯 목적
사용자가 페이지 접속 시 "빈 페이지"가 나오는 문제를 해결하고, 모든 에러를 화면에 표시하여 디버깅을 용이하게 합니다.

---

## ✅ 적용된 페이지 (전체 6개)

### 사용자 페이지 (3개)
1. **NewRequestPage.html** - 신청 등록
2. **UserDashboard.html** - 사용자 대시보드
3. **MyRequestsPage.html** - 내 신청 목록

### 관리자 페이지 (3개)
4. **AdminDashboardPage.html** - 관리자 대시보드
5. **AdminPage.html** - 전체 신청 목록
6. **AdminRequestDetailPage.html** - 신청 상세 관리

---

## 🔧 추가된 기능

### 1. 전역 에러 핸들러 (모든 페이지)

모든 HTML 페이지의 `<script>` 시작 부분에 추가:

```javascript
// 전역 에러 핸들러 - 빈 페이지 방지
window.addEventListener('error', function(e) {
  console.error('Global error caught:', e.error || e.message);
  const errorDiv = document.createElement('div');
  errorDiv.className = 'alert alert-danger m-4';
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '20px';
  errorDiv.style.left = '50%';
  errorDiv.style.transform = 'translateX(-50%)';
  errorDiv.style.zIndex = '9999';
  errorDiv.style.maxWidth = '600px';
  errorDiv.innerHTML = `
    <h5>⚠️ 페이지 로딩 오류</h5>
    <p><strong>오류:</strong> ${e.message || '알 수 없는 오류'}</p>
    <button class="btn btn-primary btn-sm" onclick="window.location.reload()">새로고침</button>
    <button class="btn btn-secondary btn-sm" onclick="...">뒤로가기/로그인</button>
  `;
  document.body.appendChild(errorDiv);
});
```

**기능:**
- JavaScript 에러 발생 시 **자동으로 에러 메시지를 화면에 표시**
- 빈 페이지 대신 **사용자가 볼 수 있는 에러 알림 표시**
- **새로고침** 또는 **로그인/대시보드로 이동** 버튼 제공

### 2. 스크립트 로드 확인

모든 페이지의 `</script>` 종료 직전에 추가:

```javascript
// 스크립트 로드 완료 확인
console.log('✓ [페이지명] script loaded');
```

**목적:**
- 스크립트가 정상적으로 로드되었는지 콘솔에서 확인
- 빈 페이지 발생 시 어디까지 로드되었는지 추적

### 3. 안전한 네비게이션 함수

모든 페이지의 네비게이션 함수에 try-catch 추가:

```javascript
// 예시: NewRequestPage의 goBack
function goBack() {
  try {
    const sessionToken = getSessionToken();
    window.location.href = '?page=dashboard&token=' + encodeURIComponent(sessionToken);
  } catch (error) {
    console.error('goBack error:', error);
    window.location.href = '?page=login';
  }
}

// 예시: UserDashboard의 logout
function logout() {
  if (confirm('로그아웃하시겠습니까?')) {
    try {
      const sessionToken = getSessionToken();
      callServer('logout', sessionToken).then(() => {
        sessionStorage.removeItem('sessionToken');
        window.location.href = '?page=login';
      }).catch(error => {
        console.error('Logout error:', error);
        sessionStorage.removeItem('sessionToken');
        window.location.href = '?page=login';
      });
    } catch (error) {
      console.error('Logout error:', error);
      sessionStorage.removeItem('sessionToken');
      window.location.href = '?page=login';
    }
  }
}
```

---

## 🧪 테스트 방법

### 1. 브라우저 개발자 도구 열기
F12를 눌러 Console 탭을 열어둡니다.

### 2. 각 페이지 접속 시 확인할 로그

#### ✅ 정상 로드 시
```
✓ NewRequestPage script loaded
NewRequestPage: Initializing...
Session token: Present
Current user: { userId: "admin", name: "박유민", ... }
NewRequestPage: Initialization complete
```

#### ❌ 에러 발생 시
```
Global error caught: ReferenceError: callServer is not defined
(화면에 에러 메시지 표시)
```

### 3. 빈 페이지 발생 시 확인 사항

빈 페이지가 나타나면 다음을 확인:

1. **콘솔에서 스크립트 로드 확인**
   - `✓ [페이지명] script loaded` 메시지가 있는가?
   - 없다면: 스크립트 파일 자체에 문법 오류

2. **초기화 로그 확인**
   - `[페이지명]: Initializing...` 메시지가 있는가?
   - 없다면: `window.onload` 이전에 에러 발생

3. **에러 메시지 확인**
   - `Global error caught:` 메시지가 있는가?
   - 있다면: 해당 에러 내용 확인

4. **화면에 에러 알림 표시 여부**
   - 빨간색 에러 박스가 화면 상단에 나타나는가?
   - 나타나지 않는다면: 스크립트가 전혀 실행되지 않은 것

---

## 🚨 주요 에러 케이스 및 해결

### 케이스 1: "callServer is not defined"
**원인:** JavaScript.html이 제대로 로드되지 않음

**확인:**
```javascript
console.log('callServer:', typeof callServer);
```

**해결:**
- `<?!= include('JavaScript'); ?>` 태그 확인
- JavaScript.html 파일 존재 여부 확인

### 케이스 2: "getCurrentUser returned null"
**원인:** 세션 토큰이 만료되었거나 유효하지 않음

**해결:**
- 로그인 페이지로 자동 리다이렉트됨
- 세션 토큰 확인: `console.log('Token:', getSessionToken())`

### 케이스 3: "User role not authorized"
**원인:** 사용자 권한이 부족함

**해결:**
- 사용자관리 시트에서 역할 확인
- 로그: `console.log('User role:', user.role)`

### 케이스 4: 완전한 빈 페이지 (에러 표시도 없음)
**원인:** HTML 템플릿 파일 자체가 로드되지 않음

**확인:**
1. doGet 함수에서 페이지 라우팅 확인
2. 파일명 확인 (대소문자 구분)
3. Apps Script Editor에서 파일 존재 여부 확인

---

## 📊 적용 전후 비교

### Before (적용 전)
❌ 빈 페이지 → 사용자는 아무것도 볼 수 없음  
❌ 콘솔만 확인 가능 → 일반 사용자는 디버깅 불가  
❌ 에러 원인 파악 어려움  

### After (적용 후)
✅ 에러 발생 시 화면에 메시지 표시  
✅ "새로고침" 및 "뒤로가기" 버튼 제공  
✅ 콘솔에 상세 로그 출력  
✅ 스크립트 로드 단계별 추적 가능  

---

## 🔍 디버깅 체크리스트

빈 페이지 발생 시 다음 순서로 확인:

1. ✅ **브라우저 콘솔 열기** (F12)
2. ✅ **스크립트 로드 메시지 확인**
   - `✓ [페이지명] script loaded`
3. ✅ **초기화 로그 확인**
   - `[페이지명]: Initializing...`
4. ✅ **세션 토큰 확인**
   - `Session token: Present` 또는 `Missing`
5. ✅ **사용자 정보 확인**
   - `Current user: { ... }`
6. ✅ **에러 메시지 확인**
   - `Global error caught:` 또는 `init error:`
7. ✅ **Network 탭에서 API 호출 확인**
   - `google.script.run` 호출 성공 여부

---

## 📝 추가 개선 사항

### 향후 적용 예정
- [ ] 에러 로그를 서버로 전송하여 관리자가 모니터링
- [ ] 재시도 로직 추가 (API 호출 실패 시 자동 재시도)
- [ ] 오프라인 감지 및 안내 메시지
- [ ] 세션 만료 5분 전 경고 알림

---

## 결론

모든 주요 페이지에 **전역 에러 핸들러**와 **상세 로그**를 추가하여:
- ✅ 빈 페이지 문제 해결
- ✅ 사용자에게 명확한 에러 메시지 제공
- ✅ 디버깅 효율성 대폭 향상

이제 코드를 Apps Script Editor에 배포하고 실제 테스트를 진행하세요!





