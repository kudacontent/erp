import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  sessionCookieOptions,
  verifyPassword
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkLoginAllowed, clearLoginFailures, loginThrottleKey, recordLoginFailure } from "@/lib/login-throttle";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "이메일과 비밀번호를 확인하세요." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  // 무차별 대입 방어. 같은 IP + 같은 계정으로 15분에 8회까지만 시도할 수 있다.
  const throttleKey = loginThrottleKey(request, email);
  const throttle = checkLoginAllowed(throttleKey);

  if (!throttle.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: `로그인 시도가 너무 많습니다. ${Math.ceil(throttle.retryAfterSeconds / 60)}분 뒤에 다시 시도하세요.`
      },
      { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = await verifyPassword(parsed.data.password, user?.passwordHash);

  if (!user || user.status !== "ACTIVE" || !passwordMatches) {
    recordLoginFailure(throttleKey);

    return NextResponse.json({ ok: false, message: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  clearLoginFailures(throttleKey);

  const token = createSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status
  });
  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  });

  response.cookies.set("kudalabs_session", token, sessionCookieOptions());
  return response;
}
