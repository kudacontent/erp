import { z } from "zod";

/** 견적서에서 쓰는 세금 구분 */
export const estimateItemSchema = z.object({
  section: z.string().trim().max(100).optional().nullable(),
  name: z.string().trim().min(1, "품명을 입력하세요.").max(200),
  spec: z.string().trim().max(200).optional().nullable(),
  unit: z.string().trim().max(20).optional().nullable(),
  quantity: z.coerce.number().min(0).max(1_000_000),
  unitPrice: z.coerce.number().min(0).max(1_000_000_000_000),
  taxType: z.enum(["TAXABLE", "ZERO_RATED", "EXEMPT"]).default("TAXABLE"),
  memo: z.string().trim().max(500).optional().nullable()
});

export const estimateSchema = z.object({
  title: z.string().trim().min(1, "견적 제목을 입력하세요.").max(200),
  clientId: z.string().trim().min(1).optional().nullable(),
  recipient: z.string().trim().max(200).optional().nullable(),
  reference: z.string().trim().max(200).optional().nullable(),
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]).optional(),
  issuedAt: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  validityNote: z.string().trim().max(200).optional().nullable(),
  otherContent: z.string().trim().max(4000).optional().nullable(),
  supplierNumber: z.string().trim().max(50).optional().nullable(),
  supplierName: z.string().trim().max(200).optional().nullable(),
  supplierRepresentative: z.string().trim().max(100).optional().nullable(),
  supplierAddress: z.string().trim().max(300).optional().nullable(),
  supplierPhone: z.string().trim().max(50).optional().nullable(),
  supplierEmail: z.string().trim().max(200).optional().nullable(),
  memo: z.string().trim().max(4000).optional().nullable(),
  items: z.array(estimateItemSchema).max(300, "품목은 300개까지 저장할 수 있습니다.").default([])
});

export type EstimateInput = z.infer<typeof estimateSchema>;
export type EstimateItemInput = z.infer<typeof estimateItemSchema>;

export function parseDate(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * 공급가액 = 수량 × 단가. 부가세는 과세 품목만 10%.
 * 화면에서도 같은 계산을 보여 주지만, 저장되는 값은 항상 서버가 다시 계산한다.
 */
export function computeItemAmounts(item: EstimateItemInput) {
  const supply = Math.round(item.quantity * item.unitPrice);
  const vat = item.taxType === "TAXABLE" ? Math.round(supply / 10) : 0;
  return { supply: BigInt(supply), vat: BigInt(vat) };
}

export function buildItemRows(items: EstimateItemInput[]) {
  return items.map((item, index) => {
    const { supply, vat } = computeItemAmounts(item);
    return {
      section: item.section?.trim() || null,
      sortOrder: index,
      name: item.name,
      spec: item.spec?.trim() || null,
      unit: item.unit?.trim() || null,
      quantity: item.quantity,
      unitPrice: BigInt(Math.round(item.unitPrice)),
      supplyAmount: supply,
      vatAmount: vat,
      taxType: item.taxType,
      memo: item.memo?.trim() || null
    };
  });
}

export function sumRows(rows: Array<{ supplyAmount: bigint; vatAmount: bigint }>) {
  const supplyAmount = rows.reduce((sum, row) => sum + row.supplyAmount, BigInt(0));
  const vatAmount = rows.reduce((sum, row) => sum + row.vatAmount, BigInt(0));
  return { supplyAmount, vatAmount, totalAmount: supplyAmount + vatAmount };
}

/** 견적번호: Q-20260831-01 */
export function buildEstimateNo(date: Date, sequence: number) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `Q-${year}${month}${day}-${String(sequence).padStart(2, "0")}`;
}
