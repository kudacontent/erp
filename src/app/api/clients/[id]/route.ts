import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { clientTypeOptions } from "@/lib/client-schema";
import { prisma } from "@/lib/prisma";
import { denyHardDelete, isHardDeleteEnabled } from "@/lib/hard-delete";

export const runtime = "nodejs";

const writableRoles = ["CEO", "ADMIN", "OPERATIONS"] as const;

const clientTypeValues = clientTypeOptions.map((option) => option.value) as [
  (typeof clientTypeOptions)[number]["value"],
  ...(typeof clientTypeOptions)[number]["value"][]
];

/** 부분 수정. 보낸 항목만 바꾼다. */
const updateClientSchema = z.object({
  name: z.string().trim().min(1, "거래처명을 입력하세요.").max(120).optional(),
  clientType: z.enum(clientTypeValues).optional(),
  businessNumber: z.string().trim().max(40).optional().nullable(),
  ceoName: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email("이메일 형식이 올바르지 않습니다.").optional().or(z.literal("")).nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  website: z.string().trim().max(500).optional().nullable(),
  memo: z.string().trim().max(4000).optional().nullable(),
  /** 보관된 거래처를 다시 되살릴 때 사용 */
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional()
});

/** null 과 빈 문자열을 모두 "값 없음"으로 저장한다 */
function optional(value: string | null | undefined) {
  if (value === undefined) return undefined;
  return value ? value : null;
}

export const GET = withAuth(async (_request, context) => {
  const { id } = await context.params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: { contacts: { orderBy: { createdAt: "asc" } } }
  });

  if (!client) {
    return NextResponse.json({ ok: false, message: "거래처를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, client });
});

export const PATCH = withAuth(async (request, context, user) => {
  const { id } = await context.params;
  const parsed = updateClientSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.client.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ ok: false, message: "거래처를 찾을 수 없습니다." }, { status: 404 });
  }

  const data = parsed.data;
  const updated = await prisma.client.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.clientType !== undefined ? { clientType: data.clientType } : {}),
      ...(data.businessNumber !== undefined ? { businessNumber: optional(data.businessNumber) } : {}),
      ...(data.ceoName !== undefined ? { ceoName: optional(data.ceoName) } : {}),
      ...(data.phone !== undefined ? { phone: optional(data.phone) } : {}),
      ...(data.email !== undefined ? { email: optional(data.email) } : {}),
      ...(data.address !== undefined ? { address: optional(data.address) } : {}),
      ...(data.website !== undefined ? { website: optional(data.website) } : {}),
      ...(data.memo !== undefined ? { memo: optional(data.memo) } : {}),
      ...(data.status !== undefined ? { status: data.status } : {})
    }
  });

  await prisma.auditLog
    .create({
      data: {
        action: "UPDATE",
        entityType: "CLIENT",
        entityId: id,
        beforeData: { name: existing.name, status: existing.status },
        afterData: { name: updated.name, status: updated.status },
        userId: user.id
      }
    })
    .catch(() => undefined);

  return NextResponse.json({ ok: true, client: updated });
}, { roles: [...writableRoles], write: true });

/**
 * 거래처 삭제 = 보관 처리.
 *
 * 계약·세금계산서·회의가 거래처를 참조하므로 실제로 지우면 이력이 끊긴다.
 * 그래서 기본은 status 를 ARCHIVED 로 바꿔 목록에서 감춘다.
 *
 * 연결된 기록이 하나도 없고 CEO 가 ?hard=true 로 요청한 경우에만 실제로 지운다.
 * (담당자 정보는 onDelete: Cascade 로 함께 삭제된다)
 */
export const DELETE = withAuth(async (request, context, user) => {
  const { id } = await context.params;
  const hard = new URL(request.url).searchParams.get("hard") === "true";

  const client = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      _count: { select: { contracts: true, taxInvoices: true, meetings: true, expenses: true } }
    }
  });

  if (!client) {
    return NextResponse.json({ ok: false, message: "거래처를 찾을 수 없습니다." }, { status: 404 });
  }

  const linked =
    client._count.contracts + client._count.taxInvoices + client._count.meetings + client._count.expenses;

  if (hard) {
    const denied = denyHardDelete(user);
    if (denied) return denied;

    // 개발 단계에서는 연결된 계약·세금계산서까지 함께 정리한다.
    // 평소에는 연결이 하나라도 있으면 막는다 (아래 분기).
    if (isHardDeleteEnabled() && linked > 0) {
      await prisma.$transaction([
        prisma.taxInvoice.updateMany({ where: { clientId: id }, data: { clientId: null } }),
        prisma.meeting.updateMany({ where: { clientId: id }, data: { clientId: null } }),
        prisma.calendarEvent.updateMany({ where: { clientId: id }, data: { clientId: null } }),
        prisma.expense.updateMany({ where: { clientId: id }, data: { clientId: null } }),
        prisma.estimate.updateMany({ where: { clientId: id }, data: { clientId: null } }),
        prisma.projectContract.deleteMany({ where: { clientId: id } }),
        prisma.client.delete({ where: { id } })
      ]);

      await prisma.auditLog
        .create({
          data: {
            action: "HARD_DELETE",
            entityType: "CLIENT",
            entityId: id,
            beforeData: { name: client.name, linked },
            userId: user.id
          }
        })
        .catch(() => undefined);

      return NextResponse.json({
        ok: true,
        message: `${client.name} 거래처와 연결된 계약 ${client._count.contracts}건을 함께 삭제했습니다.`
      });
    }

    if (linked > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: `계약 ${client._count.contracts}건, 세금계산서 ${client._count.taxInvoices}건, 회의 ${client._count.meetings}건, 지출 ${client._count.expenses}건이 연결되어 있어 영구 삭제할 수 없습니다. 보관 처리를 이용하세요.`
        },
        { status: 409 }
      );
    }

    await prisma.client.delete({ where: { id } });
    await prisma.auditLog
      .create({
        data: { action: "DELETE", entityType: "CLIENT", entityId: id, beforeData: { name: client.name }, userId: user.id }
      })
      .catch(() => undefined);

    return NextResponse.json({ ok: true, message: `${client.name} 거래처를 영구 삭제했습니다.` });
  }

  if (client.status === "ARCHIVED") {
    return NextResponse.json({ ok: true, message: "이미 보관된 거래처입니다." });
  }

  await prisma.client.update({ where: { id }, data: { status: "ARCHIVED" } });
  await prisma.auditLog
    .create({
      data: {
        action: "ARCHIVE",
        entityType: "CLIENT",
        entityId: id,
        beforeData: { status: client.status },
        afterData: { status: "ARCHIVED" },
        userId: user.id
      }
    })
    .catch(() => undefined);

  return NextResponse.json({
    ok: true,
    archived: true,
    linkedCount: linked,
    message: `${client.name} 거래처를 보관했습니다. 연결된 계약과 이력은 그대로 남아 있습니다.`
  });
}, { roles: [...writableRoles], write: true });
