import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  connectGoogleCalendar,
  googleCalendarStateCookieName,
  googleOAuthStateCookieOptions,
  isValidGoogleOAuthState,
  syncGoogleCalendar
} from "@/lib/google-calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToCalendar(request: Request, result: string, code?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.url;
  const url = new URL("/calendar", baseUrl);
  url.searchParams.set("google", result);
  if (code) {
    url.searchParams.set("code", code);
  }

  const response = NextResponse.redirect(url);
  response.cookies.set(googleCalendarStateCookieName, "", { ...googleOAuthStateCookieOptions(), maxAge: 0 });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    const loginUrl = new URL("/login", process.env.NEXT_PUBLIC_APP_URL?.trim() || request.url);
    loginUrl.searchParams.set("next", "/calendar");
    return NextResponse.redirect(loginUrl);
  }

  if (currentUser.role !== "CEO" && currentUser.role !== "ADMIN") {
    return redirectToCalendar(request, "error", "google_permission_denied");
  }

  if (url.searchParams.get("error")) {
    return redirectToCalendar(request, "error", "google_consent_denied");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(googleCalendarStateCookieName)?.value;

  if (!code || !isValidGoogleOAuthState(expectedState, state)) {
    return redirectToCalendar(request, "error", "google_state_invalid");
  }

  try {
    await connectGoogleCalendar(code);
    await syncGoogleCalendar();
    return redirectToCalendar(request, "connected");
  } catch (error) {
    const errorCode = error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code
      : "google_connection_failed";
    return redirectToCalendar(request, "error", errorCode);
  }
}
