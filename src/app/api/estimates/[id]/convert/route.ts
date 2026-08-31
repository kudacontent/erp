import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const writableRoles = ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING"] as const;

/**
 * 견적서 → 계약 전개.
 *
 * 실무에서 수주가 확정되면 견적 내용을 계약서에 그대로 옮겨 적는다.
 * 손으로 옮기면 품목이나 금액이 틀리기 쉬우므로 견적 품목을 계약 품목으로 복사한다.
 *
 * 한 견적서는 한 번만 전개된다 (contractId 가 채워지면 끝).
 * 계약 조건이 달라지면 계약 쪽에서 고친다 — 견적서는 그때 보낸 그대로 남겨 둔다.
 */
export const POST = withAuth(async (_request, context, user) => {
  const { id } = await context.params;

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } }
  });

  if (!estimate) {
    return NextResponse.json({ ok: false, message: "견적서를 찾을 수 없습니다." }, { status: 404 });
  }

  if (estimate.contractId) {
    return NextResponse.json(
      { ok: false, message: "이미 계약으로 전환된 견적서입니다.", contractId: estimate.contractId },
      { status: 409 }
    );
  }

  // 계약에는 거래처가 반드시 있어야 한다. 견적은 미등록 상대에게도 낼 수 있어 선택이었다
  if (!estimate.clientId) {
    return NextResponse.json(
      { ok: false, message: "거래처가 연결되지 않은 견적서입니다. 먼저 거래처를 지정하고 저장하세요." },
      { status: 400 }
    );
  }

  if (estimate.items.length === 0) {
    return NextResponse.json({ ok: false, message: "품목이 없는 견적서는 계약으로 옮길 수 없습니다." }, { status: 400 });
  }

  const contract = await prisma.$transaction(async (tx) => {
    const created = await tx.projectContract.create({
      data: {
        clientId: estimate.clientId as string,
        projectTitle: estimate.title,
        contractAmount: estimate.supplyAmount,
        vatAmount: estimate.vatAmount,
        totalAmount: estimate.totalAmount,
        contractStatus: "SIGNED",
        contractedAt: new Date(),
        memo: `견적서 ${estimate.estimateNo} 에서 전환`,
        items: {
          create: estimate.items.map((item, index) => ({
            sortOrder: index,
            name: item.name,
            spec: item.spec,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            supplyAmount: item.supplyAmount,
            vatAmount: item.vatAmount,
            taxType: item.taxType,
            memo: item.memo
          }))
        }
      },
      select: { id: true, projectTitle: true }
    });

    await tx.estimate.update({
      where: { id },
      data: { contractId: created.id, status: "CONVERTED" }
    });

    return created;
  });

  await prisma.auditLog
    .create({
      data: {
        action: "CONVERT",
        entityType: "ESTIMATE",
        entityId: id,
        afterData: { contractId: contract.id, estimateNo: estimate.estimateNo },
        userId: user.id
      }
    })
    .catch(() => undefined);

  return NextResponse.json({
    ok: true,
    contractId: contract.id,
    message: `${estimate.estimateNo} 견적서를 계약으로 옮겼습니다.`
  });
}, { roles: [...writableRoles], write: true });
