import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { generateDailyReport } from "@/lib/daily-report-service";

export const POST = withAuth(async () => {
  const report = await generateDailyReport();
  return NextResponse.json({ ok: true, report: { id: report.id, reportDate: report.reportDate.toISOString() }, message: "오늘 보고서를 생성했습니다." });
}, { roles: ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING", "HR"], write: true });
