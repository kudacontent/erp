import { randomBytes } from "node:crypto";

export type TaxInvoicePartyInput = {
  contactId: string;
  corpNum: string;
  mgtNum?: string;
  taxRegId: string;
  corpName: string;
  ceoName: string;
  addr: string;
  bizClass: string;
  bizType: string;
  contactName: string;
  tel: string;
  hp: string;
  email: string;
};

export type TaxInvoiceItemInput = {
  purchaseDate: string;
  name: string;
  information: string;
  chargeableUnit: string;
  unitPrice: string;
  amount: string;
  tax: string;
  description: string;
};

export type TaxInvoiceIssueInput = {
  mgtKey: string;
  invoicerParty: TaxInvoicePartyInput;
  invoiceeParty: TaxInvoicePartyInput;
  issueDirection: number;
  taxInvoiceType: number;
  taxType: number;
  taxCalcType: number;
  purposeType: number;
  writeDate: string;
  cash: string;
  chkBill: string;
  note: string;
  credit: string;
  remark1: string;
  remark2: string;
  remark3: string;
  amountTotal: string;
  taxTotal: string;
  totalAmount: string;
  items: TaxInvoiceItemInput[];
  sendSms: boolean;
  forceIssue: boolean;
  mailTitle: string;
};

export type TaxInvoiceProviderResult = {
  provider: string;
  resultCode: number;
  message: string;
  invoiceKey?: string;
  approvalNumber?: string;
  state?: BarobillTaxInvoiceState;
};

export type BarobillTaxInvoiceState = {
  mgtKey: string;
  invoiceKey: string;
  barobillState: number;
  isOpened: number;
  isConfirmed: number;
  registDate: string;
  writeDate: string;
  preIssueDate: string;
  issueDate: string;
  remark1: string;
  remark2: string;
  ntsSendState: number;
  ntsSendKey: string;
  ntsSendResult: string;
  ntsSendDate: string;
  ntsResultDate: string;
};

export class TaxInvoiceProviderError extends Error {
  resultCode?: number;

  constructor(message: string, resultCode?: number) {
    super(message);
    this.name = "TaxInvoiceProviderError";
    this.resultCode = resultCode;
  }
}

export function createTaxInvoiceMgtKey() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `KUDA${date}${randomBytes(5).toString("hex").toUpperCase()}`.slice(0, 24);
}

export function getTaxInvoiceProvider() {
  return (process.env.TAX_INVOICE_PROVIDER || "mock").trim().toLowerCase();
}

export function getTaxInvoiceSupplierDefaults() {
  return {
    contactId: process.env.BAROBILL_INVOICER_CONTACT_ID || "",
    corpNum: process.env.TAX_INVOICE_SUPPLIER_CORP_NUM || process.env.BAROBILL_CORP_NUM || "",
    taxRegId: process.env.TAX_INVOICE_SUPPLIER_TAX_REG_ID || "",
    corpName: process.env.TAX_INVOICE_SUPPLIER_NAME || "",
    ceoName: process.env.TAX_INVOICE_SUPPLIER_CEO_NAME || "",
    addr: process.env.TAX_INVOICE_SUPPLIER_ADDRESS || "",
    bizClass: process.env.TAX_INVOICE_SUPPLIER_BIZ_CLASS || "",
    bizType: process.env.TAX_INVOICE_SUPPLIER_BIZ_TYPE || "",
    contactName: process.env.TAX_INVOICE_SUPPLIER_CONTACT_NAME || "",
    tel: process.env.TAX_INVOICE_SUPPLIER_TEL || "",
    hp: process.env.TAX_INVOICE_SUPPLIER_HP || "",
    email: process.env.TAX_INVOICE_SUPPLIER_EMAIL || ""
  } satisfies TaxInvoicePartyInput;
}

function escapeXml(value: string | number | boolean) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function element(name: string, value: string | number | boolean | undefined) {
  if (value === undefined) {
    return "";
  }

  return `<${name}>${escapeXml(value)}</${name}>`;
}

function renderParty(name: string, party: TaxInvoicePartyInput) {
  return [
    `<${name}>`,
    element("ContactID", party.contactId),
    element("CorpNum", party.corpNum),
    element("MgtNum", party.mgtNum ?? ""),
    element("CorpName", party.corpName),
    element("TaxRegID", party.taxRegId),
    element("CEOName", party.ceoName),
    element("Addr", party.addr),
    element("BizClass", party.bizClass),
    element("BizType", party.bizType),
    element("ContactName", party.contactName),
    element("TEL", party.tel),
    element("HP", party.hp),
    element("Email", party.email),
    `</${name}>`
  ].join("");
}

function renderLineItem(item: TaxInvoiceItemInput) {
  return [
    "<TaxInvoiceTradeLineItem>",
    element("PurchaseExpiry", item.purchaseDate),
    element("Name", item.name),
    element("Information", item.information),
    element("ChargeableUnit", item.chargeableUnit),
    element("UnitPrice", item.unitPrice),
    element("Amount", item.amount),
    element("Tax", item.tax),
    element("Description", item.description),
    "</TaxInvoiceTradeLineItem>"
  ].join("");
}

function renderInvoice(invoice: TaxInvoiceIssueInput) {
  return [
    "<Invoice>",
    element("InvoiceKey", ""),
    renderParty("InvoicerParty", invoice.invoicerParty),
    renderParty("InvoiceeParty", invoice.invoiceeParty),
    element("IssueDirection", invoice.issueDirection),
    element("TaxInvoiceType", invoice.taxInvoiceType),
    element("TaxType", invoice.taxType),
    element("TaxCalcType", invoice.taxCalcType),
    element("PurposeType", invoice.purposeType),
    element("Cash", invoice.cash),
    element("ChkBill", invoice.chkBill),
    element("Note", invoice.note),
    element("Credit", invoice.credit),
    element("WriteDate", invoice.writeDate),
    element("AmountTotal", invoice.amountTotal),
    element("TaxTotal", invoice.taxTotal),
    element("TotalAmount", invoice.totalAmount),
    element("Remark1", invoice.remark1),
    element("Remark2", invoice.remark2),
    element("Remark3", invoice.remark3),
    "<TaxInvoiceTradeLineItems>",
    invoice.items.map(renderLineItem).join(""),
    "</TaxInvoiceTradeLineItems>",
    "</Invoice>"
  ].join("");
}

function createSoapEnvelope(operation: string, body: string) {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
    "<soap:Body>",
    `<${operation} xmlns="http://ws.baroservice.com/">`,
    body,
    `</${operation}>`,
    "</soap:Body>",
    "</soap:Envelope>"
  ].join("");
}

function extractXmlValue(xml: string, tag: string) {
  const pattern = new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:(?:[A-Za-z_][\\w.-]*):)?${tag}>`, "i");
  const match = xml.match(pattern);

  return match?.[1]
    ?.replaceAll(/<[^>]+>/g, "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&")
    .trim();
}

async function callBarobill(operation: string, body: string) {
  const endpoint = process.env.BAROBILL_API_URL || "https://testws.baroservice.com/TI.asmx";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.BAROBILL_TIMEOUT_MS || 30000));

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: `"http://ws.baroservice.com/${operation}"`
      },
      body: createSoapEnvelope(operation, body),
      signal: controller.signal
    });
    const responseText = await response.text();
    const fault = extractXmlValue(responseText, "faultstring");

    if (!response.ok || fault) {
      throw new TaxInvoiceProviderError(fault || `바로빌 요청이 HTTP ${response.status}로 거부되었습니다.`);
    }

    return responseText;
  } finally {
    clearTimeout(timeout);
  }
}

function getBarobillCredentials() {
  const certKey = process.env.BAROBILL_CERT_KEY?.trim();
  const corpNum = (process.env.BAROBILL_CORP_NUM || process.env.TAX_INVOICE_SUPPLIER_CORP_NUM || "").replace(/[^0-9]/g, "");

  if (!certKey || !corpNum) {
    throw new TaxInvoiceProviderError("바로빌 연동인증키와 공급자 사업자번호를 NAS .env에 설정해야 합니다.");
  }

  return { certKey, corpNum };
}

export async function issueTaxInvoiceWithProvider(invoice: TaxInvoiceIssueInput): Promise<TaxInvoiceProviderResult> {
  const provider = getTaxInvoiceProvider();

  if (provider === "mock") {
    return {
      provider,
      resultCode: 1,
      message: "로컬 테스트 발급이 완료되었습니다.",
      approvalNumber: `TEST-${invoice.writeDate}-${randomBytes(4).toString("hex").toUpperCase()}`
    };
  }

  if (provider !== "barobill") {
    throw new TaxInvoiceProviderError(`${provider} 세금계산서 제공자는 지원하지 않습니다.`);
  }

  const { certKey, corpNum } = getBarobillCredentials();
  const responseText = await callBarobill(
    "RegistAndIssueTaxInvoice",
    [
      element("CERTKEY", certKey),
      element("CorpNum", corpNum),
      renderInvoice(invoice),
      element("SendSMS", invoice.sendSms),
      element("ForceIssue", invoice.forceIssue),
      element("MailTitle", invoice.mailTitle)
    ].join("")
  );
  const resultCode = Number(extractXmlValue(responseText, "RegistAndIssueTaxInvoiceResult"));

  if (!Number.isFinite(resultCode)) {
    throw new TaxInvoiceProviderError("바로빌 응답에서 발급 결과 코드를 확인하지 못했습니다.");
  }

  if (resultCode !== 1) {
    throw new TaxInvoiceProviderError(`바로빌 세금계산서 발급이 실패했습니다. 오류코드: ${resultCode}`, resultCode);
  }

  return {
    provider,
    resultCode,
    message: "바로빌 테스트 발급 요청이 접수되었습니다. 국세청 승인번호는 상태 조회 후 표시됩니다."
  };
}

export async function getBarobillTaxInvoiceState(mgtKey: string): Promise<BarobillTaxInvoiceState> {
  const { certKey, corpNum } = getBarobillCredentials();
  const responseText = await callBarobill(
    "GetTaxInvoiceStateEX",
    [element("CERTKEY", certKey), element("CorpNum", corpNum), element("MgtKey", mgtKey)].join("")
  );
  const resultBlock = extractXmlValue(responseText, "GetTaxInvoiceStateEXResult") || "";
  const get = (tag: string) => extractXmlValue(resultBlock, tag) || "";
  const barobillState = Number(get("BarobillState"));
  const ntsSendState = Number(get("NTSSendState"));

  if (!Number.isFinite(barobillState) || !Number.isFinite(ntsSendState)) {
    throw new TaxInvoiceProviderError("바로빌 상태 응답을 해석하지 못했습니다.");
  }

  return {
    mgtKey: get("MgtKey"),
    invoiceKey: get("InvoiceKey"),
    barobillState,
    isOpened: Number(get("IsOpened")) || 0,
    isConfirmed: Number(get("IsConfirmed")) || 0,
    registDate: get("RegistDT"),
    writeDate: get("WriteDate"),
    preIssueDate: get("PreIssueDT"),
    issueDate: get("IssueDT"),
    remark1: get("Remark1"),
    remark2: get("Remark2"),
    ntsSendState,
    ntsSendKey: get("NTSSendKey"),
    ntsSendResult: get("NTSSendResult"),
    ntsSendDate: get("NTSSendDT"),
    ntsResultDate: get("NTSResultDT")
  };
}
