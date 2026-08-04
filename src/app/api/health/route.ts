import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "kudalabs-erp",
    timestamp: new Date().toISOString()
  });
}
