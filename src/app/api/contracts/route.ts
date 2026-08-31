import { NextResponse } from "next/server";
import { z } from "zod";
import { createContract, getContractsForList } from "@/lib/contracts-service";
import { FINANCE_READ_ROLES, withAuth } from "@/lib/auth";

export const runtime = "nodejs";

const createContractSchema = z.object({
  clientName: z.string().min(1, "거래처를 선택하세요."),
  projectTitle: z.string().min(1, "계약명을 입력하세요."),
  supplyAmount: z.coerce.number().nonnegative("공급가액을 확인하세요."),
  vatAmount: z.coerce.number().nonnegative("부가세를 확인하세요."),
  dueDate: z.string().optional(),
  memo: z.string().optional()
});

export const GET = withAuth(async () => {
  const contracts = await getContractsForList();

  return NextResponse.json({ ok: true, contracts });
}, { roles: [...FINANCE_READ_ROLES] });

export const POST = withAuth(async (request) => {
  const body = await request.json();
  const parsed = createContractSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        errors: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  try {
    const contract = await createContract(parsed.data);
    return NextResponse.json({ ok: true, contract });
  } catch (error) {
    if (error instanceof Error && error.message === "CLIENT_NOT_FOUND") {
      return NextResponse.json({ ok: false, message: "선택한 거래처를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ ok: false, message: "계약을 저장하지 못했습니다." }, { status: 503 });
  }
}, { roles: ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING"], write: true });
