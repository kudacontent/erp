import { NextResponse } from "next/server";
import { TaxInvoiceStatus } from "@prisma/client";
import { getTaxInvoiceProvider, issueTaxInvoiceWithProvider, createTaxInvoiceMgtKey } from "@/lib/barobill-tax-invoice";
import { FINANCE_READ_ROLES, withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeCorpNum, taxInvoiceFormSchema, toBarobillDate, toWriteDate } from "@/lib/tax-invoice-schema";
import { serializeTaxInvoice, toProviderInput } from "@/lib/tax-invoice-service";
import { afterInvoiceIssued } from "@/lib/contract-status-sync";
import { applyContractPatch } from "@/lib/contract-status-apply";

export const runtime = "nodejs";

function jsonPayload(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function validateParty(party: { corpNum: string; contactId: string }, label: string, requireContactId: boolean) {
  const corpNum = normalizeCorpNum(party.corpNum);

  if (![10, 13].includes(corpNum.length)) {
    return `${label} 사업자등록번호는 숫자 10자리 또는 주민등록번호 13자리여야 합니다.`;
  }

  if (requireContactId && !party.contactId.trim()) {
    return "공급자의 바로빌 회원 아이디를 입력하거나 BAROBILL_INVOICER_CONTACT_ID를 설정하세요.";
  }

  return null;
}

function calculateTotals(items: Array<{ amount: string; tax: string }>) {
  return items.reduce(
    (totals, item) => ({
      amount: totals.amount + BigInt(item.amount),
      tax: totals.tax + BigInt(item.tax)
    }),
    { amount: BigInt(0), tax: BigInt(0) }
  );
}

export const GET = withAuth(async () => {
  const invoices = await prisma.taxInvoice.findMany({
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({
    ok: true,
    provider: getTaxInvoiceProvider(),
    invoices: invoices.map(serializeTaxInvoice)
  });
}, { roles: [...FINANCE_READ_ROLES] });

export const POST = withAuth(async (request, _context, user) => {
  const parsed = taxInvoiceFormSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "세금계산서 입력값을 확인하세요.",
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const provider = getTaxInvoiceProvider();
  const invoicerParty = {
    ...data.invoicerParty,
    corpNum: normalizeCorpNum(data.invoicerParty.corpNum),
    contactId: data.invoicerParty.contactId || process.env.BAROBILL_INVOICER_CONTACT_ID || ""
  };
  const invoiceeParty = {
    ...data.invoiceeParty,
    corpNum: normalizeCorpNum(data.invoiceeParty.corpNum)
  };
  const partyError =
    validateParty(invoicerParty, "공급자", provider === "barobill") ||
    validateParty(invoiceeParty, "공급받는자", false);

  if (partyError) {
    return NextResponse.json({ ok: false, message: partyError }, { status: 400 });
  }

  const totals = calculateTotals(data.items);
  if (
    totals.amount !== BigInt(data.amountTotal) ||
    totals.tax !== BigInt(data.taxTotal) ||
    totals.amount + totals.tax !== BigInt(data.totalAmount)
  ) {
    return NextResponse.json({ ok: false, message: "품목 합계와 공급가액·세액·합계가 일치하지 않습니다." }, { status: 400 });
  }

  if (data.taxType !== 1 && totals.tax !== BigInt(0)) {
    return NextResponse.json({ ok: false, message: "영세·면세 세금계산서의 품목 세액은 0원이어야 합니다." }, { status: 400 });
  }

  if (data.clientId) {
    const client = await prisma.client.findUnique({ where: { id: data.clientId }, select: { id: true } });
    if (!client) {
      return NextResponse.json({ ok: false, message: "선택한 거래처를 찾을 수 없습니다." }, { status: 404 });
    }
  }

  if (data.contractId) {
    const contract = await prisma.projectContract.findUnique({ where: { id: data.contractId }, select: { id: true } });
    if (!contract) {
      return NextResponse.json({ ok: false, message: "연결할 계약을 찾을 수 없습니다." }, { status: 404 });
    }
  }

  const normalized = {
    ...data,
    issueDate: data.issueDate,
    invoicerParty,
    invoiceeParty,
    items: data.items.map((item) => ({ ...item, purchaseDate: toBarobillDate(item.purchaseDate) }))
  };
  const mgtKey = createTaxInvoiceMgtKey();
  const invoice = await prisma.taxInvoice.create({
    data: {
      clientId: data.clientId || null,
      contractId: data.contractId || null,
      createdById: user.id,
      mgtKey,
      issueDirection: 1,
      taxInvoiceType: 1,
      taxType: data.taxType,
      taxCalcType: 1,
      purposeType: data.purposeType,
      writeDate: toWriteDate(data.issueDate),
      invoicerCorpNum: invoicerParty.corpNum,
      invoicerTaxRegId: invoicerParty.taxRegId,
      invoicerCorpName: invoicerParty.corpName,
      invoicerCeoName: invoicerParty.ceoName,
      invoicerAddress: invoicerParty.addr,
      invoicerBizClass: invoicerParty.bizClass,
      invoicerBizType: invoicerParty.bizType,
      invoicerContactId: invoicerParty.contactId,
      invoicerContactName: invoicerParty.contactName,
      invoicerTel: invoicerParty.tel,
      invoicerHp: invoicerParty.hp,
      invoicerEmail: invoicerParty.email,
      invoiceeCorpNum: invoiceeParty.corpNum,
      invoiceeTaxRegId: invoiceeParty.taxRegId,
      invoiceeCorpName: invoiceeParty.corpName,
      invoiceeCeoName: invoiceeParty.ceoName,
      invoiceeAddress: invoiceeParty.addr,
      invoiceeBizClass: invoiceeParty.bizClass,
      invoiceeBizType: invoiceeParty.bizType,
      invoiceeContactName: invoiceeParty.contactName,
      invoiceeTel: invoiceeParty.tel,
      invoiceeHp: invoiceeParty.hp,
      invoiceeEmail: invoiceeParty.email,
      cash: data.cash,
      chkBill: data.chkBill,
      note: data.note,
      credit: data.credit,
      remark1: data.remark1,
      remark2: data.remark2,
      remark3: data.remark3,
      sendSms: data.sendSms,
      forceIssue: data.forceIssue,
      mailTitle: data.mailTitle,
      amountTotal: totals.amount,
      taxTotal: totals.tax,
      totalAmount: totals.amount + totals.tax,
      provider,
      status: data.action === "issue" ? TaxInvoiceStatus.ISSUING : TaxInvoiceStatus.DRAFT,
      payload: jsonPayload(normalized),
      items: {
        create: data.items.map((item, index) => ({
          purchaseDate: toBarobillDate(item.purchaseDate),
          name: item.name,
          information: item.information,
          chargeableUnit: item.chargeableUnit,
          unitPrice: item.unitPrice,
          amount: BigInt(item.amount),
          tax: BigInt(item.tax),
          description: item.description,
          sortOrder: index
        }))
      }
    },
    include: { items: { orderBy: { sortOrder: "asc" } } }
  });

  if (data.action === "draft") {
    return NextResponse.json({ ok: true, message: "세금계산서를 임시 저장했습니다.", invoice: serializeTaxInvoice(invoice) }, { status: 201 });
  }

  try {
    const providerResult = await issueTaxInvoiceWithProvider(toProviderInput(invoice));
    const issued = await prisma.taxInvoice.update({
      where: { id: invoice.id },
      data: {
        status: TaxInvoiceStatus.ISSUED,
        providerResultCode: providerResult.resultCode,
        providerMessage: providerResult.message,
        invoiceKey: providerResult.invoiceKey,
        approvalNumber: providerResult.approvalNumber,
        issuedAt: new Date()
      },
      include: { items: { orderBy: { sortOrder: "asc" } } }
    });

    // 발행과 동시에 계약의 청구 상태도 옮긴다 (계약 화면에서 또 눌러야 하는 일을 없앤다)
    if (issued.contractId) {
      await applyContractPatch(issued.contractId, afterInvoiceIssued, {
        action: "BILLING_SYNC",
        userId: user.id
      });
    }

    return NextResponse.json({ ok: true, message: providerResult.message, invoice: serializeTaxInvoice(issued) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "세금계산서 발급에 실패했습니다.";
    const failed = await prisma.taxInvoice.update({
      where: { id: invoice.id },
      data: {
        status: TaxInvoiceStatus.FAILED,
        providerMessage: message
      },
      include: { items: { orderBy: { sortOrder: "asc" } } }
    });

    return NextResponse.json({ ok: false, message, invoice: serializeTaxInvoice(failed) }, { status: 502 });
  }
}, { roles: ["CEO", "ADMIN", "ACCOUNTING"], write: true });
