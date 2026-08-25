import { prisma } from "@/lib/prisma";

export type DailyReportPayload = {
  stats: Array<{ label: string; value: string }>;
  briefingSections: Array<{ title: string; body: string }>;
  riskItems: Array<{ title: string; level: string; detail: string }>;
  recommendedActions: Array<{ title: string; owner: string; due: string }>;
  sourceItems: Array<{ type: string; title: string; count: string }>;
};

function seoulDayStart(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return new Date(Date.UTC(values.year, values.month - 1, values.day) - 9 * 60 * 60 * 1000);
}

function serializeCount(value: number) {
  return `${value}건`;
}

export function emptyDailyReport(): DailyReportPayload {
  return { stats: [{ label: "오늘 일정", value: "0건" }, { label: "회의 결정", value: "0건" }, { label: "미완료 조치", value: "0건" }, { label: "확인 필요", value: "0건" }], briefingSections: [], riskItems: [], recommendedActions: [], sourceItems: [] };
}

export async function generateDailyReport(date = new Date()) {
  const reportDate = seoulDayStart(date);
  const nextDate = new Date(reportDate.getTime() + 24 * 60 * 60 * 1000);
  const [events, meetings, actionItems, pendingExpenses, pendingContracts, pendingTaxInvoices] = await Promise.all([
    prisma.calendarEvent.findMany({ where: { startTime: { gte: reportDate, lt: nextDate } }, orderBy: { startTime: "asc" }, take: 100 }),
    prisma.meeting.findMany({ where: { startedAt: { gte: reportDate, lt: nextDate } }, orderBy: { startedAt: "asc" }, take: 100 }),
    prisma.actionItem.count({ where: { status: { not: "DONE" } } }),
    prisma.expense.count({ where: { approvalStatus: { in: ["DRAFT", "REQUESTED"] } } }),
    prisma.projectContract.count({ where: { paymentStatus: { in: ["UNPAID", "PARTIAL"] } } }),
    prisma.taxInvoice.count({ where: { status: { in: ["DRAFT", "ISSUING", "FAILED"] } } })
  ]);

  const payload: DailyReportPayload = {
    stats: [
      { label: "오늘 일정", value: serializeCount(events.length) },
      { label: "회의 결정", value: serializeCount(meetings.filter((meeting) => Boolean(meeting.minutes)).length) },
      { label: "미완료 조치", value: serializeCount(actionItems) },
      { label: "확인 필요", value: serializeCount(pendingExpenses + pendingTaxInvoices) }
    ],
    briefingSections: [
      { title: "오늘 일정", body: events.length ? events.map((event) => `${event.title} (${event.category})`).join(" · ") : "오늘 등록된 일정이 없습니다." },
      { title: "회의록", body: meetings.length ? meetings.map((meeting) => `${meeting.title}: ${meeting.minutes ? "회의록 작성 완료" : "회의록 작성 필요"}`).join(" · ") : "오늘 등록된 회의가 없습니다." },
      { title: "운영 상태", body: `미입금 계약 ${pendingContracts}건, 승인 대기 지출 ${pendingExpenses}건, 세금계산서 확인 필요 ${pendingTaxInvoices}건입니다.` }
    ],
    riskItems: [
      ...(pendingContracts ? [{ title: "미입금 계약", level: "높음", detail: `${pendingContracts}건의 계약이 아직 입금 완료되지 않았습니다.` }] : []),
      ...(pendingExpenses ? [{ title: "승인 대기 지출", level: "확인", detail: `${pendingExpenses}건의 지출이 승인 대기 중입니다.` }] : []),
      ...(pendingTaxInvoices ? [{ title: "세금계산서 확인 필요", level: "확인", detail: `${pendingTaxInvoices}건의 세금계산서가 발행 또는 오류 상태입니다.` }] : [])
    ],
    recommendedActions: [
      ...(pendingContracts ? [{ title: "미입금 계약을 확인하세요.", owner: "운영", due: "오늘" }] : []),
      ...(pendingExpenses ? [{ title: "지출 증빙을 검수하고 승인하세요.", owner: "회계", due: "오늘" }] : []),
      ...(actionItems ? [{ title: "회의 후속 조치의 담당자와 기한을 확인하세요.", owner: "담당자", due: "이번 주" }] : [])
    ],
    sourceItems: [
      { type: "캘린더", title: "오늘 일정", count: serializeCount(events.length) },
      { type: "회의", title: "오늘 회의", count: serializeCount(meetings.length) },
      { type: "지출", title: "승인 대기", count: serializeCount(pendingExpenses) },
      { type: "계약", title: "미입금 계약", count: serializeCount(pendingContracts) }
    ]
  };

  const briefing = payload.briefingSections.map((section) => `${section.title}: ${section.body}`).join("\n");
  return prisma.dailyManagementReport.upsert({
    where: { reportDate },
    update: { geminiBriefing: briefing, sourceSnapshot: payload, isRead: false },
    create: { reportDate, geminiBriefing: briefing, sourceSnapshot: payload, isRead: false }
  });
}

export function parseDailyReportSnapshot(value: unknown): DailyReportPayload {
  if (!value || typeof value !== "object") return emptyDailyReport();
  const snapshot = value as Partial<DailyReportPayload>;
  return {
    stats: Array.isArray(snapshot.stats) ? snapshot.stats as DailyReportPayload["stats"] : emptyDailyReport().stats,
    briefingSections: Array.isArray(snapshot.briefingSections) ? snapshot.briefingSections as DailyReportPayload["briefingSections"] : [],
    riskItems: Array.isArray(snapshot.riskItems) ? snapshot.riskItems as DailyReportPayload["riskItems"] : [],
    recommendedActions: Array.isArray(snapshot.recommendedActions) ? snapshot.recommendedActions as DailyReportPayload["recommendedActions"] : [],
    sourceItems: Array.isArray(snapshot.sourceItems) ? snapshot.sourceItems as DailyReportPayload["sourceItems"] : []
  };
}
