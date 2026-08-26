# 회귀 기준 (Regression Baseline)

작성: 2026-08-26 / 기준 커밋: `f3fb331` (chore: UX 업그레이드 작업 전 현재 상태 베이스라인)
목적: UX 업그레이드 작업 중 **아래 "동작함" 항목이 깨지지 않았는지** 매 단계마다 확인한다.

---

## 1. 4대 연동 기능의 실제 상태

| 기능 | 상태 | 근거 |
|---|---|---|
| 명함 촬영 인식 (OCR) | **동작함** | `src/app/api/ocr/business-card/route.ts` 가 Gemini 호출 + JSON 파싱까지 구현됨. `business-card-ocr-form.tsx`(256줄)가 업로드→인식→폼 채움을 수행 |
| 영수증 촬영 인식 (OCR) | **미구현 (스텁)** | `src/app/api/ocr/receipt/route.ts` 가 `"Receipt OCR request received."` 만 반환. 화면 버튼에 onClick 없음 |
| 세금계산서 연동 | **mock 전용** | `src/app/api/tax-invoices/issue/route.ts` 가 `TAX_INVOICE_PROVIDER !== "mock"` 이면 501 반환. mock은 `TEST-` 접두 가짜 승인번호 생성 |
| 구글 캘린더 연동 | **미구현** | 동기화 코드 0줄. `CalendarEvent` 모델에 `googleEventId` / `syncStatus` 필드는 있으나 한 번도 채워지지 않음. 화면은 `src/lib/calendar-data.ts` 의 하드코딩된 2026년 5월 데이터를 사용 |

> **요약: 회귀 위험이 실재하는 것은 "명함 OCR" 하나뿐이다.** 나머지 3개는 아직 만들 것이므로 깨질 기존 동작이 없다.

---

## 2. 반드시 지켜야 할 회귀 체크리스트

작업 단계가 끝날 때마다 아래를 확인한다.

### 2-1. 명함 OCR (최우선)
- [ ] `/clients/business-card` 진입 → 이미지 업로드 → 인식 결과가 폼에 채워짐
- [ ] 인식 실패 시 에러 메시지가 화면에 표시됨
- [ ] 인식 결과로 거래처 저장까지 완료됨
- [ ] `GEMINI_API_KEY` 미설정 시 500이 아니라 안내 메시지가 뜸

### 2-2. 인증 / 권한
- [ ] 로그인 → 세션 쿠키(`kudalabs_session`) 발급 → 대시보드 진입
- [ ] 비로그인 상태로 `/clients` 접근 시 `/login` 으로 리다이렉트
- [ ] 비로그인 상태로 `/api/clients` 호출 시 401
- [ ] **CEO/ADMIN 계정에만** 사이드바에 "관리자" 메뉴가 보임
- [ ] 일반 권한 계정이 `/admin` 직접 접근 시 `/` 로 리다이렉트
- [ ] 일반 권한 계정이 `/api/admin/users` 호출 시 403

### 2-3. 기존 화면 렌더링
- [ ] 9개 모듈 화면이 모두 에러 없이 렌더됨
  `/`, `/clients`, `/contracts`, `/calendar`, `/meetings`, `/expenses`, `/hr`, `/reports/daily`, `/notifications`
- [ ] 계약 상태 전환(`/api/contracts/[slug]/advance`)이 동작함
- [ ] 세금계산서 mock 발행이 여전히 `TEST-` 승인번호를 반환함

### 2-4. 빌드
- [ ] `npx tsc --noEmit` 에러 0건
- [ ] `npm run build` 성공

---

## 3. 작업 시작 시점에 이미 깨져 있던 것 (내가 만든 문제가 아님)

### 3-1. Prisma 클라이언트가 오래됨 → **로그인이 런타임에서 실패할 가능성 높음**
- `prisma/schema.prisma` 의 `User.passwordHash` 필드가 생성된 클라이언트에 **없음**
  (`node_modules/.prisma/client/index.d.ts` 내 `passwordHash` 검색 결과 0건)
- 마이그레이션 `20260803000000_add_password_hash` 이후 `prisma generate` 가 실행되지 않은 상태
- 이로 인해 `npx tsc --noEmit` 에서 아래 4개 파일에 총 8건 타입 에러 발생
  - `src/lib/auth.ts`
  - `src/app/api/auth/login/route.ts`
  - `src/app/api/admin/users/route.ts`
  - (+ `security-package-admin-clean/` 쪽 동일 파일들)
- **해결: 맥에서 `npx prisma generate` 실행.** (필요시 `npx prisma migrate deploy` 도)
- 자동화 불가 사유: 원격 리눅스 VM에서 실행하면 darwin 엔진이 linux 엔진으로 덮어써져 로컬 개발이 깨짐

### 3-2. 정리 대상 (기능 영향 없음)
- 루트에 `schema.prisma` 가 `prisma/schema.prisma` 와 **완전히 동일한 내용으로 중복** 존재
- `erp` 디렉터리가 빈 상태로 gitlink(submodule, mode 160000)로 커밋됨
- `.codex-write-test` 임시 파일이 저장소에 포함됨
- `src/.DS_Store` 존재

---

## 4. 참고: 0단계에서 수행한 병합

`security-package-admin-clean/src/` → `src/` 로 관리자 기능만 병합. 두 트리는 이제 `.DS_Store` 를 제외하고 동일하다.

| 항목 | 처리 |
|---|---|
| `src/app/admin/page.tsx` | 신규 복사 (서버에서 CEO/ADMIN 역할 검사 후 아니면 `/` 리다이렉트) |
| `src/app/api/admin/users/route.ts`, `.../[id]/route.ts` | 신규 복사 (`withAuth({ roles: ["CEO","ADMIN"] })` 로 보호) |
| `src/components/admin-users-panel.tsx` | 신규 복사 |
| `src/components/app-shell.tsx` | 덮어씀 — 차이는 CEO/ADMIN 일 때 사이드바에 "관리자" 항목을 추가하는 부분뿐 (순수 추가) |

`src/middleware.ts` 는 세션 쿠키 유무만 검사하므로 역할 검사는 페이지/API 레벨에서 이루어진다. 위 두 곳 모두 검사가 있으므로 `/admin` 은 이중으로 보호된다.
