import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, FileImage, ReceiptText, UserRound } from "lucide-react";
import { ExpenseApprovalPanel } from "@/components/expense-approval-panel";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusLabels = {
  DRAFT: "검토 필요",
  REQUESTED: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "반려",
  PAID: "지급 완료"
} as const;

function formatMoney(value: bigint | number) {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(value);
}

function parseAnalysis(value: string | null) {
  if (!value) {
    return {} as Record<string, unknown>;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function analysisText(analysis: Record<string, unknown>, key: string) {
  const value = analysis[key];
  return typeof value === "string" ? value : "";
}

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { client: true, createdBy: true, approvedBy: true }
  });

  if (!expense) {
    notFound();
  }

  const analysis = parseAnalysis(expense.geminiAnalysis);
  const merchantName = analysisText(analysis, "merchantName") || expense.client?.name || "거래처 미지정";
  const cardLast4 = analysisText(analysis, "cardLast4");
  const approvalNumber = analysisText(analysis, "approvalNumber");
  const confidence = typeof analysis.confidence === "number" ? Math.round(analysis.confidence * 100) : null;

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/expenses" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-marine">
            <ArrowLeft className="h-4 w-4" />
            지출 목록
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-marine">
              <ReceiptText className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-3xl font-bold text-ink">{merchantName}</h2>
              <p className="mt-1 text-sm text-steel">{expense.expenseCategory} · {statusLabels[expense.approvalStatus]}</p>
            </div>
          </div>
        </div>
        <div className="rounded-md border border-line bg-white px-4 py-3 text-right">
          <p className="text-xs text-steel">지출 합계</p>
          <p className="mt-1 text-xl font-bold text-ink">{formatMoney(expense.totalAmount)}</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="rounded-md border border-line bg-white p-5">
            <div className="mb-5 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-marine" />
              <h3 className="font-bold text-ink">지출 정보</h3>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div><dt className="text-xs text-steel">지출일</dt><dd className="mt-1 font-medium text-ink">{formatDate(expense.spentAt)}</dd></div>
              <div><dt className="text-xs text-steel">카테고리</dt><dd className="mt-1 font-medium text-ink">{expense.expenseCategory}</dd></div>
              <div><dt className="text-xs text-steel">결제수단</dt><dd className="mt-1 font-medium text-ink">{expense.paymentMethod}</dd></div>
              <div><dt className="text-xs text-steel">카드 승인번호</dt><dd className="mt-1 font-medium text-ink">{approvalNumber || "-"}</dd></div>
              <div><dt className="text-xs text-steel">공급가액</dt><dd className="mt-1 font-medium text-ink">{formatMoney(expense.amount)}</dd></div>
              <div><dt className="text-xs text-steel">부가세</dt><dd className="mt-1 font-medium text-ink">{formatMoney(expense.vatAmount)}</dd></div>
              <div><dt className="text-xs text-steel">카드 끝 4자리</dt><dd className="mt-1 font-medium text-ink">{cardLast4 || "-"}</dd></div>
              <div><dt className="text-xs text-steel">OCR 신뢰도</dt><dd className="mt-1 font-medium text-ink">{confidence === null ? "-" : `${confidence}%`}</dd></div>
            </dl>
          </section>

          <section className="rounded-md border border-line bg-white p-5">
            <div className="mb-5 flex items-center gap-2">
              <UserRound className="h-5 w-5 text-marine" />
              <h3 className="font-bold text-ink">처리 기록</h3>
            </div>
            <div className="space-y-3 text-sm">
              <p className="flex justify-between gap-3"><span className="text-steel">작성자</span><span className="font-medium text-ink">{expense.createdBy?.name || "-"}</span></p>
              <p className="flex justify-between gap-3"><span className="text-steel">승인자</span><span className="font-medium text-ink">{expense.approvedBy?.name || "처리 전"}</span></p>
              <p className="flex justify-between gap-3"><span className="text-steel">등록일</span><span className="font-medium text-ink">{formatDate(expense.createdAt)}</span></p>
              <p className="flex justify-between gap-3"><span className="text-steel">최종 수정</span><span className="font-medium text-ink">{formatDate(expense.updatedAt)}</span></p>
            </div>
          </section>

          {expense.receiptImageUrl ? (
            <section className="rounded-md border border-line bg-white p-5">
              <div className="mb-5 flex items-center gap-2">
                <FileImage className="h-5 w-5 text-marine" />
                <h3 className="font-bold text-ink">영수증 증빙</h3>
              </div>
              <div className="overflow-hidden rounded-md border border-line bg-paper p-3">
                <Image src={expense.receiptImageUrl} alt={`${merchantName} 영수증`} width={900} height={1200} unoptimized className="mx-auto max-h-[720px] w-auto max-w-full object-contain" />
              </div>
              <a href={expense.receiptImageUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-medium text-marine hover:underline">
                영수증 원본 열기
              </a>
            </section>
          ) : (
            <section className="rounded-md border border-line bg-paper px-5 py-8 text-center text-sm text-steel">등록된 영수증 증빙이 없습니다.</section>
          )}
        </div>

        <aside className="space-y-4">
          <ExpenseApprovalPanel expenseId={expense.id} initialStatus={expense.approvalStatus} role={user.role} />
          <section className="rounded-md border border-line bg-white p-5">
            <h3 className="font-bold text-ink">처리 순서</h3>
            <ol className="mt-4 space-y-3 text-sm">
              {[
                ["1", "검토 완료", "영수증과 금액을 확인"],
                ["2", "승인 요청", "승인 대기열로 이동"],
                ["3", "승인 완료", "권한자가 결재"],
                ["4", "지급 완료", "회계가 지급·정산 처리"]
              ].map(([number, title, detail]) => (
                <li key={number} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper text-xs font-bold text-marine">{number}</span>
                  <div><p className="font-medium text-ink">{title}</p><p className="mt-0.5 text-xs text-steel">{detail}</p></div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </section>
    </main>
  );
}
