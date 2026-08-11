# NAS Docker 배포 가이드

## 1. NAS 폴더 구조

현재 `docker-compose.yml`이 사용하는 폴더 구조:

```text
/volume1/docker/kudalabs-erp/
+- docker-compose.yml
+- Dockerfile
+- .env
+- postgres-data/
+- redis-data/
+- uploads/
+- backups/
```

이 저장소 전체를 `/volume1/docker/kudalabs-erp`에 배치한다. 데이터 폴더는
첫 실행 때 자동으로 생성되지만, File Station에서 미리 만들어도 된다.

운영 배포는 이 문서의 NAS Docker Compose 구성만 사용한다. 프로젝트의 `next.config.mjs`는
Docker self-hosting을 위한 `standalone` 출력을 사용하며, Vercel 배포 설정은 필요하지 않다.

## 2. 환경변수

`.env.synology.example`을 NAS의 애플리케이션 폴더로 복사한 뒤 파일명을 `.env`로
변경하고, 각 `replace-with-` 값을 새 값으로 교체한다. 기존에 안전하게 보관한
`.env.synology.local`이 있다면 그것을 사용해도 된다.

```sh
cp .env.synology.local /volume1/docker/kudalabs-erp/.env
chmod 600 /volume1/docker/kudalabs-erp/.env
```

현재 접속 주소는 `https://erp.kuda.synology.me`로 설정한다. DNS가 NAS를 가리키고
HTTPS 인증서가 발급되어 있어야 한다.

반드시 바꿀 값:

- `NEXT_PUBLIC_APP_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` (12자 이상, 운영용 새 비밀번호)
- `GEMINI_API_KEY`
- Google API 값

세금계산서를 바로빌 테스트 서버로 발급하려면 아래 값도 설정한다.

- `TAX_INVOICE_PROVIDER=barobill`
- `BAROBILL_API_URL=https://testws.baroservice.com/TI.asmx`
- `BAROBILL_CERT_KEY` (연동인증키)
- `BAROBILL_CORP_NUM` (공급자 사업자번호, 숫자만)
- `BAROBILL_INVOICER_CONTACT_ID` (공급자의 바로빌 회원 아이디)
- `TAX_INVOICE_SUPPLIER_*` (공급자 상호·대표자·주소·연락처·이메일)

바로빌 발급은 공급자의 공동인증서가 바로빌에 등록되어 있어야 한다. 테스트 환경도 공급받는자 이메일로 발송될 수 있으므로 실제 이메일을 입력하기 전에 확인한다. 발급 화면은 일반 세금계산서 작성, 임시 저장, 발급 요청, 관리번호 및 상태 조회를 지원한다.

영수증·명함 OCR은 `web` 컨테이너가 `GEMINI_API_KEY`를 런타임에 읽어 Google Gemini API를
호출한다. `UPLOAD_DIR=/app/uploads`는 Compose의 `./uploads`와 연결되어 있어 컨테이너를
다시 만들거나 재시작해도 OCR 이미지가 NAS에 남는다. Container Manager에서 `uploads`
폴더의 컨테이너 권한이 읽기/쓰기로 설정되어 있는지 확인한다.

`POSTGRES_PASSWORD`, `DATABASE_URL`, `AUTH_SECRET`은 준비된 시놀로지 전용
환경파일에 무작위 값으로 생성되어 있다. 이 파일을 Git에 추가하거나 메신저로
전송하지 않는다.

Gemini와 Google 기능을 아직 사용하지 않으면 해당 API 값은 비워둬도 된다.

## 3. 실행

### DSM Container Manager 화면에서 실행

1. DSM 패키지 센터에서 **Container Manager**를 설치한다.
2. File Station으로 저장소 파일을 `/volume1/docker/kudalabs-erp`에 올린다.
3. `.env.synology.local`을 같은 폴더에 복사하고 이름을 `.env`로 바꾼다.
4. Container Manager의 **프로젝트**에서 **생성**을 누른다.
5. 프로젝트 이름은 `kudalabs-erp`, 경로는 `/volume1/docker/kudalabs-erp`로 지정한다.
6. 소스에서 기존 `docker-compose.yml`을 선택하고 프로젝트를 빌드한다.
7. `migrate`와 `bootstrap`이 정상 종료되고 `web`, `worker`, `db`, `redis`, `backup`이
   실행 중인지 확인한다.

`migrate`는 DB 구조 반영 후, `bootstrap`은 최초 관리자 계정을 준비한 후
정상 종료되는 일회성 컨테이너이므로 계속 실행 중으로 표시되지 않아도 된다.

직원 계정은 관리자 계정으로 로그인한 뒤, NAS의 프로젝트 폴더에서 아래처럼
한 번 실행해 추가한다. 명령에 입력한 비밀번호는 화면 기록이나 셸 히스토리에
남을 수 있으므로, 작업 후 터미널 기록을 정리한다.

```sh
docker compose -p kudalabs-erp run --rm --no-deps \
  -e USER_EMAIL=employee@example.com \
  -e USER_NAME="홍길동" \
  -e USER_ROLE=EMPLOYEE \
  -e USER_PASSWORD="12자_이상의_새_비밀번호" \
  migrate node scripts/create-user.mjs
```

사용 가능한 역할은 `CEO`, `ADMIN`, `OPERATIONS`, `ACCOUNTING`, `HR`,
`EMPLOYEE`, `AUDITOR`이다. `EMPLOYEE`와 `AUDITOR`는 API에서 변경 작업을
수행할 수 없고, 업무 기록 조회만 가능하다.

### SSH/터미널에서 실행

```sh
mkdir -p uploads postgres-data redis-data backups
docker compose config
docker compose up -d --build
```

첫 실행 시 `migrate` 컨테이너가 커밋된 Prisma migration을 PostgreSQL에 반영하고,
`bootstrap` 컨테이너가 최초 관리자 계정을 준비한다. 두 단계가 성공한 뒤에만
`web`과 `worker`가 시작된다.

상태 확인:

```sh
docker compose ps
docker compose logs --tail=200 migrate web worker db redis
```

OCR 키나 모델 설정만 바꾼 경우에는 새 이미지를 만들 필요 없이 다음처럼 web 컨테이너를
재생성해도 된다. 코드 변경까지 함께 배포할 때는 `--build`를 유지한다.

```sh
docker compose up -d --force-recreate web worker
docker compose exec web sh -lc 'test -n "$GEMINI_API_KEY" && test -d "$UPLOAD_DIR" && echo "Gemini OCR and upload storage are configured"'
```

세금계산서 키나 바로빌 공급자 정보만 바꾼 경우에도 `web`을 재생성한다.

```sh
docker compose -p kudalabs-erp up -d --force-recreate web worker
```

초기 접속:

```text
https://erp.kuda.synology.me/login
```

## 3-1. NAS에서 코드 수정 즉시 반영하기

운영용 `docker-compose.yml`은 안정성을 위해 빌드된 production 이미지로 실행한다.
NAS의 파일을 수정하면서 브라우저에 변경을 즉시 반영하려면 신뢰할 수 있는 내부망
또는 VPN에서만 `docker-compose.live.yml` 오버라이드를 사용한다.

```sh
docker compose \
  -f docker-compose.yml \
  -f docker-compose.live.yml \
  up -d --build
```

이 모드는 프로젝트의 `src`, `prisma`, `public`과 Next.js 설정 파일을 컨테이너에
연결하고 파일 감시 폴링을 켠다. DB 데이터 폴더와 `.env`는 웹 컨테이너에 연결하지
않는다. File Station, SSH, Synology Drive 등으로 `src` 아래 파일을 저장하면 보통
수 초 안에 `https://erp.kuda.synology.me` 화면이 갱신된다. `package.json`이나 새 npm 패키지를
바꾼 경우에는 `--build`로 다시 빌드해야 한다.

Prisma 스키마나 migration을 바꾼 경우에는 먼저 백업하고 아래를 실행한다.

```sh
docker compose \
  -f docker-compose.yml \
  -f docker-compose.live.yml \
  run --rm migrate
```

개발 모드를 종료하고 운영 모드로 되돌릴 때는 다음처럼 실행한다.

```sh
docker compose \
  -f docker-compose.yml \
  -f docker-compose.live.yml \
  down
docker compose up -d --build
```

개발 모드는 인터넷에 직접 공개하지 않는다. 외부 직원 접속은 production 구성과
HTTPS reverse proxy, Tailscale 또는 VPN을 사용한다.

## 4. 백업

`backup` 컨테이너가 하루 1회 PostgreSQL dump를 `/backups`에 생성하고 30일이 지난 백업을 삭제한다.

주 1회는 `/volume1/docker/kudalabs-erp/backups`와
`/volume1/docker/kudalabs-erp/uploads`를 외장 디스크 또는 별도 저장소로
복제하는 것을 권장한다.

## 5. 외부 접속

초기에는 내부망 전용을 권장한다.

이 배포 버전은 로그인, 세션, 역할별 API 권한 검사를 포함한다. 최초 로그인은
`.env`의 `ADMIN_EMAIL`과 `ADMIN_PASSWORD`로 한다. 로그인 기능이 적용된 뒤에도
인터넷 공개 전에는 HTTPS와 방화벽을 설정한다. 외부 직원 접속은 접근 권한을
통제한 Tailscale/VPN 또는 HTTPS reverse proxy로만 허용한다.

`NEXT_PUBLIC_APP_URL=https://erp.kuda.synology.me`로 설정하면 세션 쿠키도 HTTPS
전용으로 설정된다. reverse proxy의 내부 목적지는 `http://127.0.0.1:3000`으로
두고, 외부에는 3000 포트를 직접 공개하지 않는다.

DSM에서 reverse proxy를 설정한다.

1. **제어판 → 로그인 포털(또는 응용 프로그램 포털) → Reverse Proxy**로 이동한다.
2. 소스: `HTTPS`, 호스트 이름 `erp.kuda.synology.me`, 포트 `443`.
3. 대상: `HTTP`, 호스트 이름 `127.0.0.1`, 포트 `3000`.
4. **제어판 → 보안 → 인증서**에서 `erp.kuda.synology.me` 인증서를 이 규칙에 할당한다.

외부 접속이 필요할 때 추천 순서:

1. Tailscale 또는 VPN
2. Cloudflare Tunnel
3. 도메인 + HTTPS + reverse proxy

Google Calendar Webhook은 외부에서 접근 가능한 HTTPS 주소가 필요하므로 2차 단계에서 붙인다.

## 6. 마이그레이션 운영

DB 구조 변경은 로컬 개발 DB에서 migration 파일을 생성한 뒤 저장소에 커밋한다.

```sh
npx prisma migrate dev --name 변경내용
```

NAS에서는 `prisma migrate deploy`만 사용한다. 이 명령은 Compose의 `migrate`
서비스가 배포할 때 자동 실행한다. 운영 DB에서는 `prisma db push` 또는
`prisma migrate dev`를 실행하지 않는다.

이미 `prisma db push`로 테이블을 생성하고 운영 데이터를 넣은 DB를 이 구성으로
전환하는 경우에는 초기 migration을 바로 실행하지 말고 먼저 기준선 처리가
필요하다.

```sh
docker compose run --rm migrate \
  ./node_modules/.bin/prisma migrate resolve \
  --applied 20260723000000_init
```

위 기준선 명령은 현재 DB 구조가 `prisma/schema.prisma`와 일치하는 것을 확인하고
백업을 만든 뒤 한 번만 실행한다.

## 7. 운영 보안

- PostgreSQL과 Redis는 Compose 내부 네트워크에서만 접근하며 호스트 포트를 공개하지 않는다.
- 외부 접속에는 Tailscale 또는 HTTPS reverse proxy를 사용한다.
- `.env`, DB 비밀번호, API 키는 Git에 커밋하지 않는다.
- `worker`는 운영 이미지에 소스를 포함하며 NAS의 저장소 전체를 컨테이너에 마운트하지 않는다.
- PostgreSQL과 Redis 이미지 버전은 `.env`의 `POSTGRES_IMAGE`, `REDIS_IMAGE`로 명시적으로 관리한다.
- `docker-compose.live.yml`은 코드 수정 확인용이며 인터넷 공개용이 아니다.

## 8. 초기 운영 데이터 정리

코드나 이미지를 다시 빌드해도 `postgres-data`에 저장된 DB 레코드는 삭제되지 않는다. 초기 예시 데이터가 DB에 이미 들어간 경우, 먼저 백업을 만든 뒤 관리자 계정만 남기고 업무 데이터를 정리할 수 있다.

정리 스크립트는 실수 방지를 위해 명시적인 확인 값이 없으면 실행되지 않는다.

```sh
cd /volume1/docker/kudalabs-erp
docker compose -p kudalabs-erp build migrate
docker compose -p kudalabs-erp run --rm --no-deps \
  -e CLEAR_OPERATIONAL_DATA=YES \
  migrate node scripts/clear-operational-data.mjs
```

이 작업은 `ADMIN_EMAIL`에 해당하는 관리자 계정만 남기고 거래처, 계약, 지출, 회의, 일정, 인사, 알림, 추가 사용자를 삭제한다. 실행 전 `backups/`에 최신 백업이 있는지 확인한다. DB 폴더를 직접 삭제하거나 `docker compose down -v`를 사용하지 않는다.

## 9. Git push 기반 NAS 자동 배포

이 저장소의 `.github/workflows/deploy.yml`은 `main`에 push되거나 GitHub Actions에서
수동 실행될 때 NAS를 배포 대상으로 사용한다. Vercel은 사용하지 않는다.

### 한 번만 준비할 사항

1. NAS의 `/volume1/docker/kudalabs-erp`를 `git@github.com:kudacontent/erp.git`의
   `main` 브랜치를 추적하는 clone으로 유지한다.
2. NAS에서 GitHub 저장소를 `pull`할 수 있도록 NAS에 읽기 전용 GitHub Deploy Key를
   등록한다. GitHub Actions가 NAS에 접속하는 키와 저장소를 읽는 키는 서로 달라도 된다.
3. NAS SSH 배포 계정에 Docker를 실행할 권한을 주거나, 해당 Docker 명령만
   비밀번호 없이 `sudo`할 수 있게 한다.
4. GitHub 저장소 **Settings → Secrets and variables → Actions → New repository secret**에
   아래 값을 저장한다.

   - `NAS_HOST`: NAS 접속 주소 또는 IP
   - `NAS_PORT`: SSH 포트(현재 설정이 2235가 아니면 실제 포트, 비워두면 2235)
   - `NAS_USER`: 배포용 NAS 계정
   - `NAS_SSH_KEY`: NAS 접속용 개인키 전체
   - `NAS_KNOWN_HOSTS`: 검증한 NAS 호스트 키 한 줄 전체

`NAS_SSH_KEY`와 `.env`의 Gemini·바로빌 키는 GitHub 저장소에 올리지 않는다. 운영
`.env`는 NAS 폴더에만 남겨두며, Git push 배포에서도 덮어쓰지 않는다.

### 배포 동작

GitHub Actions가 NAS에 SSH로 접속해 다음 순서로 실행한다.

```sh
cd /volume1/docker/kudalabs-erp
git pull --ff-only origin main
docker compose -p kudalabs-erp rm -f migrate bootstrap || true
docker compose -p kudalabs-erp up -d --build --remove-orphans
```

배포 중에는 `migrate`와 `bootstrap`을 다시 실행하고, 완료 후 `web`과 `worker`가 실제로
실행 중인지 확인한다. 이미지 빌드와 마이그레이션 시간만큼 지연될 수 있다.

NAS에서 파일을 직접 수정한 상태로 두면 자동 배포가 실수로 덮어쓰지 않도록 작업이
실패한다. 먼저 변경 내용을 확인해 GitHub에 반영하거나, 필요한 경우에만 NAS에서
명시적으로 커밋·stash한 뒤 다시 실행한다.

GitHub Actions의 **Run workflow**로 첫 배포를 시험한 뒤 NAS에서 상태를 확인한다.

```sh
cd /volume1/docker/kudalabs-erp
docker compose -p kudalabs-erp ps -a
docker compose -p kudalabs-erp logs --tail=100 web worker migrate bootstrap
```

SSH를 열어두기 어렵다면 Synology **제어판 → 작업 스케줄러**의 직접 수정 자동 빌드
방식을 사용할 수 있지만, GitHub Actions 배포와 동시에 켜 두면 두 빌드가 겹칠 수 있으므로
한 가지 방식만 선택한다. 외부에 SSH를 공개할 경우 방화벽과 키 인증을 함께 설정한다.

## 10. 연결 폴더 직접 수정 후 자동 빌드

맥의 `/Volumes/docker/kudalabs-erp`처럼 NAS 프로젝트 폴더가 연결되어 있고, 파일을
직접 수정하는 방식이면 Git push 없이도 자동 배포할 수 있다. `scripts/nas-auto-build.sh`는
소스, Prisma, Docker 설정, `.env`의 해시를 비교해 변경이 있을 때만 빌드한다. 빌드 중에는
잠금 폴더를 사용해 DSM 작업 스케줄러가 중복 빌드를 실행하지 않는다.

DSM에서 **제어판 → 작업 스케줄러 → 생성 → 예약된 작업 → 사용자 정의 스크립트**를 선택한다.

- 사용자: `root`
- 일정: 1~5분마다
- 실행 명령:

```sh
/bin/sh /volume1/docker/kudalabs-erp/scripts/nas-auto-build.sh
```

첫 등록 직후에는 아래처럼 수동으로 한 번 실행해 권한과 초기 빌드를 확인한다.

```sh
chmod +x /volume1/docker/kudalabs-erp/scripts/nas-auto-build.sh
/bin/sh /volume1/docker/kudalabs-erp/scripts/nas-auto-build.sh
tail -n 100 /volume1/docker/kudalabs-erp/.nas-auto-build.log
```

스크립트는 컨테이너만 재생성하며 `postgres-data`, `redis-data`, `uploads`, `backups`를
삭제하지 않는다. 빌드가 실패하면 상태 해시를 저장하지 않아 다음 실행 때 자동으로 다시 시도한다.
