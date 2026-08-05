import { NextResponse } from "next/server";
import { createExpenseSchema } from "@/lib/expense-schema";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function serializeExpense(expense: {
  id: string;
  clientId: string | null;
  expenseCategory: string;
  amount: bigint;
  vatAmount: bigint;
  totalAmount: bigint;
  paymentMethod: string;
  approvalStatus: string;
  receiptImageUrl: string | null;
  spentAt: Date;
  createdAt: Date;
}) {
  return {
    ...expense,
    amount: expense.amount.toString(),
    vatAmount: expense.vatAmount.toString(),
    totalAmount: expense.totalAmount.toString(),
    spentAt: expense.spentAt.toISOString(),
    createdAt: expense.createdAt.toISOString()
  };
}

export const GET = withAuth(async () => {
  const expenses = await prisma.expense.findMany({
    orderBy: { spentAt: "desc" },
    take: 200
  });

  return NextResponse.json({ ok: true, expenses: expenses.map(serializeExpense) });
});

export const POST = withAuth(async (request, _context, user) => {
  const body = await request.json();
  const parsed = createExpenseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = parsed.data;
  const spentAt = new Date(data.spentAt);
  const expense = await prisma.expense.create({
    data: {
      clientId: data.clientId || null,
      expenseCategory: data.expenseCategory,
      amount: BigInt(data.amount),
      vatAmount: BigInt(data.vatAmount),
      totalAmount: BigInt(data.totalAmount),
      paymentMethod: data.paymentMethod,
      spentAt,
      receiptImageUrl: data.receiptImageUrl || null,
      geminiAnalysis: data.geminiAnalysis || null,
      createdById: user.id
    }
  });

  if (data.receiptImageUrl) {
    await prisma.attachment.create({
      data: {
        entityType: "EXPENSE",
        entityId: expense.id,
        fileName: data.receiptFileName || "receipt",
        fileUrl: data.receiptImageUrl,
        mimeType: data.receiptMimeType || "image/*",
        fileSize: null,
        uploadedBy: user.id
      }
    });
  }

  return NextResponse.json({ ok: true, expense: serializeExpense(expense) }, { status: 201 });
}, { roles: ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING"], write: true });
