import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const approvalActionSchema = z.object({
  action: z.enum(["request", "approve", "reject", "pay"])
});

const approverRoles = ["CEO", "ADMIN", "ACCOUNTING"] as const;

function isApprover(role: string) {
  return approverRoles.includes(role as (typeof approverRoles)[number]);
}

export const PATCH = withAuth(async (request, { params }, user) => {
  const { id } = await params;
  const parsed = approvalActionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "지출 처리 단계를 확인하세요." }, { status: 400 });
  }

  const expense = await prisma.expense.findUnique({ where: { id } });

  if (!expense) {
    return NextResponse.json({ ok: false, message: "지출을 찾을 수 없습니다." }, { status: 404 });
  }

  const { action } = parsed.data;
  let nextStatus: "REQUESTED" | "APPROVED" | "REJECTED" | "PAID";
  let message: string;

  if (action === "request") {
    if (!(["DRAFT", "REJECTED"] as string[]).includes(expense.approvalStatus)) {
      return NextResponse.json({ ok: false, message: "검토 또는 반려 상태의 지출만 승인 요청할 수 있습니다." }, { status: 409 });
    }

    nextStatus = "REQUESTED";
    message = "지출이 승인 요청 상태로 이동했습니다.";
  } else {
    if (!isApprover(user.role)) {
      return NextResponse.json({ ok: false, message: "승인 권한이 있는 계정만 처리할 수 있습니다." }, { status: 403 });
    }

    if (action === "approve" || action === "reject") {
      if (expense.approvalStatus !== "REQUESTED") {
        return NextResponse.json({ ok: false, message: "승인 요청 상태의 지출만 처리할 수 있습니다." }, { status: 409 });
      }

      nextStatus = action === "approve" ? "APPROVED" : "REJECTED";
      message = action === "approve" ? "지출이 승인되었습니다." : "지출이 반려되었습니다.";
    } else {
      if (expense.approvalStatus !== "APPROVED") {
        return NextResponse.json({ ok: false, message: "승인 완료 상태의 지출만 지급 처리할 수 있습니다." }, { status: 409 });
      }

      nextStatus = "PAID";
      message = "지출이 지급 완료 처리되었습니다.";
    }
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      approvalStatus: nextStatus,
      ...(action === "approve" ? { approvedById: user.id } : {})
    }
  });

  return NextResponse.json({
    ok: true,
    message,
    expense: {
      id: updated.id,
      approvalStatus: updated.approvalStatus
    }
  });
}, { roles: ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING"], write: true });
