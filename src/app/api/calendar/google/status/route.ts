import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getGoogleCalendarStatus } from "@/lib/google-calendar";

export const runtime = "nodejs";

export const GET = withAuth(async (_request, _context, user) => {
  const status = await getGoogleCalendarStatus();
  return NextResponse.json({
    ok: true,
    ...status,
    canManage: user.role === "CEO" || user.role === "ADMIN"
  });
});
