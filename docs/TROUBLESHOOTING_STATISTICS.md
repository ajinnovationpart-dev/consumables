# 통계 페이지 데이터 로딩 문제 해결

## 🔴 증상
```
getAllRequests result: null
No requests found
```

---

## 🔍 확인 사항

### 1. Apps Script 실행 로그 확인

**방법:**
```
1. Apps Script Editor 열기
2. 왼쪽 메뉴에서 "실행" 클릭
3. 최근 실행 로그 확인
```

**찾아볼 로그:**
```
✅ 정상 케이스:
- "getAllRequests: START"
- "getAllRequests: user = admin (관리자)"
- "RequestModel.findAll: Sheet has 150 rows"
- "getAllRequests: SUCCESS - Returning 149 requests"

❌ 에러 케이스 1 - 권한 문제:
- "getAllRequests: ERROR - Not admin, role = 사용자"
→ 관리자 권한이 없음

❌ 에러 케이스 2 - 시트 없음:
- "RequestModel.findAll: ERROR - Cannot read property 'getDataRange'"
→ '신청내역' 시트가 없거나 이름이 다름

❌ 에러 케이스 3 - 데이터 없음:
- "RequestModel.findAll: No data rows found"
→ 시트에 헤더만 있고 데이터가 없음
```

---

### 2. Google Sheets 데이터 확인

**확인 방법:**
```
1. Google Sheets 문서 열기
2. '신청내역' 시트 선택
3. 데이터 확인:
   - 헤더 행(1행)이 있는가?
   - 데이터 행(2행 이하)이 있는가?
```

**예시:**
```
행 1 (헤더):
신청번호 | 신청일시 | 신청자ID | 신청자이름 | ...

행 2 (데이터):
2601070001 | 2025-01-07 10:00:00 | kim | 김철수 | ...

행 3 (데이터):
2601070002 | 2025-01-07 11:00:00 | lee | 이영희 | ...
```

**문제:**
- 헤더만 있고 데이터가 없으면 → 신청 등록 먼저 해야 함
- 시트가 아예 없으면 → `initialSetup()` 실행 필요

---

### 3. 시트 이름 확인

**Config.gs 확인:**
```javascript
const CONFIG = {
  SHEETS: {
    REQUESTS: '신청내역',  // ← 이 이름과 실제 시트 이름이 일치해야 함
    // ...
  }
};
```

**실제 시트 탭 이름과 비교:**
```
✅ 정상: 시트 이름 = "신청내역"
❌ 오류: 시트 이름 = "신청내역 " (공백 포함)
❌ 오류: 시트 이름 = "Request"
```

---

## 🛠️ 해결 방법

### 해결책 1: 테스트 데이터 추가

신청 등록 페이지에서 테스트 신청 1~2건 등록:

```
1. 사용자로 로그인
2. "새 신청 등록" 클릭
3. 폼 작성 및 제출
4. 관리자 대시보드 → 통계 페이지 재조회
```

---

### 해결책 2: initialSetup 실행

시트가 없거나 구조가 잘못된 경우:

```
1. Apps Script Editor 열기
2. Triggers.gs 열기
3. initialSetup() 함수 선택
4. "실행" 버튼 클릭
5. 권한 승인
```

---

### 해결책 3: 관리자 권한 확인

'사용자관리' 시트에서 현재 로그인한 계정 확인:

```
사용자ID | 이름 | 역할   | 활성여부
--------|------|--------|----------
admin   | 관리자| 관리자 | Y
kim     | 김철수| 사용자 | Y
```

**확인:**
- 현재 로그인 계정의 "역할"이 "관리자"인가?
- "활성여부"가 "Y"인가?

잘못된 경우:
```
사용자관리 시트에서 수정:
- 역할: 사용자 → 관리자
- 활성여부: N → Y
```

---

### 해결책 4: 상세 로그 확인

수정된 코드 재배포 후:

```
1. F12 → Console 열기
2. "🔍 조회" 버튼 클릭
3. 브라우저 콘솔에서:
   - "Calling getAllRequests API..."
   - "getAllRequests result: ..." ← 여기서 null인지 확인

4. Apps Script 실행 로그에서:
   - "getAllRequests: START"
   - "getAllRequests: user = ..."
   - "RequestModel.findAll: Sheet has X rows"
   - 에러 메시지 확인
```

---

## 📊 정상 작동 시 예상 로그

### 브라우저 콘솔 (F12)
```
Loading statistics for period: 2025-12-08 ~ 2026-01-24
Calling getAllRequests API...
getAllRequests result: 150 items
Filtered requests: 50 out of 150
Calculating statistics for 50 requests
Processing request 1 : 2601070001 - 접수중
Processing request 2 : 2601070002 - 처리완료
...
Statistics summary:
- Total: 50
- Completed: 40
- In Progress: 8
```

### Apps Script 실행 로그
```
getAllRequests: START
getAllRequests: user = admin (관리자)
RequestModel.findAll: START
RequestModel.findAll: Sheet has 151 rows (including header)
RequestModel.findAll: Processing 150 data rows
RequestModel.findAll: After filter = 150 objects
getAllRequests: SUCCESS - Returning 150 requests
```

---

## 🚨 긴급 임시 조치

데이터가 정말 없다면 **샘플 데이터 직접 입력**:

```
1. Google Sheets 열기
2. '신청내역' 시트 선택
3. 2행에 수동으로 입력:

2601070001 | 2025-01-07 10:00:00 | admin | 홍길동 | EMP001 | 영업팀 | 서울 | 연료필터 | HD-123 | SN-001 | 1 | DS25C305 | 본사 | 010-1234-5678 | ABC업체 | 테스트 | (사진URL) | 접수중 | | | | | | |

3. 통계 페이지 새로고침
```

---

## ✅ 최종 체크리스트

- [ ] '신청내역' 시트가 존재하는가?
- [ ] 시트에 헤더 행이 있는가?
- [ ] 시트에 데이터 행이 1개 이상 있는가?
- [ ] 현재 계정이 '사용자관리'에 등록되어 있는가?
- [ ] 현재 계정의 역할이 "관리자"인가?
- [ ] Apps Script 코드가 최신 버전으로 배포되었는가?
- [ ] 브라우저 캐시를 삭제했는가? (Ctrl+Shift+R)

---

## 🎯 다음 단계

모든 것을 확인했는데도 안 된다면:

1. **Apps Script 실행 로그 전체 복사**
2. **'신청내역' 시트 스크린샷**
3. **'사용자관리' 시트 스크린샷**
4. **F12 콘솔 로그 전체 복사**

위 정보를 제공해주시면 정확한 원인을 찾을 수 있습니다.





