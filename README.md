# 쿠다랩스 사내 운영 ERP

NAS Docker 운영을 전제로 한 쿠다랩스 내부 ERP 프로젝트입니다.

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

## 주요 파일

- `ERP_DEVELOPMENT_SPEC.md`: 전체 제품 기획서
- `docker-compose.yml`: NAS Docker 서비스 구성
- `prisma/schema.prisma`: ERP DB 스키마
- `src/app/page.tsx`: 초기 대시보드
- `src/worker/index.ts`: 백그라운드 작업자
