# 쿠다랩스 사내 운영 ERP 상세 기획서

작성일: 2026-05-26

## 1. 목표

쿠다랩스 ERP는 ROV 선박 검사 현장 리포트 시스템과 분리된 독립형 사내 운영 시스템이다. 법인의 계약, 매출, 지출, 거래처, 인사, 회의, 일정, 경영보고를 한곳에서 관리하고, Google Calendar, Google Drive, Gemini API를 활용해 반복 업무를 자동화한다.

핵심 방향은 다음과 같다.

- 외부 메신저나 개별 스프레드시트에 흩어진 정보를 ERP 내부로 모은다.
- ERP 내부 캘린더와 회의관리 메뉴를 업무 허브로 사용한다.
- Gemini를 OCR, 문서 요약, 일일 경영보고, 거래처 분류 보조 도구로 사용한다.
- 회계, 인사, 계약 데이터는 권한, 감사 로그, 승인 절차를 포함해 안전하게 관리한다.
- 홈택스, 은행 연동 등 인증 난도가 높은 기능은 MVP 이후 단계적으로 붙인다.

## 2. 전체 메뉴 구조

### 2.1 대시보드

대표와 경영지원 담당자가 매일 가장 먼저 보는 화면이다.

표시 항목:

- 오늘 일정
- 오늘 회의
- 미입금 계약
- 발행 대기 세금계산서
- 이번 달 매출 합계
- 이번 달 지출 합계
- 이번 달 예상 현금흐름
- 미승인 지출
- Gemini 일일경영보고
- 주요 알림

### 2.2 거래처 관리

발주처, 선사, 협력업체, 공급업체, 잠재 고객, 담당자 명함을 관리한다.

주요 기능:

- 거래처 등록, 수정, 삭제
- 거래처 유형 분류
- 담당자 연락처 관리
- 명함 이미지 업로드
- Gemini 기반 명함 OCR
- OCR 결과 검수 및 저장
- 거래처별 계약, 회의, 일정, 파일 히스토리 조회
- 중요 거래처 즐겨찾기
- 거래처별 메모 및 태그

거래처 유형 예시:

- 발주처
- 선사
- 협력업체
- 장비 공급업체
- 정비 업체
- 회계/세무
- 잠재 고객
- 기타

명함 OCR 처리 흐름:

1. 사용자가 명함 이미지를 업로드한다.
2. 이미지는 Google Drive 또는 서버 스토리지에 저장된다.
3. Gemini Vision이 이름, 회사명, 직책, 전화번호, 이메일, 주소, 웹사이트를 추출한다.
4. ERP가 기존 거래처와 중복 가능성을 검사한다.
5. 사용자가 추출 결과를 검수한다.
6. 거래처 또는 담당자 정보로 저장한다.

### 2.3 계약 및 매출 관리

검사 완료 후 쿠다랩스 법인으로 인입되는 매출과 정산 흐름을 관리한다.

주요 기능:

- 계약 등록
- 발주처 연결
- 계약 금액, 부가세, 총액 자동 계산
- 계약서, 견적서, 발주서 첨부
- 세금계산서 발행 상태 관리
- 입금 상태 관리
- 분할 입금 관리
- 정산 완료 처리
- 거래처별 계약 이력 조회

상태 예시:

- 계약 준비
- 계약 완료
- 세금계산서 발행 대기
- 세금계산서 발행 완료
- 입금 대기
- 부분 입금
- 입금 완료
- 정산 완료
- 취소

### 2.4 지출 및 매입 관리

법인 운영 지출, 장비 구입, 유지보수, 임대료, 출장비, 법인카드 지출을 관리한다.

주요 기능:

- 지출 등록
- 영수증 이미지 업로드
- Gemini OCR 자동 분석
- 지출 카테고리 자동 추천
- 거래처/공급업체 연결
- 승인 요청
- 승인/반려
- 지급 완료 처리
- 월별 지출 리포트

지출 카테고리 예시:

- 장비비
- 수리/정비비
- 여비교통비
- 숙박비
- 식대
- 인건비
- 임대료
- 통신비
- 소모품비
- 세무/회계
- 보험료
- 교육비
- 기타

### 2.5 회의 관리

사내 회의, 거래처 미팅, 프로젝트 회의, 경영 회의를 별도 메뉴로 관리한다. 회의는 캘린더 일정과 연결될 수 있어야 한다.

주요 기능:

- 회의 등록
- 회의 유형 분류
- 참석자 관리
- 거래처 연결
- 관련 계약/프로젝트 연결
- 회의 안건 등록
- 회의록 작성
- 액션 아이템 등록
- 담당자와 기한 지정
- 회의록 파일 첨부
- Gemini 회의록 요약
- Gemini 액션 아이템 추출
- 회의 후속 일정 생성

회의 유형 예시:

- 경영 회의
- 영업 미팅
- 거래처 미팅
- 프로젝트 킥오프
- 프로젝트 정산 회의
- 인사 면담
- 장비/기술 회의
- 세무/회계 회의
- 기타

회의 상태:

- 예정
- 진행 완료
- 회의록 작성 중
- 후속 조치 진행 중
- 완료

### 2.6 캘린더

ERP 내부 업무 허브다. FullCalendar 기반 UI를 사용하고 Google Calendar와 연동한다.

주요 기능:

- 일정 등록, 수정, 삭제
- Google Calendar 양방향 동기화
- 일정 카테고리 지정
- 거래처, 계약, 회의 연결
- 반복 일정
- 참석자 초대
- 알림 설정
- 일정별 메모
- 일정에서 회의 생성
- 일정에서 지출 또는 계약 연결

일정 카테고리:

- 매출정산
- 지출
- 인사미팅
- 거래처미팅
- 프로젝트
- 경영회의
- 일반업무

### 2.7 인사 관리

임직원 기본 정보와 재직 상태를 관리한다.

주요 기능:

- 직원 등록
- 직무/직급 관리
- 입사일, 퇴사일 관리
- 재직 상태 관리
- 급여 기본 정보 관리
- 증명서 발급 기초 데이터 관리
- 인사 면담 기록
- 권한 계정 연결

MVP에서는 급여 계산, 4대보험, 연말정산까지 직접 처리하지 않고 기본 인사정보 관리까지만 포함한다.

### 2.8 일일경영보고

매일 지정 시간에 ERP 데이터를 요약해 대표용 브리핑을 생성한다.

포함 내용:

- 오늘의 주요 일정
- 오늘 진행된 회의 요약
- 미완료 액션 아이템
- 오늘 등록된 매출/계약 변화
- 오늘 등록된 지출 변화
- 미입금/발행대기 건
- 이번 주 자금 흐름
- 내일 챙겨야 할 일
- 리스크 또는 확인 필요 항목

운영 원칙:

- Gemini 결과는 최종 판단이 아니라 경영지원 초안으로 취급한다.
- 모든 수치에는 원본 데이터 링크를 연결한다.
- 회계, 인사, 계약 관련 민감 데이터는 필요한 최소 범위만 프롬프트에 포함한다.

### 2.9 알림 센터

ERP 내부 알림을 한곳에서 관리한다.

알림 예시:

- 세금계산서 발행 예정
- 입금 예정일 도래
- 미입금 지연
- 지출 승인 요청
- 회의 액션 아이템 기한 임박
- Google Calendar 동기화 오류
- Gemini OCR 검수 필요
- 일일경영보고 생성 완료

## 3. 권한 설계

사용자 역할:

- 대표
- 관리자
- 경영지원
- 회계담당
- 인사담당
- 일반직원
- 외부 감사/세무 열람 계정

권한 기준:

- 대표: 전체 조회 및 승인
- 관리자: 시스템 설정, 사용자 관리
- 경영지원: 거래처, 계약, 일정, 회의, 지출 관리
- 회계담당: 매출, 지출, 세금계산서, 입출금 관리
- 인사담당: 인사 정보 관리
- 일반직원: 본인 지출, 본인 일정, 본인 회의 액션 아이템
- 외부 계정: 지정 범위 읽기 전용

민감 정보:

- 급여
- 계약금액
- 계좌 정보
- 세금계산서
- 인사 면담 기록

위 항목은 별도 권한이 있는 사용자만 접근할 수 있어야 한다.

## 4. 데이터베이스 설계

### 4.1 Users

| 컬럼명 | 타입 | 설명 |
| --- | --- | --- |
| id | UUID | 사용자 ID |
| email | VARCHAR | 로그인 이메일 |
| name | VARCHAR | 사용자명 |
| role | VARCHAR | 권한 역할 |
| employee_id | UUID | 직원 정보 연결 |
| status | VARCHAR | 활성, 비활성 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

### 4.2 Clients

| 컬럼명 | 타입 | 설명 |
| --- | --- | --- |
| id | UUID | 거래처 ID |
| name | VARCHAR | 거래처명 |
| client_type | VARCHAR | 거래처 유형 |
| business_number | VARCHAR | 사업자등록번호 |
| ceo_name | VARCHAR | 대표자명 |
| phone | VARCHAR | 대표 전화 |
| email | VARCHAR | 대표 이메일 |
| address | TEXT | 주소 |
| website | VARCHAR | 웹사이트 |
| memo | TEXT | 메모 |
| tags | JSON | 태그 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

### 4.3 Client_Contacts

| 컬럼명 | 타입 | 설명 |
| --- | --- | --- |
| id | UUID | 담당자 ID |
| client_id | UUID | 거래처 ID |
| name | VARCHAR | 담당자명 |
| position | VARCHAR | 직책 |
| department | VARCHAR | 부서 |
| mobile | VARCHAR | 휴대폰 |
| phone | VARCHAR | 사무실 전화 |
| email | VARCHAR | 이메일 |
| business_card_image_url | VARCHAR | 명함 이미지 |
| ocr_raw_text | TEXT | OCR 원문 |
| ocr_confidence | DECIMAL | OCR 신뢰도 |
| memo | TEXT | 메모 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

### 4.4 Project_Contracts

| 컬럼명 | 타입 | 설명 |
| --- | --- | --- |
| id | UUID | 계약 ID |
| client_id | UUID | 거래처 ID |
| project_title | VARCHAR | 계약명 |
| contract_amount | BIGINT | 공급가액 |
| vat_amount | BIGINT | 부가세 |
| total_amount | BIGINT | 합계 |
| billing_status | VARCHAR | 세금계산서 상태 |
| payment_status | VARCHAR | 입금 상태 |
| contract_status | VARCHAR | 계약 상태 |
| contracted_at | DATE | 계약일 |
| due_date | DATE | 입금 예정일 |
| closed_at | DATE | 정산 완료일 |
| memo | TEXT | 메모 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

### 4.5 Corporate_Expenses

| 컬럼명 | 타입 | 설명 |
| --- | --- | --- |
| id | UUID | 지출 ID |
| client_id | UUID | 공급업체 또는 거래처 ID |
| expense_category | VARCHAR | 지출 항목 |
| amount | BIGINT | 지출 금액 |
| vat_amount | BIGINT | 부가세 |
| total_amount | BIGINT | 합계 |
| payment_method | VARCHAR | 결제 수단 |
| approval_status | VARCHAR | 승인 상태 |
| receipt_image_url | VARCHAR | 영수증 이미지 |
| gemini_analysis | TEXT | Gemini 분석 결과 |
| spent_at | TIMESTAMP | 지출 일시 |
| created_by | UUID | 등록자 |
| approved_by | UUID | 승인자 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

### 4.6 Meetings

| 컬럼명 | 타입 | 설명 |
| --- | --- | --- |
| id | UUID | 회의 ID |
| title | VARCHAR | 회의 제목 |
| meeting_type | VARCHAR | 회의 유형 |
| status | VARCHAR | 회의 상태 |
| client_id | UUID | 관련 거래처 |
| contract_id | UUID | 관련 계약 |
| calendar_event_id | UUID | 연결 일정 |
| location | VARCHAR | 장소 |
| started_at | TIMESTAMP | 시작 시간 |
| ended_at | TIMESTAMP | 종료 시간 |
| agenda | TEXT | 안건 |
| minutes | TEXT | 회의록 |
| gemini_summary | TEXT | Gemini 요약 |
| created_by | UUID | 작성자 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

### 4.7 Meeting_Attendees

| 컬럼명 | 타입 | 설명 |
| --- | --- | --- |
| id | UUID | 참석자 ID |
| meeting_id | UUID | 회의 ID |
| user_id | UUID | 내부 사용자 |
| contact_id | UUID | 외부 담당자 |
| attendee_name | VARCHAR | 직접 입력 참석자명 |
| attendee_type | VARCHAR | 내부, 외부, 기타 |

### 4.8 Action_Items

| 컬럼명 | 타입 | 설명 |
| --- | --- | --- |
| id | UUID | 액션 아이템 ID |
| meeting_id | UUID | 회의 ID |
| title | VARCHAR | 할 일 |
| description | TEXT | 상세 내용 |
| assignee_id | UUID | 담당자 |
| due_date | DATE | 기한 |
| status | VARCHAR | 상태 |
| completed_at | TIMESTAMP | 완료일 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

### 4.9 Calendar_Events

| 컬럼명 | 타입 | 설명 |
| --- | --- | --- |
| id | UUID | 일정 ID |
| google_event_id | VARCHAR | Google Calendar 이벤트 ID |
| title | VARCHAR | 일정 제목 |
| category | VARCHAR | 일정 카테고리 |
| client_id | UUID | 관련 거래처 |
| contract_id | UUID | 관련 계약 |
| meeting_id | UUID | 관련 회의 |
| start_time | TIMESTAMP | 시작 시간 |
| end_time | TIMESTAMP | 종료 시간 |
| description | TEXT | 상세 내용 |
| sync_status | VARCHAR | 동기화 상태 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

### 4.10 Human_Resources

| 컬럼명 | 타입 | 설명 |
| --- | --- | --- |
| id | UUID | 직원 ID |
| emp_name | VARCHAR | 직원 이름 |
| role | VARCHAR | 직무/직급 |
| department | VARCHAR | 부서 |
| base_salary | BIGINT | 기본급 |
| joined_at | DATE | 입사일 |
| resigned_at | DATE | 퇴사일 |
| status | VARCHAR | 재직 상태 |
| phone | VARCHAR | 연락처 |
| email | VARCHAR | 이메일 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

### 4.11 Attachments

| 컬럼명 | 타입 | 설명 |
| --- | --- | --- |
| id | UUID | 첨부파일 ID |
| entity_type | VARCHAR | 연결 대상 유형 |
| entity_id | UUID | 연결 대상 ID |
| file_name | VARCHAR | 파일명 |
| file_url | VARCHAR | 파일 경로 |
| mime_type | VARCHAR | 파일 형식 |
| file_size | BIGINT | 파일 크기 |
| uploaded_by | UUID | 업로드 사용자 |
| created_at | TIMESTAMP | 생성일 |

### 4.12 Daily_Management_Reports

| 컬럼명 | 타입 | 설명 |
| --- | --- | --- |
| id | UUID | 보고서 ID |
| report_date | DATE | 보고 기준일 |
| gemini_briefing | TEXT | 보고서 본문 |
| source_snapshot | JSON | 보고서 생성 당시 참고 데이터 |
| is_read | BOOLEAN | 읽음 여부 |
| created_at | TIMESTAMP | 생성일 |

### 4.13 Audit_Logs

| 컬럼명 | 타입 | 설명 |
| --- | --- | --- |
| id | UUID | 로그 ID |
| user_id | UUID | 사용자 ID |
| action | VARCHAR | 작업 유형 |
| entity_type | VARCHAR | 대상 유형 |
| entity_id | UUID | 대상 ID |
| before_data | JSON | 변경 전 |
| after_data | JSON | 변경 후 |
| ip_address | VARCHAR | IP |
| created_at | TIMESTAMP | 생성일 |

### 4.14 Notifications

| 컬럼명 | 타입 | 설명 |
| --- | --- | --- |
| id | UUID | 알림 ID |
| user_id | UUID | 수신자 |
| title | VARCHAR | 제목 |
| body | TEXT | 내용 |
| notification_type | VARCHAR | 알림 유형 |
| target_url | VARCHAR | 이동 경로 |
| is_read | BOOLEAN | 읽음 여부 |
| created_at | TIMESTAMP | 생성일 |

## 5. AI 기능 설계

### 5.1 명함 OCR

입력:

- 명함 이미지

출력:

- 회사명
- 이름
- 직책
- 부서
- 휴대폰
- 전화번호
- 이메일
- 주소
- 웹사이트
- 추정 거래처 유형
- 중복 거래처 후보

검수 방식:

- AI가 추출한 값은 임시 상태로 저장한다.
- 사용자가 필드별로 수정 후 저장한다.
- 낮은 신뢰도 항목은 화면에서 강조한다.

### 5.2 영수증 OCR

입력:

- 영수증 이미지

출력:

- 가맹점명
- 지출 일시
- 공급가액
- 부가세
- 총액
- 결제 수단
- 지출 카테고리 추천
- 업무 관련성 요약

### 5.3 회의록 요약

입력:

- 회의 안건
- 회의록 원문
- 참석자
- 관련 거래처/계약

출력:

- 회의 요약
- 결정사항
- 액션 아이템
- 담당자 후보
- 기한 후보
- 후속 일정 제안

### 5.4 일일경영보고

입력:

- 오늘 일정
- 오늘 회의
- 오늘 등록된 계약
- 오늘 변경된 지출
- 미입금 계약
- 미승인 지출
- 액션 아이템
- 내일 일정

출력:

- 오늘의 핵심 요약
- 매출/지출 변화
- 리스크
- 내일 해야 할 일
- 대표 확인 필요 항목

## 6. 외부 연동

### 6.1 Google Calendar

목표:

- ERP 캘린더와 Google Calendar 양방향 동기화

필요 요소:

- Google Cloud 프로젝트
- OAuth 클라이언트
- Calendar API 활성화
- 사용자별 Google 계정 연결
- Webhook 수신용 HTTPS 엔드포인트
- 동기화 실패 재시도 로직

### 6.2 Google Drive

목표:

- 명함, 영수증, 계약서, 회의록 파일 저장

필요 요소:

- Drive API 활성화
- 폴더 구조 정책
- 파일 접근 권한 정책
- ERP DB와 파일 URL 연결

권장 폴더 구조:

- ERP/BusinessCards
- ERP/Receipts
- ERP/Contracts
- ERP/Meetings
- ERP/HR

### 6.3 Gemini API

목표:

- 명함 OCR
- 영수증 OCR
- 회의록 요약
- 일일경영보고 생성

운영 원칙:

- 민감 데이터는 최소한으로 전달한다.
- API 요청/응답 로그에는 개인정보 원문을 과도하게 저장하지 않는다.
- AI 결과는 사람이 검수할 수 있어야 한다.

### 6.4 홈택스/세금계산서

MVP에서는 직접 발행 자동화보다 상태 관리와 발행 준비 기능을 먼저 구현한다.

MVP 기능:

- 발행 대기 목록
- 발행 정보 검증
- 공급가액/부가세 자동 계산
- 발행 요청 상태
- 발행 완료 파일 첨부

2차 이후 검토:

- 인증된 전자세금계산서 ASP 연동
- 국세청 표준 인증 요건 검토
- 공동인증서 관리 정책

## 7. 화면 목록

MVP 화면:

- 로그인
- 대시보드
- 거래처 목록
- 거래처 상세
- 명함 OCR 등록
- 계약 목록
- 계약 상세
- 지출 목록
- 지출 상세
- 영수증 OCR 등록
- 캘린더
- 회의 목록
- 회의 상세
- 회의록 작성
- 액션 아이템 목록
- 인사 목록
- 직원 상세
- 일일경영보고
- 알림 센터
- 설정

관리자 화면:

- 사용자 관리
- 권한 관리
- Google 연동 설정
- AI 프롬프트 설정
- 감사 로그

## 8. API 설계 초안

거래처:

- `GET /api/clients`
- `POST /api/clients`
- `GET /api/clients/:id`
- `PATCH /api/clients/:id`
- `DELETE /api/clients/:id`
- `POST /api/clients/business-card/ocr`

계약:

- `GET /api/contracts`
- `POST /api/contracts`
- `GET /api/contracts/:id`
- `PATCH /api/contracts/:id`
- `POST /api/contracts/:id/close`

지출:

- `GET /api/expenses`
- `POST /api/expenses`
- `GET /api/expenses/:id`
- `PATCH /api/expenses/:id`
- `POST /api/expenses/receipt/ocr`
- `POST /api/expenses/:id/approve`
- `POST /api/expenses/:id/reject`

회의:

- `GET /api/meetings`
- `POST /api/meetings`
- `GET /api/meetings/:id`
- `PATCH /api/meetings/:id`
- `POST /api/meetings/:id/summarize`
- `POST /api/meetings/:id/action-items`

캘린더:

- `GET /api/calendar/events`
- `POST /api/calendar/events`
- `PATCH /api/calendar/events/:id`
- `DELETE /api/calendar/events/:id`
- `POST /api/google/calendar/webhook`
- `POST /api/google/calendar/sync`

보고:

- `GET /api/reports/daily`
- `POST /api/reports/daily/generate`
- `PATCH /api/reports/daily/:id/read`

## 9. MVP 개발 순서

### 1단계: 프로젝트 기반

- Next.js 프로젝트 구성
- PostgreSQL 연결
- Prisma 스키마 작성
- 로그인/권한 기초 구현
- 공통 레이아웃과 내비게이션

### 2단계: 핵심 마스터 데이터

- 사용자 관리
- 직원 관리
- 거래처 관리
- 담당자 관리
- 첨부파일 관리

### 3단계: 계약/지출

- 계약 등록 및 상태 관리
- 지출 등록 및 승인
- 영수증 첨부
- 대시보드 기본 통계

### 4단계: 캘린더/회의

- 내부 캘린더
- 회의 등록
- 참석자 관리
- 회의록
- 액션 아이템

### 5단계: AI 자동화

- 명함 OCR
- 영수증 OCR
- 회의록 요약
- 일일경영보고 생성

### 6단계: Google 연동

- Google Calendar OAuth
- Calendar API 동기화
- Google Drive 파일 저장
- Webhook 수신 및 재동기화

### 7단계: 운영 안정화

- 감사 로그
- 알림 센터
- 데이터 백업
- 권한 세분화
- 오류 로그
- 배포 환경 구성

## 10. 추천 기술 스택

프론트엔드:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- FullCalendar

백엔드:

- Next.js API Routes 또는 NestJS
- Prisma
- PostgreSQL
- Redis
- BullMQ 또는 cron 스케줄러

인증:

- Auth.js 또는 NextAuth
- Google OAuth
- 역할 기반 접근 제어

파일:

- Google Drive API 또는 S3 호환 스토리지

AI:

- Gemini API

배포:

- 초기: VPS 또는 Docker 기반 서버
- 이후: AWS, GCP, 또는 국내 클라우드

## 11. 보안 체크리스트

- 비밀번호 또는 OAuth 계정 기반 로그인
- 역할 기반 권한
- 주요 데이터 수정 감사 로그
- 급여/계약금액 접근 제한
- 파일 접근 권한 제한
- API 키 환경변수 관리
- DB 자동 백업
- 개인정보 최소 수집
- AI 요청 데이터 최소화
- 운영 서버 HTTPS 적용

## 12. 우선순위

높음:

- 로그인/권한
- 거래처 관리
- 명함 OCR
- 계약/매출 관리
- 지출/영수증 OCR
- 회의 관리
- 캘린더
- 일일경영보고
- 감사 로그

중간:

- Google Calendar 양방향 동기화
- Google Drive 파일 관리
- 알림 센터
- 승인 워크플로우
- 액션 아이템 자동 추출

낮음 또는 2차:

- 홈택스 자동 발행
- 은행 입출금 자동 연동
- 급여 계산
- 4대보험
- 전자결재 고도화
- 외부 세무사 전용 포털

## 13. 다음 결정 사항

개발 착수 전에 아래 항목을 결정해야 한다.

- ERP를 웹 전용으로 할지, 모바일 화면까지 MVP에 포함할지
- Google Drive를 파일 저장소로 확정할지
- 로그인 방식을 회사 Google 계정 기반으로 할지
- 대표, 경영지원, 일반직원 권한 범위를 어디까지 나눌지
- 홈택스 기능을 MVP에서 제외하고 상태 관리만 할지
- 첫 배포 서버를 어디에 둘지

