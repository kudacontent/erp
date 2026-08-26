import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RecordStatus, UserRole } from "@prisma/client";

function scrypt(
  password: string,
  salt: string,
  keyLength: number,
  options: { N: number; r: number; p: number }
) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey as Buffer);
    });
  });
}

export const SESSION_COOKIE_NAME = "kudalabs_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_COST = 16_384;
const PASSWORD_BLOCK_SIZE = 8;
const PASSWORD_PARALLELIZATION = 1;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: RecordStatus;
};

type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  iat: number;
  exp: number;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters long.");
  }

  return secret;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

export async function hashPassword(password: string) {
  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters long.");
  }

  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH, {
    N: PASSWORD_COST,
    r: PASSWORD_BLOCK_SIZE,
    p: PASSWORD_PARALLELIZATION
  });

  return [
    "scrypt",
    PASSWORD_COST,
    PASSWORD_BLOCK_SIZE,
    PASSWORD_PARALLELIZATION,
    salt,
    derivedKey.toString("base64url")
  ].join("$");
}

export async function verifyPassword(password: string, encodedHash: string | null | undefined) {
  if (!encodedHash) {
    return false;
  }

  const [algorithm, cost, blockSize, parallelization, salt, encodedKey] = encodedHash.split("$");

  if (!algorithm || algorithm !== "scrypt" || !cost || !blockSize || !parallelization || !salt || !encodedKey) {
    return false;
  }

  try {
    const expectedKey = Buffer.from(encodedKey, "base64url");
    const derivedKey = await scrypt(password, salt, expectedKey.length, {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelization)
    });

    return derivedKey.length === expectedKey.length && timingSafeEqual(derivedKey, expectedKey);
  } catch {
    return false;
  }
}

export function createSessionToken(user: AuthUser) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: now,
    exp: now + SESSION_TTL_SECONDS
  };
  const encodedPayload = encode(JSON.stringify(payload));

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    return null;
  }

  try {
    const expectedSignature = sign(encodedPayload);
    const expectedBuffer = Buffer.from(expectedSignature, "base64url");
    const providedBuffer = Buffer.from(providedSignature, "base64url");

    if (
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      return null;
    }

    const payload = JSON.parse(decode(encodedPayload)) as SessionPayload;

    if (
      !payload.sub ||
      !payload.email ||
      !payload.role ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      passwordHash: true
    }
  });

  if (!user || user.status !== "ACTIVE" || !user.passwordHash) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status
  };
}

export function sessionCookieOptions() {
  const cookieSecureSetting = process.env.AUTH_COOKIE_SECURE;
  const secure =
    cookieSecureSetting === "true" ||
    (cookieSecureSetting !== "false" && process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") === true);

  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  };
}

export function clearSessionCookieOptions() {
  return {
    ...sessionCookieOptions(),
    maxAge: 0
  };
}

export type AuthRouteContext = {
  params: Promise<any>;
};

type AuthRouteHandler = (
  request: Request,
  context: AuthRouteContext,
  user: AuthUser
) => Promise<Response>;

export function withAuth(
  handler: AuthRouteHandler,
  options?: { roles?: UserRole[]; write?: boolean }
) {
  return async (request: Request, context: AuthRouteContext) => {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ ok: false, message: "로그인이 필요합니다." }, { status: 401 });
    }

    if (options?.roles && !options.roles.includes(user.role)) {
      return NextResponse.json({ ok: false, message: "이 작업을 수행할 권한이 없습니다." }, { status: 403 });
    }

    if (options?.write && !isSameOrigin(request)) {
      return NextResponse.json({ ok: false, message: "허용되지 않은 요청 출처입니다." }, { status: 403 });
    }

    return handler(request, context, user);
  };
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");

  // Non-browser clients do not send Origin. They still need a valid session.
  if (!origin) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host");
    const requestHost = forwardedHost ?? request.headers.get("host");

    if (!requestHost || originUrl.host !== requestHost) {
      return false;
    }

    const forwardedProto = request.headers.get("x-forwarded-proto");
    return !forwardedProto || originUrl.protocol === `${forwardedProto}:`;
  } catch {
    return false;
  }
}
