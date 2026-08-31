import { NextResponse } from "next/server";
import { FINANCE_READ_ROLES, withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeTaxInvoice } from "@/lib/tax-invoice-service";
import { afterInvoiceCanceled } from "@/lib/contract-status-sync";
import { applyContractPatch } from "@/lib/contract-status-apply";
import { denyHardDelete } from "@/lib/hard-delete";

export const runtime = "nodejs";

export const GET = withAuth(async (_request, context) => {
  const { id } = await context.params;

  const invoice = await prisma.taxInvoice.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } }
  });

  if (!invoice) {
    return NextResponse.json({ ok: false, message: "세금계산서를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, invoice: serializeTaxInvoice(invoice) });
}, { roles: [...FINANCE_READ_ROLES] });

/**
 * 세금계산서 삭제 — 개발 단계 전용.
 *
 * 운영에서는 발행된 세금계산서를 지우지 않는다. 국세청에 이미 넘어간 문서라
 * 우리 DB 에서 지운다고 없던 일이 되지 않고, 장부만 어긋난다.
 * 잘못 발행했으면 취소 발행(수정세금계산서)으로 처리하는 것이 맞다.
 *
 * 다만 개발 중에는 바로빌 테스트 서버로 발행해 본 건이 계속 쌓이므로,
 * ALLOW_HARD_DELETE 가 켜져 있을 때 최고관리자에 한해 실제 삭제를 허용한다.
 */
export const DELETE = withAuth(async (_request, context, user) => {
  const { id } = await context.params;

  const denied = denyHardDelete(user);
  if (denied) return denied;

  const invoice = await prisma.taxInvoice.findUnique({
    where: { id },
    select: { id: true, mgtKey: true, status: true, contractId: true, invoiceeCorpName: true }
  });

  if (!invoice) {
    return NextResponse.json({ ok: false, message: "세금계산서를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.taxInvoice.delete({ where: { id } });

  // 이 계산서 때문에 '발행 완료' 가 된 계약이 있으면 다시 발행 대기로 되돌린다
  if (invoice.contractId) {
    const remaining = await prisma.taxInvoice.count({ where: { contractId: invoice.contractId } });

    if (remaining === 0) {
      await applyContractPatch(invoice.contractId, afterInvoiceCanceled, {
        action: "BILLING_SYNC",
        userId: user.id
      });
    }
  }

  await prisma.auditLog
    .create({
      data: {
        action: "HARD_DELETE",
        entityType: "TAX_INVOICE",
        entityId: id,
        beforeData: { mgtKey: invoice.mgtKey, status: invoice.status, invoicee: invoice.invoiceeCorpName },
        userId: user.id
      }
    })
    .catch(() => undefined);

  return NextResponse.json({ ok: true, message: `세금계산서 ${invoice.mgtKey} 를 삭제했습니다.` });
}, { roles: ["CEO"], write: true });
