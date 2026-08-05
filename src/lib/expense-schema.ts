import { z } from "zod";

const money = z.coerce.number().int().min(0).max(9_999_999_999_999);

export const createExpenseSchema = z.object({
  clientId: z.string().uuid().optional().nullable(),
  expenseCategory: z.string().trim().min(1).max(120),
  amount: money,
  vatAmount: money,
  totalAmount: money,
  paymentMethod: z.string().trim().min(1).max(40),
  spentAt: z.string().trim().min(1),
  receiptImageUrl: z.string().trim().max(500).optional().nullable(),
  receiptFileName: z.string().trim().max(255).optional().nullable(),
  receiptMimeType: z.string().trim().max(120).optional().nullable(),
  geminiAnalysis: z.string().max(50_000).optional().nullable()
}).superRefine((value, context) => {
  const spentAt = new Date(value.spentAt);

  if (Number.isNaN(spentAt.getTime())) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["spentAt"], message: "지출일이 올바르지 않습니다." });
  }

  if (value.totalAmount < value.amount) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["totalAmount"], message: "합계 금액을 확인하세요." });
  }
});
