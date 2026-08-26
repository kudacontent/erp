import { NextResponse } from "next/server";
import { advanceContractStatus } from "@/lib/contracts-service";
import { withAuth } from "@/lib/auth";

export const runtime = "nodejs";

export const POST = withAuth(async (_request, { params }) => {
  if (!params) {
    return NextResponse.json({ ok: false, message: "계약 식별자가 없습니다." }, { status: 400 });
  }

  const { slug } = await params;
  const contract = await advanceContractStatus(slug);

  if (!contract) {
    return NextResponse.json(
      {
        ok: false,
        message: "계약을 찾을 수 없습니다."
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, contract });
}, { roles: ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING"], write: true });
