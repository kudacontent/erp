import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { GoogleCalendarError, syncGoogleCalendar } from "@/lib/google-calendar";

export const runtime = "nodejs";

export const POST = withAuth(async () => {
  try {
    const result = await syncGoogleCalendar();
    return NextResponse.json({ ok: true, ...result, message: `${result.syncedCount}건의 Google 일정을 동기화했습니다.` });
  } catch (error) {
    if (error instanceof GoogleCalendarError) {
      return NextResponse.json({ ok: false, message: error.message, code: error.code }, { status: error.status });
    }

    return NextResponse.json({ ok: false, message: "Google Calendar 동기화에 실패했습니다." }, { status: 502 });
  }
}, { roles: ["CEO", "ADMIN"], write: true });
