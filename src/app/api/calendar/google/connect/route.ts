import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import {
  buildGoogleAuthorizationUrl,
  createGoogleOAuthState,
  googleCalendarStateCookieName,
  googleOAuthStateCookieOptions
} from "@/lib/google-calendar";

export const runtime = "nodejs";

export const GET = withAuth(async () => {
  const state = createGoogleOAuthState();
  const response = NextResponse.redirect(buildGoogleAuthorizationUrl(state));
  response.cookies.set(googleCalendarStateCookieName, state, googleOAuthStateCookieOptions());
  return response;
}, { roles: ["CEO", "ADMIN"] });
