import { prisma } from "@/lib/prisma";
import { formatWon } from "@/lib/money";

/**
 * 대시보드에 실제 DB 집계를 공급한다.
 *
 * 이전 dashboard-data.ts 는 숫자가 "0" 으로 박혀 있고 배열이 비어 있어서
 * 데이터가 아무리 쌓여도 화면이 바뀌지 않았다.
 *
 * 화면의 목적을 "현황판"에서 "오늘 할 일"로 바꿨다.
 * 숫자를 나열하는 대신, 사람이 손을 대야 하는 건을 먼저 보여준다.
 */

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

function seoulToday() {
  const now = new Date();
  const seoul = new Date(now.getTime() + SEOUL_OFFSET_MS);
  const start = new Date(Date.UTC(seoul.getUTCFullYear(), seoul.getUTCMonth(), seoul.getUTCDate()) - SEOUL_OFFSET_MS);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function seoulMonthStart() {
  const now = new Date();
  const seoul = new Date(now.getTime() + SEOUL_OFFSET_MS);
  return new Date(Date.UTC(seoul.getUTCFullYear(), seoul.getUTCMonth(), 1) - SEOUL_OFFSET_MS);
}

function formatDate(date: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit" }).format(date);
}

function formatTime(date: Date, isAllDay: boolean) {
  if (isAllDay) return "종일";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export type DashboardStat = { label: string; value: string; sub: string; href: string };
export type ActionItemRow = { id: string; title: string; detail: string; amount: string; href: string; tone: string };
export type ScheduleRow = { id: string; time: string; title: string; category: string };

export type DashboardData = {
  stats: DashboardStat[];
  pendingApprovals: ActionItemRow[];
  overdueContracts: ActionItemRow[];
  pendingInvoices: ActionItemRow[];
  todaySchedule: ScheduleRow[];
  monthRevenue: string;
  hasDatabase: boolean;
};

const EMPTY: DashboardData = {
  stats: [],
  pendingApprovals: [],
  overdueContracts: [],
  pendingInvoices: [],
  todaySchedule: [],
  monthRevenue: "-",
  hasDatabase: false
};

export async function getDashboardData(): Promise<DashboardData> {
  if (!process.env.DATABASE_URL) {
    return EMPTY;
  }

  try {
    const { start: todayStart, end: todayEnd } = seoulToday();
    const monthStart = seoulMonthStart();
    const now = new Date();

    const [
      clientCount,
      activeContractCount,
      pendingApprovalCount,
      pendingInvoiceCount,
      approvals,
      overdue,
      invoices,
      events,
      paidThisMonth
    ] = await Promise.all([
      prisma.client.count({ where: { status: "ACTIVE" } }),
      prisma.projectContract.count({ where: { contractStatus: { notIn: ["CLOSED", "CANCELED"] } } }),
      prisma.expense.count({ where: { approvalStatus: "REQUESTED" } }),
      prisma.projectContract.count({ where: { billingStatus: "PENDING", contractStatus: { not: "CANCELED" } } }),

      // 내가 결재해야 할 지출
      prisma.expense.findMany({
        where: { approvalStatus: "REQUESTED" },
        include: { client: { select: { name: true } } },
        orderBy: { spentAt: "asc" },
        take: 5
      }),

      // 입금 예정일이 지났는데 아직 입금되지 않은 계약
      prisma.projectContract.findMany({
        where: {
          paymentStatus: { not: "PAID" },
          dueDate: { lt: now },
          contractStatus: { notIn: ["CLOSED", "CANCELED"] }
        },
        include: { client: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
        take: 5
      }),

      // 세금계산서를 아직 발행하지 않은 계약
      prisma.projectContract.findMany({
        where: { billingStatus: "PENDING", contractStatus: { not: "CANCELED" } },
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5
      }),

      // 오늘 일정 (오늘을 지나가는 일정 포함)
      prisma.calendarEvent.findMany({
        where: { startTime: { lt: todayEnd }, endTime: { gt: todayStart } },
        orderBy: { startTime: "asc" },
        take: 6
      }),

      prisma.projectContract.aggregate({
        where: { paymentStatus: "PAID", updatedAt: { gte: monthStart } },
        _sum: { totalAmount: true }
      })
    ]);

    const stats: DashboardStat[] = [
      { label: "거래처", value: `${clientCount}`, sub: "활성", href: "/clients" },
      { label: "진행 계약", value: `${activeContractCount}`, sub: "종료·취소 제외", href: "/contracts" },
      { label: "승인 대기 지출", value: `${pendingApprovalCount}`, sub: "결재 필요", href: "/expenses" },
      { label: "발행 대기", value: `${pendingInvoiceCount}`, sub: "세금계산서", href: "/tax-invoices" }
    ];

    return {
      stats,
      monthRevenue: formatWon(paidThisMonth._sum.totalAmount ?? BigInt(0)),
      hasDatabase: true,

      pendingApprovals: approvals.map((expense) => ({
        id: expense.id,
        title: expense.expenseCategory,
        detail: `${expense.client?.name ?? "거래처 미지정"} · ${formatDate(expense.spentAt)}`,
        amount: formatWon(expense.totalAmount),
        href: `/expenses/${expense.id}`,
        tone: "승인 대기"
      })),

      overdueContracts: overdue.map((contract) => ({
        id: contract.id,
        title: contract.projectTitle,
        detail: `${contract.client?.name ?? "-"} · 예정일 ${formatDate(contract.dueDate)}`,
        amount: formatWon(contract.totalAmount),
        href: `/contracts/${contract.id}`,
        tone: "지연"
      })),

      pendingInvoices: invoices.map((contract) => ({
        id: contract.id,
        title: contract.projectTitle,
        detail: contract.client?.name ?? "-",
        amount: formatWon(contract.totalAmount),
        href: `/contracts/${contract.id}`,
        tone: "발행 대기"
      })),

      todaySchedule: events.map((event) => ({
        id: event.id,
        time: formatTime(event.startTime, event.isAllDay),
        title: event.title,
        category: event.category
      }))
    };
  } catch {
    return EMPTY;
  }
}
