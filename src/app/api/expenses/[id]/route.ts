import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const writableRoles = ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING"] as const;

/** 결재가 끝난 지출은 회계 기록이므로 손대지 않는다 */
const LOCKED_STATUSES = ["APPROVED", "PAID"] as const;

const updateSchema = z.object({
  expenseCategory: z.string().trim().min(1, "지출 항목을 입력하세요.").max(80).optional(),
  amount: z.coerce.number().nonnegative("금액을 확인하세요.").optional(),
  vatAmount: z.coerce.number().nonnegative("부가세를 확인하세요.").optional(),
  paymentMethod: z.string().trim().min(1, "결제 수단을 입력하세요.").max(60).optional(),
  clientId: z.string().trim().optional().nullable(),
  spentAt: z.string().optional(),
  geminiAnalysis: z.string().max(50000).optional().nullable()
});

function serialize(expense: { amount: bigint; vatAmount: bigint; totalAmount: bigint; spentAt: Date; createdAt: Date; updatedAt: Date }) {
  return {
    ...expense,
    amount: expense.amount.toString(),
    vatAmount: expense.vatAmount.toString(),
    totalAmount: expense.totalAmount.toString(),
    spentAt: expense.spentAt.toISOString(),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString()
  };
}

export const GET = withAuth(async (_request, context) => {
  const { id } = await context.params;
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { client: { select: { id: true, name: true } } }
  });

  if (!expense) {
    return NextResponse.json({ ok: false, message: "지출 내역을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, expense: serialize(expense) });
});

export const PATCH = withAuth(async (request, context, user) => {
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.expense.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ ok: false, message: "지출 내역을 찾을 수 없습니다." }, { status: 404 });
  }

  if ((LOCKED_STATUSES as readonly string[]).includes(existing.approvalStatus)) {
    return NextResponse.json(
      {
        ok: false,
        message:
          existing.approvalStatus === "PAID"
            ? "지급이 완료된 지출은 수정할 수 없습니다."
            : "승인이 완료된 지출은 수정할 수 없습니다. 반려 후 수정하세요."
      },
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

  const amount = data.amount !== undefined ? BigInt(Math.round(data.amount)) : existing.amount;
  const vat = data.vatAmount !== undefined ? BigInt(Math.round(data.vatAmount)) : existing.vatAmount;
  const amountChanged = data.amount !== undefined || data.vatAmount !== undefined;

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      ...(data.expenseCategory !== undefined ? { expenseCategory: data.expenseCategory } : {}),
      ...(amountChanged ? { amount, vatAmount: vat, totalAmount: amount + vat } : {}),
      ...(data.paymentMethod !== undefined ? { paymentMethod: data.paymentMethod } : {}),
      ...(data.clientId !== undefined ? { clientId: data.clientId || null } : {}),
      ...(data.spentAt !== undefined ? { spentAt: new Date(data.spentAt) } : {}),
      ...(data.geminiAnalysis !== undefined ? { geminiAnalysis: data.geminiAnalysis || null } : {})
    }
  });

  await prisma.auditLog
    .create({
      data: {
        action: "UPDATE",
        entityType: "EXPENSE",
        entityId: id,
        beforeData: { totalAmount: existing.totalAmount.toString(), category: existing.expenseCategory },
        afterData: { totalAmount: updated.totalAmount.toString(), category: updated.expenseCategory },
        userId: user.id
      }
    })
    .catch(() => undefined);

  return NextResponse.json({ ok: true, expense: serialize(updated) });
}, { roles: [...writableRoles], write: true });

/**
 * 지출 삭제.
 *
 * 지출에는 보관 상태가 따로 없다. 대신 결재가 끝나지 않은 건(작성 중·승인 대기·반려)만
 * 실제로 지운다. 승인·지급이 끝난 건은 회계 기록이므로 삭제를 막는다.
 */
export const DELETE = withAuth(async (_request, context, user) => {
  const { id } = await context.params;

  const expense = await prisma.expense.findUnique({
    where: { id },
    select: { id: true, approvalStatus: true, expenseCategory: true, totalAmount: true }
  });

  if (!expense) {
    return NextResponse.json({ ok: false, message: "지출 내역을 찾을 수 없습니다." }, { status: 404 });
  }

  if ((LOCKED_STATUSES as readonly string[]).includes(expense.approvalStatus)) {
    return NextResponse.json(
      {
        ok: false,
        message:
          expense.approvalStatus === "PAID"
            ? "지급이 완료된 지출은 삭제할 수 없습니다."
            : "승인이 완료된 지출은 삭제할 수 없습니다. 반려 후 삭제하세요."
      },
      { status: 409 }
    );
  }

  await prisma.expense.delete({ where: { id } });

  await prisma.auditLog
    .create({
      data: {
        action: "DELETE",
        entityType: "EXPENSE",
        entityId: id,
        beforeData: { category: expense.expenseCategory, totalAmount: expense.totalAmount.toString() },
        userId: user.id
      }
    })
    .catch(() => undefined);

  return NextResponse.json({ ok: true, message: "지출 내역을 삭제했습니다." });
}, { roles: [...writableRoles], write: true });
