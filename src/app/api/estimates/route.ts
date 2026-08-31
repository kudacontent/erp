import { NextResponse } from "next/server";
import { FINANCE_READ_ROLES, withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildEstimateNo, buildItemRows, estimateSchema, parseDate, sumRows } from "@/lib/estimate-shared";

export const runtime = "nodejs";

const writableRoles = ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING"] as const;

/**
 * 오늘 날짜 기준으로 비어 있는 견적번호를 찾는다.
 *
 * 두 사람이 동시에 견적을 만들면 같은 번호가 나올 수 있어서
 * 유니크 제약(P2002)에 걸리면 다음 번호로 몇 번 다시 시도한다.
 */
async function nextEstimateNo(date: Date) {
  const prefix = buildEstimateNo(date, 0).slice(0, -2);

  const last = await prisma.estimate.findFirst({
    where: { estimateNo: { startsWith: prefix } },
    orderBy: { estimateNo: "desc" },
    select: { estimateNo: true }
  });

  const lastSequence = last ? Number(last.estimateNo.slice(-2)) : 0;
  return Number.isFinite(lastSequence) ? lastSequence + 1 : 1;
}

export const GET = withAuth(async () => {
  const estimates = await prisma.estimate.findMany({
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    include: { client: { select: { id: true, name: true } } }
  });

  return NextResponse.json({
    ok: true,
    estimates: estimates.map((estimate) => ({
      id: estimate.id,
      estimateNo: estimate.estimateNo,
      title: estimate.title,
      clientId: estimate.clientId,
      clientName: estimate.client?.name ?? null,
      recipient: estimate.recipient,
      status: estimate.status,
      issuedAt: estimate.issuedAt?.toISOString() ?? null,
      totalAmount: estimate.totalAmount.toString()
    }))
  });
}, { roles: [...FINANCE_READ_ROLES] });

export const POST = withAuth(async (request, _context, user) => {
  const parsed = estimateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
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
  const issuedAt = parseDate(data.issuedAt) ?? new Date();

  let sequence = await nextEstimateNo(issuedAt);
  let created = null as { id: string; estimateNo: string } | null;

  for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
    try {
      created = await prisma.estimate.create({
        data: {
          estimateNo: buildEstimateNo(issuedAt, sequence),
          title: data.title,
          clientId: data.clientId || null,
          recipient: data.recipient || null,
          reference: data.reference || null,
          status: data.status ?? "DRAFT",
          issuedAt,
          validUntil: parseDate(data.validUntil) ?? null,
          validityNote: data.validityNote || null,
          otherContent: data.otherContent || null,
          supplierNumber: data.supplierNumber || null,
          supplierName: data.supplierName || null,
          supplierRepresentative: data.supplierRepresentative || null,
          supplierAddress: data.supplierAddress || null,
          supplierPhone: data.supplierPhone || null,
          supplierEmail: data.supplierEmail || null,
          memo: data.memo || null,
          createdById: user.id,
          supplyAmount: totals.supplyAmount,
          vatAmount: totals.vatAmount,
          totalAmount: totals.totalAmount,
          items: { create: rows }
        },
        select: { id: true, estimateNo: true }
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "P2002") throw error;
      sequence += 1;
    }
  }

  if (!created) {
    return NextResponse.json({ ok: false, message: "견적번호를 만들지 못했습니다. 다시 시도해 주세요." }, { status: 409 });
  }

  await prisma.auditLog
    .create({
      data: {
        action: "CREATE",
        entityType: "ESTIMATE",
        entityId: created.id,
        afterData: { estimateNo: created.estimateNo, title: data.title, totalAmount: totals.totalAmount.toString() },
        userId: user.id
      }
    })
    .catch(() => undefined);

  return NextResponse.json({ ok: true, estimate: created }, { status: 201 });
}, { roles: [...writableRoles], write: true });
