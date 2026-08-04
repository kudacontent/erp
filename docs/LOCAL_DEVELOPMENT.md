# 로컬 실행 가이드

## Docker Desktop 사용

1. Docker Desktop을 설치하고 실행한다.
2. 이 프로젝트 폴더에서 환경파일을 만든다.

```sh
cp .env.example .env
```

3. `.env`에서 다음 값을 새 값으로 바꾼다.

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_COOKIE_SECURE=false
AUTH_SECRET=32자_이상의_새로운_랜덤_문자열
ADMIN_EMAIL=admin@example.com
ADMIN_NAME=시스템 관리자
ADMIN_PASSWORD=12자_이상의_새로운_비밀번호
```

4. 서비스를 빌드하고 시작한다.

```sh
docker compose up -d --build
docker compose ps
```

5. 브라우저에서 `http://localhost:3000/login`을 열고 관리자 계정으로 로그인한다.

`migrate`와 `bootstrap`은 초기화가 끝나면 `Exited (0)`으로 종료되는 일회성
컨테이너다. `web`, `worker`, `db`, `redis`, `backup`이 실행 중이면 정상이다.

## 실행 확인 및 종료

```sh
docker compose logs --tail=200 migrate bootstrap web worker
docker compose down
```

`docker compose down`은 컨테이너만 중지하며 `postgres-data`, `redis-data`,
`uploads`, `backups` 폴더의 데이터는 삭제하지 않는다.

## Docker 없이 Mac에서 직접 실행

Homebrew가 없다면 먼저 설치한 뒤, Node.js 22와 PostgreSQL 16을 설치한다.
Redis는 작업자까지 실행할 때 설치한다.

```sh
brew install node@22 postgresql@16 redis
export PATH="$(brew --prefix node@22)/bin:$(brew --prefix postgresql@16)/bin:$(brew --prefix redis)/bin:$PATH"
brew services start postgresql@16
brew services start redis
```

로컬 PostgreSQL에 ERP용 사용자와 데이터베이스를 한 번 만든다. 비밀번호는
특수문자가 없는 임시 로컬 값으로 시작하면 연결 문자열을 작성하기 쉽다.

```sh
psql postgres -c "CREATE ROLE erp LOGIN PASSWORD 'kudalabsLocal2026';"
createdb -O erp kudalabs_erp
```

이미 사용자나 데이터베이스가 있다는 메시지가 나오면 해당 줄은 건너뛴다.

프로젝트 폴더에서 `.env.example`을 `.env`로 복사한다. 압축 해제 과정에서
파일명이 `.env.example.env`로 보이면 그 이름을 사용한다.

```sh
cp .env.example .env
```

`.env`의 Docker용 주소를 다음처럼 로컬 주소로 바꾼다.

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://erp:kudalabsLocal2026@127.0.0.1:5432/kudalabs_erp?schema=public
REDIS_URL=redis://127.0.0.1:6379
AUTH_COOKIE_SECURE=false
AUTH_SECRET=32자_이상의_새로운_랜덤_문자열
ADMIN_EMAIL=admin@example.com
ADMIN_NAME=시스템 관리자
ADMIN_PASSWORD=12자_이상의_새로운_비밀번호
```

`AUTH_SECRET`은 터미널에서 `openssl rand -hex 32`를 실행해 나온 값을 붙여
넣는다. 이후 의존성 설치, DB 반영, 최초 관리자 생성, 웹 실행 순서로 진행한다.

```sh
npm ci
npx prisma migrate deploy
node --env-file=.env scripts/bootstrap-admin.mjs
npm run dev
```

브라우저에서 `http://localhost:3000/login`을 연다. 백그라운드 작업자도
필요하면 별도 터미널에서 `npm run worker`를 실행한다.
