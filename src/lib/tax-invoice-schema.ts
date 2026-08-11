import { z } from "zod";

const optionalText = (max = 300) => z.string().trim().max(max).optional().default("");
const moneyText = z.string().regex(/^\d+$/, "금액은 숫자만 입력하세요.");

const partySchema = z.object({
  contactId: optionalText(20),
  corpNum: z.string().trim().min(1, "사업자등록번호를 입력하세요."),
  taxRegId: optionalText(4),
  corpName: z.string().trim().min(1, "상호를 입력하세요.").max(200),
  ceoName: z.string().trim().min(1, "대표자명을 입력하세요.").max(100),
  addr: z.string().trim().min(1, "주소를 입력하세요.").max(300),
  bizClass: optionalText(100),
  bizType: optionalText(100),
  contactName: optionalText(100),
  tel: optionalText(20),
  hp: optionalText(20),
  email: z.string().trim().email("이메일 형식을 확인하세요.").or(z.literal("")).default("")
});

const itemSchema = z.object({
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "품목 일자를 확인하세요."),
  name: z.string().trim().min(1, "품목명을 입력하세요.").max(100),
  information: optionalText(100),
  chargeableUnit: z.string().trim().regex(/^\d+(\.\d+)?$/, "수량을 확인하세요."),
  unitPrice: z.string().trim().regex(/^\d+(\.\d+)?$/, "단가를 확인하세요."),
  amount: moneyText,
  tax: moneyText,
  description: optionalText(200)
});

export const taxInvoiceFormSchema = z.object({
  action: z.enum(["draft", "issue"]),
  clientId: z.string().uuid().or(z.literal("")).default(""),
  contractId: z.string().uuid().or(z.literal("")).default(""),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "작성일자를 확인하세요."),
  purposeType: z.coerce.number().int().min(1).max(2),
  taxType: z.coerce.number().int().min(1).max(3),
  invoicerParty: partySchema,
  invoiceeParty: partySchema,
  cash: optionalText(18),
  chkBill: optionalText(18),
  note: optionalText(18),
  credit: optionalText(18),
  remark1: optionalText(200),
  remark2: optionalText(200),
  remark3: optionalText(200),
  amountTotal: moneyText,
  taxTotal: moneyText,
  totalAmount: moneyText,
  items: z.array(itemSchema).min(1, "품목을 한 개 이상 입력하세요.").max(100),
  sendSms: z.boolean().default(false),
  forceIssue: z.boolean().default(false),
  mailTitle: optionalText(200)
});

export type TaxInvoiceFormInput = z.infer<typeof taxInvoiceFormSchema>;

export function normalizeCorpNum(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export function toWriteDate(value: string) {
  return value.replaceAll("-", "");
}

export function toBarobillDate(value: string) {
  return value.replaceAll("-", "");
}
