import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  sessionCookieOptions,
  verifyPassword
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = await verifyPassword(parsed.data.password, user?.passwordHash);

  if (!user || user.status !== "ACTIVE" || !passwordMatches) {
    return NextResponse.json({ ok: false, message: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

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
