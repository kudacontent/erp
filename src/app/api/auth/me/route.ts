import { NextResponse } from "next/server";
import { getCurrentUser, withAuth } from "@/lib/auth";

export const runtime = "nodejs";

export const GET = withAuth(async () => {
  const user = await getCurrentUser();

  return NextResponse.json({ ok: true, user });
});
