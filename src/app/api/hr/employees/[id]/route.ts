import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { denyHardDelete, wantsHardDelete } from "@/lib/hard-delete";

export const runtime = "nodejs";

const writableRoles = ["CEO", "ADMIN", "HR"] as const;

const updateSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력하세요.").max(80).optional(),
  role: z.string().trim().min(1, "직무를 입력하세요.").max(120).optional(),
  department: z.string().trim().max(120).optional().nullable(),
  joinedAt: z.string().optional(),
  resignedAt: z.string().optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email("이메일 형식을 확인하세요.").optional().or(z.literal("")).nullable(),
  baseSalary: z.coerce.number().int().nonnegative().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional()
});

function serialize(employee: { baseSalary: bigint | null; joinedAt: Date; resignedAt: Date | null }) {
  return {
    ...employee,
    baseSalary: employee.baseSalary?.toString() ?? null,
    joinedAt: employee.joinedAt.toISOString(),
    resignedAt: employee.resignedAt?.toISOString() ?? null
  };
}

export const GET = withAuth(async (_request, context) => {
  const { id } = await context.params;
  const employee = await prisma.employee.findUnique({ where: { id } });

  if (!employee) {
    return NextResponse.json({ ok: false, message: "직원 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, employee: serialize(employee) });
}, { roles: [...writableRoles] });

export const PATCH = withAuth(async (request, context, user) => {
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.employee.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ ok: false, message: "직원 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const data = parsed.data;
  const updated = await prisma.employee.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.department !== undefined ? { department: data.department || null } : {}),
      ...(data.joinedAt !== undefined ? { joinedAt: new Date(data.joinedAt) } : {}),
      ...(data.resignedAt !== undefined ? { resignedAt: data.resignedAt ? new Date(data.resignedAt) : null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.baseSalary !== undefined ? { baseSalary: data.baseSalary === null ? null : BigInt(data.baseSalary) } : {}),
      ...(data.status !== undefined ? { status: data.status } : {})
    }
  });

  await prisma.auditLog
    .create({
      data: {
        action: "UPDATE",
        entityType: "EMPLOYEE",
        entityId: id,
        beforeData: { name: existing.name, status: existing.status },
        afterData: { name: updated.name, status: updated.status },
        userId: user.id
      }
    })
    .catch(() => undefined);

  return NextResponse.json({ ok: true, employee: serialize(updated) });
}, { roles: [...writableRoles], write: true });

/**
 * 직원 삭제 = 퇴사(보관) 처리.
 *
 * 직원을 실제로 지우면 지출 결재자·회의 참석자 기록이 끊긴다.
 * status 를 ARCHIVED 로 바꾸고, 퇴사일이 비어 있으면 오늘로 채운다.
 */
export const DELETE = withAuth(async (request, context, user) => {
  const { id } = await context.params;

  const employee = await prisma.employee.findUnique({
    where: { id },
    select: { id: true, name: true, status: true, resignedAt: true, _count: { select: { users: true } } }
  });

  if (!employee) {
    return NextResponse.json({ ok: false, message: "직원 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  // 개발 단계 강제 삭제: 직원을 실제로 지운다.
  // 로그인 계정이 붙어 있으면 그 계정부터 정리해야 한다 (계정이 고아가 되지 않도록).
  if (wantsHardDelete(request)) {
    const denied = denyHardDelete(user);
    if (denied) return denied;

    if (employee._count.users > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: `로그인 계정 ${employee._count.users}개가 연결되어 있습니다. 관리자 화면에서 계정을 먼저 삭제하세요.`
        },
        { status: 409 }
      );
    }

    await prisma.employee.delete({ where: { id } });

    await prisma.auditLog
      .create({
        data: {
          action: "HARD_DELETE",
          entityType: "EMPLOYEE",
          entityId: id,
          beforeData: { name: employee.name },
          userId: user.id
        }
      })
      .catch(() => undefined);

    return NextResponse.json({ ok: true, deleted: true, message: `${employee.name} 직원 정보를 완전히 삭제했습니다.` });
  }

  if (employee.status === "ARCHIVED") {
    return NextResponse.json({ ok: true, message: "이미 보관된 직원입니다." });
  }

  await prisma.employee.update({
    where: { id },
    data: { status: "ARCHIVED", resignedAt: employee.resignedAt ?? new Date() }
  });

  await prisma.auditLog
    .create({
      data: {
        action: "ARCHIVE",
        entityType: "EMPLOYEE",
        entityId: id,
        beforeData: { status: employee.status },
        afterData: { status: "ARCHIVED" },
        userId: user.id
      }
    })
    .catch(() => undefined);

  const note = employee._count.users > 0 ? " 연결된 로그인 계정은 관리자 화면에서 따로 비활성화하세요." : "";

  return NextResponse.json({ ok: true, archived: true, message: `${employee.name} 직원을 보관 처리했습니다.${note}` });
}, { roles: [...writableRoles], write: true });
