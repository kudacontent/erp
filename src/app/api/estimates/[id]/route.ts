import { NextResponse } from "next/server";
import { FINANCE_READ_ROLES, withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildItemRows, estimateSchema, parseDate, sumRows } from "@/lib/estimate-shared";

export const runtime = "nodejs";

const writableRoles = ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING"] as const;

export const GET = withAuth(async (_request, context) => {
  const { id } = await context.params;

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      items: { orderBy: { sortOrder: "asc" } }
    }
  });

  if (!estimate) {
    return NextResponse.json({ ok: false, message: "견적서를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    estimate: {
      ...estimate,
      supplyAmount: estimate.supplyAmount.toString(),
      vatAmount: estimate.vatAmount.toString(),
      totalAmount: estimate.totalAmount.toString(),
      items: estimate.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: item.unitPrice.toString(),
        supplyAmount: item.supplyAmount.toString(),
        vatAmount: item.vatAmount.toString()
      }))
    }
  });
}, { roles: [...FINANCE_READ_ROLES] });

/**
 * 견적서 저장.
 *
 * 품목 표는 부분 수정이 아니라 "화면에 보이는 표 전체"를 통째로 저장한다.
 * 견적서는 몇 번이고 고쳐 쓰는 문서라, 행 단위로 주고받으면 화면과 서버가 어긋나기 쉽다.
 */
export const PUT = withAuth(async (request, context, user) => {
  const { id } = await context.params;
  const parsed = estimateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.estimate.findUnique({
    where: { id },
    select: { id: true, status: true, contractId: true, totalAmount: true, estimateNo: true }
  });

  if (!existing) {
    return NextResponse.json({ ok: false, message: "견적서를 찾을 수 없습니다." }, { status: 404 });
  }

  // 계약으로 전개된 견적을 고치면 계약 금액과 어긋난다
  if (existing.contractId) {
    return NextResponse.json(
      { ok: false, message: "이미 계약으로 전환된 견적서입니다. 금액을 바꾸려면 계약에서 수정하세요." },
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

  const rows = buildItemRows(data.items);
  const totals = sumRows(rows);

  const [, updated] = await prisma.$transaction([
    prisma.estimateItem.deleteMany({ where: { estimateId: id } }),
    prisma.estimate.update({
      where: { id },
      data: {
        title: data.title,
        clientId: data.clientId || null,
        recipient: data.recipient || null,
        reference: data.reference || null,
        ...(data.status ? { status: data.status } : {}),
        ...(data.issuedAt !== undefined ? { issuedAt: parseDate(data.issuedAt) } : {}),
        ...(data.validUntil !== undefined ? { validUntil: parseDate(data.validUntil) } : {}),
        validityNote: data.validityNote || null,
        otherContent: data.otherContent || null,
        supplierNumber: data.supplierNumber || null,
        supplierName: data.supplierName || null,
        supplierRepresentative: data.supplierRepresentative || null,
        supplierAddress: data.supplierAddress || null,
        supplierPhone: data.supplierPhone || null,
        supplierEmail: data.supplierEmail || null,
        memo: data.memo || null,
        supplyAmount: totals.supplyAmount,
        vatAmount: totals.vatAmount,
        totalAmount: totals.totalAmount,
        items: { create: rows }
      },
      select: { id: true, estimateNo: true, totalAmount: true }
    })
  ]);

  await prisma.auditLog
    .create({
      data: {
        action: "UPDATE",
        entityType: "ESTIMATE",
        entityId: id,
        beforeData: { totalAmount: existing.totalAmount.toString() },
        afterData: { totalAmount: updated.totalAmount.toString(), itemCount: rows.length },
        userId: user.id
      }
    })
    .catch(() => undefined);

  return NextResponse.json({
    ok: true,
    estimate: { id: updated.id, estimateNo: updated.estimateNo, totalAmount: updated.totalAmount.toString() }
  });
}, { roles: [...writableRoles], write: true });

/**
 * 견적서 삭제.
 *
 * 계약과 달리 견적서는 실제로 지운다.
 * 성사되지 않은 견적이 목록에 계속 쌓이면 쓸모가 없기 때문이다.
 * 단, 계약으로 전개된 견적은 계약의 근거 문서이므로 지우지 않는다.
 */
export const DELETE = withAuth(async (_request, context, user) => {
  const { id } = await context.params;

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    select: { id: true, estimateNo: true, title: true, contractId: true }
  });

  if (!estimate) {
    return NextResponse.json({ ok: false, message: "견적서를 찾을 수 없습니다." }, { status: 404 });
  }

  if (estimate.contractId) {
    return NextResponse.json(
      { ok: false, message: "계약으로 전환된 견적서입니다. 계약의 근거 문서이므로 삭제할 수 없습니다." },
      { status: 409 }
    );
  }

  await prisma.estimate.delete({ where: { id } });

  await prisma.auditLog
    .create({
      data: {
        action: "DELETE",
        entityType: "ESTIMATE",
        entityId: id,
        beforeData: { estimateNo: estimate.estimateNo, title: estimate.title },
        userId: user.id
      }
    })
    .catch(() => undefined);

  return NextResponse.json({ ok: true, message: `${estimate.estimateNo} 견적서를 삭제했습니다.` });
}, { roles: [...writableRoles], write: true });
