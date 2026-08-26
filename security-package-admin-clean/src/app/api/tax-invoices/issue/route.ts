import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const issueTaxInvoiceSchema = z.object({
  contractId: z.string().min(1),
  clientName: z.string().min(1),
  itemName: z.string().min(1),
  supplyAmount: z.string().min(1),
  vatAmount: z.string().min(1),
  totalAmount: z.string().min(1),
  dueDate: z.string().min(1)
});

function createMockApprovalNumber() {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Math.random().toString(36).slice(2, 10).toUpperCase();

  return `TEST-${ymd}-${suffix}`;
}

export const POST = withAuth(async (request) => {
  const provider = process.env.TAX_INVOICE_PROVIDER || "mock";
  const parsed = issueTaxInvoiceSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "세금계산서 발행 요청 정보가 올바르지 않습니다.",
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  if (provider !== "mock") {
    return NextResponse.json(
      {
        ok: false,
        message: `${provider} 연동 정보가 아직 설정되지 않았습니다. 현재 로컬에서는 mock 모드로 테스트할 수 있습니다.`
      },
      { status: 501 }
    );
  }

  return NextResponse.json({
    ok: true,
    result: {
      provider,
      status: "테스트 발행 완료",
      approvalNumber: createMockApprovalNumber(),
      requestId: `LOCAL-${Date.now()}`,
      issuedAt: new Date().toISOString(),
      payload: parsed.data
    }
  });
}, { roles: ["CEO", "ADMIN", "ACCOUNTING"], write: true });
