import type { TaxInvoice, TaxInvoiceItem } from "@prisma/client";
import type { TaxInvoiceIssueInput } from "@/lib/barobill-tax-invoice";

export type TaxInvoiceWithItems = TaxInvoice & { items: TaxInvoiceItem[] };

export function toProviderInput(invoice: TaxInvoiceWithItems): TaxInvoiceIssueInput {
  return {
    mgtKey: invoice.mgtKey,
    invoicerParty: {
      contactId: invoice.invoicerContactId || "",
      corpNum: invoice.invoicerCorpNum,
      mgtNum: invoice.mgtKey,
      taxRegId: invoice.invoicerTaxRegId || "",
      corpName: invoice.invoicerCorpName,
      ceoName: invoice.invoicerCeoName,
      addr: invoice.invoicerAddress,
      bizClass: invoice.invoicerBizClass || "",
      bizType: invoice.invoicerBizType || "",
      contactName: invoice.invoicerContactName || "",
      tel: invoice.invoicerTel || "",
      hp: invoice.invoicerHp || "",
      email: invoice.invoicerEmail || ""
    },
    invoiceeParty: {
      contactId: "",
      corpNum: invoice.invoiceeCorpNum,
      mgtNum: "",
      taxRegId: invoice.invoiceeTaxRegId || "",
      corpName: invoice.invoiceeCorpName,
      ceoName: invoice.invoiceeCeoName,
      addr: invoice.invoiceeAddress,
      bizClass: invoice.invoiceeBizClass || "",
      bizType: invoice.invoiceeBizType || "",
      contactName: invoice.invoiceeContactName || "",
      tel: invoice.invoiceeTel || "",
      hp: invoice.invoiceeHp || "",
      email: invoice.invoiceeEmail || ""
    },
    issueDirection: invoice.issueDirection,
    taxInvoiceType: invoice.taxInvoiceType,
    taxType: invoice.taxType,
    taxCalcType: invoice.taxCalcType,
    purposeType: invoice.purposeType,
    writeDate: invoice.writeDate,
    cash: invoice.cash || "",
    chkBill: invoice.chkBill || "",
    note: invoice.note || "",
    credit: invoice.credit || "",
    remark1: invoice.remark1 || "",
    remark2: invoice.remark2 || "",
    remark3: invoice.remark3 || "",
    amountTotal: invoice.amountTotal.toString(),
    taxTotal: invoice.taxTotal.toString(),
    totalAmount: invoice.totalAmount.toString(),
    sendSms: invoice.sendSms,
    forceIssue: invoice.forceIssue,
    mailTitle: invoice.mailTitle || "",
    items: invoice.items.map((item) => ({
      purchaseDate: item.purchaseDate,
      name: item.name,
      information: item.information || "",
      chargeableUnit: item.chargeableUnit,
      unitPrice: item.unitPrice,
      amount: item.amount.toString(),
      tax: item.tax.toString(),
      description: item.description || ""
    }))
  };
}

export function serializeTaxInvoice(invoice: TaxInvoiceWithItems) {
  return {
    id: invoice.id,
    clientId: invoice.clientId,
    contractId: invoice.contractId,
    mgtKey: invoice.mgtKey,
    issueDirection: invoice.issueDirection,
    taxInvoiceType: invoice.taxInvoiceType,
    taxType: invoice.taxType,
    purposeType: invoice.purposeType,
    writeDate: invoice.writeDate,
    invoicerParty: {
      corpNum: invoice.invoicerCorpNum,
      corpName: invoice.invoicerCorpName,
      ceoName: invoice.invoicerCeoName,
      addr: invoice.invoicerAddress,
      email: invoice.invoicerEmail || ""
    },
    invoiceeParty: {
      corpNum: invoice.invoiceeCorpNum,
      corpName: invoice.invoiceeCorpName,
      ceoName: invoice.invoiceeCeoName,
      addr: invoice.invoiceeAddress,
      email: invoice.invoiceeEmail || ""
    },
    amountTotal: invoice.amountTotal.toString(),
    taxTotal: invoice.taxTotal.toString(),
    totalAmount: invoice.totalAmount.toString(),
    provider: invoice.provider,
    providerResultCode: invoice.providerResultCode,
    providerMessage: invoice.providerMessage,
    providerStatus: invoice.providerStatus,
    invoiceKey: invoice.invoiceKey,
    approvalNumber: invoice.approvalNumber,
    status: invoice.status,
    issuedAt: invoice.issuedAt?.toISOString() || null,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    items: invoice.items.map((item) => ({
      id: item.id,
      purchaseDate: item.purchaseDate,
      name: item.name,
      information: item.information || "",
      chargeableUnit: item.chargeableUnit,
      unitPrice: item.unitPrice,
      amount: item.amount.toString(),
      tax: item.tax.toString(),
      description: item.description || ""
    }))
  };
}
