# NAS Docker 배포 가이드

## 1. NAS 폴더 구조

현재 `docker-compose.yml`이 사용하는 폴더 구조:

```text
/volume1/docker/kudalabs-erp/
+- app/
   +- docker-compose.yml
   +- Dockerfile
   +- .env
   +- postgres-data/
   +- redis-data/
   +- uploads/
   +- backups/
```

이 저장소 전체를 `/volume1/docker/kudalabs-erp/app`에 배치한다. 데이터 폴더는
첫 실행 때 자동으로 생성되지만, File Station에서 미리 만들어도 된다.

## 2. 환경변수

`.env.synology.example`을 NAS의 애플리케이션 폴더로 복사한 뒤 파일명을 `.env`로
변경하고, 각 `replace-with-` 값을 새 값으로 교체한다. 기존에 안전하게 보관한
`.env.synology.local`이 있다면 그것을 사용해도 된다.

```sh
cp .env.synology.local /volume1/docker/kudalabs-erp/app/.env
chmod 600 /volume1/docker/kudalabs-erp/app/.env
```

`NEXT_PUBLIC_APP_URL`의 `YOUR_NAS_IP`는 실제 NAS 내부 IP, Tailscale 주소 또는
HTTPS 도메인으로 교체한다.

반드시 바꿀 값:

- `NEXT_PUBLIC_APP_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` (12자 이상, 운영용 새 비밀번호)
- `GEMINI_API_KEY`
- Google API 값

`POSTGRES_PASSWORD`, `DATABASE_URL`, `AUTH_SECRET`은 준비된 시놀로지 전용
환경파일에 무작위 값으로 생성되어 있다. 이 파일을 Git에 추가하거나 메신저로
전송하지 않는다.

Gemini와 Google 기능을 아직 사용하지 않으면 해당 API 값은 비워둬도 된다.

## 3. 실행

### DSM Container Manager 화면에서 실행

1. DSM 패키지 센터에서 **Container Manager**를 설치한다.
2. File Station으로 저장소 파일을 `/volume1/docker/kudalabs-erp/app`에 올린다.
3. `.env.synology.local`을 같은 폴더에 복사하고 이름을 `.env`로 바꾼다.
4. Container Manager의 **프로젝트**에서 **생성**을 누른다.
5. 프로젝트 이름은 `kudalabs-erp`, 경로는 위의 `app` 폴더로 지정한다.
6. 소스에서 기존 `docker-compose.yml`을 선택하고 프로젝트를 빌드한다.
7. `migrate`와 `bootstrap`이 정상 종료되고 `web`, `worker`, `db`, `redis`, `backup`이
   실행 중인지 확인한다.

`migrate`는 DB 구조 반영 후, `bootstrap`은 최초 관리자 계정을 준비한 후
정상 종료되는 일회성 컨테이너이므로 계속 실행 중으로 표시되지 않아도 된다.

직원 계정은 관리자 계정으로 로그인한 뒤, NAS의 프로젝트 폴더에서 아래처럼
한 번 실행해 추가한다. 명령에 입력한 비밀번호는 화면 기록이나 셸 히스토리에
남을 수 있으므로, 작업 후 터미널 기록을 정리한다.

```sh
docker compose run --rm --no-deps \
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

초기 접속:

```text
http://NAS-IP:3000
```

## 4. 백업

`backup` 컨테이너가 하루 1회 PostgreSQL dump를 `/backups`에 생성하고 30일이 지난 백업을 삭제한다.

주 1회는 `/volume1/docker/kudalabs-erp/app/backups`와
`/volume1/docker/kudalabs-erp/app/uploads`를 외장 디스크 또는 별도 저장소로
복제하는 것을 권장한다.

## 5. 외부 접속

초기에는 내부망 전용을 권장한다.

이 배포 버전은 로그인, 세션, 역할별 API 권한 검사를 포함한다. 최초 로그인은
`.env`의 `ADMIN_EMAIL`과 `ADMIN_PASSWORD`로 한다. 로그인 기능이 적용된 뒤에도
인터넷 공개 전에는 HTTPS와 방화벽을 설정한다. 외부 직원 접속은 접근 권한을
통제한 Tailscale/VPN 또는 HTTPS reverse proxy로만 허용한다.

`NEXT_PUBLIC_APP_URL`이 `https://`로 시작하면 세션 쿠키도 HTTPS 전용으로
설정된다. 내부 HTTP 테스트가 필요하면 해당 값을 `http://NAS-IP:3000`으로
설정하고, 운영 공개 전에는 HTTPS 주소와 `AUTH_COOKIE_SECURE=true`를 사용한다.

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
