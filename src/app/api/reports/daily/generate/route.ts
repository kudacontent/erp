import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

export const POST = withAuth(async () => {
  return NextResponse.json({
    ok: true,
    message: "Daily management report generation is queued in a later milestone."
  });
}, { roles: ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING", "HR"], write: true });
