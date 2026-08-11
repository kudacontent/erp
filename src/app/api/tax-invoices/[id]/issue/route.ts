import { NextResponse } from "next/server";
import { TaxInvoiceStatus } from "@prisma/client";
import { issueTaxInvoiceWithProvider } from "@/lib/barobill-tax-invoice";
import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeTaxInvoice, toProviderInput } from "@/lib/tax-invoice-service";

export const runtime = "nodejs";

export const POST = withAuth(async (_request, context) => {
  const { id } = await context.params;
  const invoice = await prisma.taxInvoice.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } }
  });

  if (!invoice) {
    return NextResponse.json({ ok: false, message: "세금계산서를 찾을 수 없습니다." }, { status: 404 });
  }

  if (invoice.status === TaxInvoiceStatus.ISSUED) {
    return NextResponse.json({ ok: false, message: "이미 발급 처리된 세금계산서입니다." }, { status: 409 });
  }

  if (invoice.status === TaxInvoiceStatus.ISSUING) {
    return NextResponse.json({ ok: false, message: "이미 발급 처리 중인 세금계산서입니다. 잠시 후 상태를 확인하세요." }, { status: 409 });
  }

  const issuing = await prisma.taxInvoice.update({
    where: { id: invoice.id },
    data: { status: TaxInvoiceStatus.ISSUING },
    include: { items: { orderBy: { sortOrder: "asc" } } }
  });

  try {
    const providerResult = await issueTaxInvoiceWithProvider(toProviderInput(issuing));
    const issued = await prisma.taxInvoice.update({
      where: { id: invoice.id },
      data: {
        status: TaxInvoiceStatus.ISSUED,
        provider: providerResult.provider,
        providerResultCode: providerResult.resultCode,
        providerMessage: providerResult.message,
        invoiceKey: providerResult.invoiceKey,
        approvalNumber: providerResult.approvalNumber,
        issuedAt: new Date()
      },
      include: { items: { orderBy: { sortOrder: "asc" } } }
    });

    return NextResponse.json({ ok: true, message: providerResult.message, invoice: serializeTaxInvoice(issued) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "세금계산서 발급에 실패했습니다.";
    const failed = await prisma.taxInvoice.update({
      where: { id: invoice.id },
      data: { status: TaxInvoiceStatus.FAILED, providerMessage: message },
      include: { items: { orderBy: { sortOrder: "asc" } } }
    });

    return NextResponse.json({ ok: false, message, invoice: serializeTaxInvoice(failed) }, { status: 502 });
  }
}, { roles: ["CEO", "ADMIN", "ACCOUNTING"], write: true });
