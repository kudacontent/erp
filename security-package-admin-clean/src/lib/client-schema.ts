import { z } from "zod";

export const clientTypeOptions = [
  { label: "선사", value: "SHIP_OWNER" },
  { label: "발주처", value: "CLIENT" },
  { label: "협력업체", value: "PARTNER" },
  { label: "공급업체", value: "SUPPLIER" },
  { label: "정비업체", value: "MAINTENANCE" },
  { label: "회계/세무", value: "ACCOUNTING_TAX" },
  { label: "잠재고객", value: "PROSPECT" },
  { label: "기타", value: "OTHER" }
] as const;

export const clientTypeLabels = Object.fromEntries(
  clientTypeOptions.map((option) => [option.value, option.label])
) as Record<(typeof clientTypeOptions)[number]["value"], string>;

const clientTypeValues = clientTypeOptions.map((option) => option.value) as [
  (typeof clientTypeOptions)[number]["value"],
  ...(typeof clientTypeOptions)[number]["value"][]
];

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "거래처명을 입력하세요."),
  clientType: z.enum(clientTypeValues),
  businessNumber: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("이메일 형식이 올바르지 않습니다.").optional().or(z.literal("")),
  address: z.string().trim().optional(),
  memo: z.string().trim().optional(),
  contactName: z.string().trim().min(1, "담당자 이름을 입력하세요."),
  contactPosition: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
  contactEmail: z.string().trim().email("담당자 이메일 형식이 올바르지 않습니다.").optional().or(z.literal(""))
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
