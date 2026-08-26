import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const roles = ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING", "HR", "EMPLOYEE", "AUDITOR"] as const;
const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(12).optional(),
  role: z.enum(roles).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional()
});

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true
} as const;

export const PATCH = withAuth(async (request, { params }, currentUser) => {
  const { id } = await params;
  const parsed = updateUserSchema.safeParse(await request.json());

  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ ok: false, message: "변경할 계정 정보를 확인하세요." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });

  if (!target) {
    return NextResponse.json({ ok: false, message: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  if (target.id === currentUser.id && parsed.data.status && parsed.data.status !== "ACTIVE") {
    return NextResponse.json({ ok: false, message: "현재 로그인한 계정은 직접 비활성화할 수 없습니다." }, { status: 400 });
  }

  if (currentUser.role !== "CEO" && (target.role === "CEO" || parsed.data.role === "CEO")) {
    return NextResponse.json({ ok: false, message: "CEO 계정은 CEO만 변경할 수 있습니다." }, { status: 403 });
  }

  if (target.id === currentUser.id && parsed.data.role && parsed.data.role !== currentUser.role) {
    return NextResponse.json({ ok: false, message: "현재 로그인한 계정의 역할은 직접 변경할 수 없습니다." }, { status: 400 });
  }

  const data = {
    ...(parsed.data.name ? { name: parsed.data.name } : {}),
    ...(parsed.data.email ? { email: parsed.data.email.toLowerCase() } : {}),
    ...(parsed.data.role ? { role: parsed.data.role } : {}),
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
    ...(parsed.data.password ? { passwordHash: await hashPassword(parsed.data.password) } : {})
  };

  try {
    const user = await prisma.user.update({ where: { id }, data, select: userSelect });
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ ok: false, message: "이미 사용 중인 이메일입니다." }, { status: 409 });
    }

    throw error;
  }
}, { roles: ["CEO", "ADMIN"], write: true });
