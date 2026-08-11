# 쿠다랩스 사내 운영 ERP

NAS Docker 운영을 전제로 한 쿠다랩스 내부 ERP 프로젝트입니다. 운영 배포는
`docker-compose.yml`을 사용하며, Vercel 배포 설정은 사용하지 않습니다.

## 포함된 초기 구성

- Next.js App Router
- PostgreSQL
- Prisma
- Redis
- BullMQ worker
- Docker Compose
- 일일 PostgreSQL 백업 컨테이너
- 거래처, 계약, 지출, 회의, 캘린더, 일일경영보고 화면 골격
- ERP 상세 기획서

## 빠른 시작

```sh
cp .env.example .env
docker compose up -d --build
```

접속:

```text
http://localhost:3000
```

NAS 배포 세부 내용은 `docs/NAS_DEPLOYMENT.md`를 참고합니다.

컨테이너 배포 시 `migrate` 서비스가 `prisma migrate deploy`를 먼저 실행합니다.
마이그레이션이 성공한 뒤에만 Web과 Worker가 시작됩니다.

## Google Gemini OCR 연동

명함과 카드 영수증 OCR은 서버의 `GEMINI_API_KEY`로 Google AI Studio의 Gemini Vision API를 호출합니다. API 키는 브라우저로 전달되지 않습니다.

1. Google AI Studio에서 API 키를 발급합니다.
2. `.env`의 `GEMINI_API_KEY`에 키를 입력합니다.
3. 필요하면 `GEMINI_MODEL`과 `GEMINI_TIMEOUT_MS`를 조정한 뒤 web 컨테이너를 재시작합니다.

OCR 결과는 검수 화면에 표시된 뒤 거래처 연락처 또는 지출로 저장됩니다. 업로드 이미지는
NAS의 `./uploads`와 컨테이너의 `UPLOAD_DIR` 볼륨에 보존되며, 로그인한 사용자만
`/api/uploads/...`로 확인할 수 있습니다. 운영 환경에서는 `.env`의 `GEMINI_API_KEY`를
변경한 뒤 `docker compose up -d --build --force-recreate web worker`로 관련 컨테이너를
다시 만드세요.

NAS에서 연결 폴더를 직접 수정하는 경우에는 `scripts/nas-auto-build.sh`를 DSM 작업
스케줄러에 1~5분 간격으로 등록하면 변경된 파일이 있을 때만 운영 이미지를 자동으로
재빌드합니다. 설정 방법은 `docs/NAS_DEPLOYMENT.md`를 참고하세요.

## 문서 발행 카테고리

- `/documents/estimate`: `vd_estimate.html` 흐름을 반영한 견적서 작성·저장·인쇄·CSV 다운로드
- `/documents/invoice`: `KUDA_Invoice_Local_Fixed/index.html` 흐름을 반영한 인보이스 작성·저장·인쇄
- `/tax-invoices`: 공급자·공급받는자·품목·세액을 입력하는 일반 세금계산서 작성 화면. `TAX_INVOICE_PROVIDER=barobill`과 바로빌 테스트 값을 넣으면 저장+발급 SOAP API를 호출하고, 관리번호·발급 상태·국세청 승인번호를 추적합니다. 기본 `mock`은 로컬 UI 검증용입니다.

## 주요 파일

- `ERP_DEVELOPMENT_SPEC.md`: 전체 제품 기획서
- `docker-compose.yml`: NAS Docker 서비스 구성
- `prisma/schema.prisma`: ERP DB 스키마
- `src/app/page.tsx`: 초기 대시보드
- `src/worker/index.ts`: 백그라운드 작업자
