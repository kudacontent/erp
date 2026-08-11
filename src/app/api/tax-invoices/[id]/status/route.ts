import { NextResponse } from "next/server";
import { getBarobillTaxInvoiceState } from "@/lib/barobill-tax-invoice";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeTaxInvoice } from "@/lib/tax-invoice-service";

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

  if (invoice.provider !== "barobill") {
    return NextResponse.json({ ok: true, invoice: serializeTaxInvoice(invoice) });
  }

  try {
    const state = await getBarobillTaxInvoiceState(invoice.mgtKey);
    const updated = await prisma.taxInvoice.update({
      where: { id: invoice.id },
      data: {
        providerStatus: state.barobillState,
        invoiceKey: state.invoiceKey || null,
        approvalNumber: state.ntsSendKey || null,
        providerMessage: state.ntsSendResult || invoice.providerMessage,
        issuedAt: state.issueDate ? invoice.issuedAt || new Date() : invoice.issuedAt
      },
      include: { items: { orderBy: { sortOrder: "asc" } } }
    });

    return NextResponse.json({ ok: true, state, invoice: serializeTaxInvoice(updated) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "바로빌 상태 조회에 실패했습니다." },
      { status: 502 }
    );
  }
}, { roles: ["CEO", "ADMIN", "ACCOUNTING"] });
