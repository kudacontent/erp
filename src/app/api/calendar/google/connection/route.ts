import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { disconnectGoogleCalendar } from "@/lib/google-calendar";

export const runtime = "nodejs";

export const DELETE = withAuth(async () => {
  await disconnectGoogleCalendar();
  return NextResponse.json({ ok: true, message: "Google Calendar 연결을 해제했습니다." });
}, { roles: ["CEO", "ADMIN"], write: true });
