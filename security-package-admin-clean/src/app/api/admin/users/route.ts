import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const roles = ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING", "HR", "EMPLOYEE", "AUDITOR"] as const;
const createUserSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(80),
  password: z.string().min(12),
  role: z.enum(roles)
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

export const GET = withAuth(async () => {
  const users = await prisma.user.findMany({
    select: userSelect,
    orderBy: [{ status: "asc" }, { createdAt: "asc" }]
  });

  return NextResponse.json({ ok: true, users });
}, { roles: ["CEO", "ADMIN"] });

export const POST = withAuth(async (request, _context, currentUser) => {
  const parsed = createUserSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "이메일, 이름, 12자 이상의 비밀번호와 역할을 확인하세요." },
      { status: 400 }
    );
  }

  if (currentUser.role !== "CEO" && parsed.data.role === "CEO") {
    return NextResponse.json({ ok: false, message: "CEO 계정은 CEO만 추가할 수 있습니다." }, { status: 403 });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return NextResponse.json({ ok: false, message: "이미 등록된 이메일입니다." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      role: parsed.data.role,
      status: "ACTIVE",
      passwordHash: await hashPassword(parsed.data.password)
    },
    select: userSelect
  });

  return NextResponse.json({ ok: true, user }, { status: 201 });
}, { roles: ["CEO", "ADMIN"], write: true });
