import { NextResponse } from "next/server";
import { z } from "zod";
import { FINANCE_READ_ROLES, withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { denyHardDelete, wantsHardDelete } from "@/lib/hard-delete";

export const runtime = "nodejs";

const writableRoles = ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING"] as const;

const updateSchema = z.object({
  projectTitle: z.string().trim().min(1, "계약명을 입력하세요.").max(200).optional(),
  clientId: z.string().trim().min(1).optional(),
  supplyAmount: z.coerce.number().nonnegative("공급가액을 확인하세요.").optional(),
  vatAmount: z.coerce.number().nonnegative("부가세를 확인하세요.").optional(),
  dueDate: z.string().optional().nullable(),
  contractedAt: z.string().optional().nullable(),
  memo: z.string().trim().max(4000).optional().nullable(),
  billingStatus: z.enum(["PENDING", "ISSUED", "CANCELED"]).optional(),
  paymentStatus: z.enum(["UNPAID", "PARTIAL", "PAID"]).optional(),
  contractStatus: z
    .enum(["DRAFT", "SIGNED", "BILLING_PENDING", "BILLING_DONE", "PAYMENT_PENDING", "PARTIAL_PAYMENT", "PAID", "CLOSED", "CANCELED"])
    .optional()
});

function parseDate(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function serialize(contract: { contractAmount: bigint; vatAmount: bigint; totalAmount: bigint; contractedAt: Date | null; dueDate: Date | null; closedAt: Date | null; createdAt: Date; updatedAt: Date }) {
  return {
    ...contract,
    contractAmount: contract.contractAmount.toString(),
    vatAmount: contract.vatAmount.toString(),
    totalAmount: contract.totalAmount.toString(),
    contractedAt: contract.contractedAt?.toISOString() ?? null,
    dueDate: contract.dueDate?.toISOString() ?? null,
    closedAt: contract.closedAt?.toISOString() ?? null,
    createdAt: contract.createdAt.toISOString(),
    updatedAt: contract.updatedAt.toISOString()
  };
}

export const GET = withAuth(async (_request, context) => {
  const { slug } = await context.params;
  const contract = await prisma.projectContract.findUnique({
    where: { id: slug },
    include: { client: { select: { id: true, name: true } } }
  });

  if (!contract) {
    return NextResponse.json({ ok: false, message: "계약을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, contract: serialize(contract) });
}, { roles: [...FINANCE_READ_ROLES] });

export const PATCH = withAuth(async (request, context, user) => {
  const { slug } = await context.params;
  const parsed = updateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.projectContract.findUnique({ where: { id: slug } });

  if (!existing) {
    return NextResponse.json({ ok: false, message: "계약을 찾을 수 없습니다." }, { status: 404 });
  }

  // 이미 취소된 계약은 상태를 되돌리는 것 외에는 수정하지 않는다
  if (existing.contractStatus === "CANCELED" && parsed.data.contractStatus === undefined) {
    return NextResponse.json(
      { ok: false, message: "취소된 계약입니다. 먼저 상태를 되돌린 뒤 수정하세요." },
      { status: 409 }
    );
  }

  const data = parsed.data;

  if (data.clientId) {
    const client = await prisma.client.findUnique({ where: { id: data.clientId }, select: { id: true } });
    if (!client) {
      return NextResponse.json({ ok: false, message: "연결할 거래처를 찾을 수 없습니다." }, { status: 400 });
    }
  }

  // 금액은 공급가액·부가세 중 하나만 바뀌어도 합계를 다시 계산해야 한다
  const supply = data.supplyAmount !== undefined ? BigInt(Math.round(data.supplyAmount)) : existing.contractAmount;
  const vat = data.vatAmount !== undefined ? BigInt(Math.round(data.vatAmount)) : existing.vatAmount;
  const amountChanged = data.supplyAmount !== undefined || data.vatAmount !== undefined;

  const updated = await prisma.projectContract.update({
    where: { id: slug },
    data: {
      ...(data.projectTitle !== undefined ? { projectTitle: data.projectTitle } : {}),
      ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
      ...(amountChanged ? { contractAmount: supply, vatAmount: vat, totalAmount: supply + vat } : {}),
      ...(data.dueDate !== undefined ? { dueDate: parseDate(data.dueDate) } : {}),
      ...(data.contractedAt !== undefined ? { contractedAt: parseDate(data.contractedAt) } : {}),
      ...(data.memo !== undefined ? { memo: data.memo || null } : {}),
      ...(data.billingStatus !== undefined ? { billingStatus: data.billingStatus } : {}),
      ...(data.paymentStatus !== undefined ? { paymentStatus: data.paymentStatus } : {}),
      ...(data.contractStatus !== undefined ? { contractStatus: data.contractStatus } : {})
    }
  });

  await prisma.auditLog
    .create({
      data: {
        action: "UPDATE",
        entityType: "PROJECT_CONTRACT",
        entityId: slug,
        beforeData: { projectTitle: existing.projectTitle, totalAmount: existing.totalAmount.toString() },
        afterData: { projectTitle: updated.projectTitle, totalAmount: updated.totalAmount.toString() },
        userId: user.id
      }
    })
    .catch(() => undefined);

  return NextResponse.json({ ok: true, contract: serialize(updated) });
}, { roles: [...writableRoles], write: true });

/**
 * 계약 삭제 = 취소 처리.
 *
 * 세금계산서가 이미 발행된 계약을 지우면 회계 기록이 어긋나므로
 * contractStatus 를 CANCELED 로 바꾼다.
 * 발행된 세금계산서가 있으면 취소도 막는다 (먼저 세금계산서를 처리해야 함).
 */
export const DELETE = withAuth(async (request, context, user) => {
  const { slug } = await context.params;

  const contract = await prisma.projectContract.findUnique({
    where: { id: slug },
    select: {
      id: true,
      projectTitle: true,
      contractStatus: true,
      paymentStatus: true,
      _count: { select: { taxInvoices: true } }
    }
  });

  if (!contract) {
    return NextResponse.json({ ok: false, message: "계약을 찾을 수 없습니다." }, { status: 404 });
  }

  // 개발 단계 강제 삭제: 계약을 실제로 지운다.
  // 계약 품목은 Cascade 로 함께 사라지고, 세금계산서·회의·일정은 남기고 연결만 끊는다
  // (그 기록들은 계약과 별개로 존재하는 것들이다).
  if (wantsHardDelete(request)) {
    const denied = denyHardDelete(user);
    if (denied) return denied;

    await prisma.$transaction([
      prisma.taxInvoice.updateMany({ where: { contractId: slug }, data: { contractId: null } }),
      prisma.meeting.updateMany({ where: { contractId: slug }, data: { contractId: null } }),
      prisma.calendarEvent.updateMany({ where: { contractId: slug }, data: { contractId: null } }),
      prisma.estimate.updateMany({
        where: { contractId: slug },
        data: { contractId: null, status: "ACCEPTED" }
      }),
      prisma.projectContract.delete({ where: { id: slug } })
    ]);

    await prisma.auditLog
      .create({
        data: {
          action: "HARD_DELETE",
          entityType: "PROJECT_CONTRACT",
          entityId: slug,
          beforeData: { projectTitle: contract.projectTitle, contractStatus: contract.contractStatus },
          userId: user.id
        }
      })
      .catch(() => undefined);

    return NextResponse.json({ ok: true, deleted: true, message: `${contract.projectTitle} 계약을 완전히 삭제했습니다.` });
  }

  if (contract.contractStatus === "CANCELED") {
    return NextResponse.json({ ok: true, message: "이미 취소된 계약입니다." });
  }

  if (contract._count.taxInvoices > 0) {
    return NextResponse.json(
      {
        ok: false,
        message: `세금계산서 ${contract._count.taxInvoices}건이 발행되어 있어 취소할 수 없습니다. 세금계산서를 먼저 처리하세요.`
      },
      { status: 409 }
    );
  }

  if (contract.paymentStatus !== "UNPAID") {
    return NextResponse.json(
      { ok: false, message: "입금이 확인된 계약은 취소할 수 없습니다." },
      { status: 409 }
    );
  }

  await prisma.projectContract.update({
    where: { id: slug },
    data: { contractStatus: "CANCELED", closedAt: new Date() }
  });

  await prisma.auditLog
    .create({
      data: {
        action: "CANCEL",
        entityType: "PROJECT_CONTRACT",
        entityId: slug,
        beforeData: { contractStatus: contract.contractStatus },
        afterData: { contractStatus: "CANCELED" },
        userId: user.id
      }
    })
    .catch(() => undefined);

  return NextResponse.json({ ok: true, canceled: true, message: `${contract.projectTitle} 계약을 취소했습니다.` });
}, { roles: [...writableRoles], write: true });
