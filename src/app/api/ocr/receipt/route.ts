import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

export const POST = withAuth(async () => {
  return NextResponse.json({
    ok: true,
    message: "Receipt OCR request received."
  });
}, { roles: ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING"], write: true });
