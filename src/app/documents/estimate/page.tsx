import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FilePlus2, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { getEstimatesForList } from "@/lib/estimates-service";

// 견적서는 등록 즉시 목록에 보여야 한다.
// 이 선언이 없으면 빌드 시점 스냅샷이 굳어 새 견적이 나타나지 않는다.
export const dynamic = "force-dynamic";

const FINANCE_READ = ["CEO", "ADMIN", "ACCOUNTING", "OPERATIONS", "AUDITOR"];
const FINANCE_WRITE = ["CEO", "ADMIN", "ACCOUNTING", "OPERATIONS"];

export default async function EstimateListPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/documents/estimate");
  }

  if (!FINANCE_READ.includes(user.role)) {
    redirect("/");
  }

  const estimates = await getEstimatesForList();
  const canWrite = FINANCE_WRITE.includes(user.role);

  const open = estimates.filter((estimate) => estimate.status === "DRAFT" || estimate.status === "SENT").length;
  const won = estimates.filter((estimate) => estimate.status === "ACCEPTED" || estimate.status === "CONVERTED").length;

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/contracts" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-marine">
            <ArrowLeft className="h-4 w-4" />
            계약 및 매출
          </Link>
          <div className="flex items-center gap-3">
            <FileText className="h-7 w-7 text-marine" />
            <h2 className="text-3xl font-bold text-ink">견적서</h2>
          </div>
          <p className="mt-2 text-sm text-steel">
            작성한 견적서가 여기에 쌓입니다. 수주가 확정되면 견적 내용을 그대로 계약으로 넘길 수 있습니다.
          </p>
        </div>

        {canWrite ? (
          <Link
            href="/documents/estimate/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-marine px-4 py-2.5 text-sm font-bold text-white"
          >
            <FilePlus2 className="h-4 w-4" />
            새 견적서
          </Link>
        ) : null}
      </section>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-line bg-white p-5">
          <p className="text-sm text-steel">전체 견적</p>
          <p className="mt-3 text-2xl font-bold text-ink">{estimates.length}건</p>
        </div>
        <div className="rounded-md border border-line bg-white p-5">
          <p className="text-sm text-steel">진행 중 (작성·발송)</p>
          <p className="mt-3 text-2xl font-bold text-ink">{open}건</p>
        </div>
        <div className="rounded-md border border-line bg-white p-5">
          <p className="text-sm text-steel">수주 확정</p>
          <p className="mt-3 text-2xl font-bold text-marine">{won}건</p>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white">
        {estimates.length === 0 ? (
          <EmptyState
            title="아직 작성한 견적서가 없습니다."
            description="새 견적서를 만들면 여기에 쌓이고, 지난 견적을 다시 열어 수정하거나 인쇄할 수 있습니다."
            action={
              canWrite ? (
                <Link href="/documents/estimate/new" className="inline-flex items-center gap-2 rounded-md bg-marine px-4 py-2 text-sm font-bold text-white">
                  <FilePlus2 className="h-4 w-4" />
                  새 견적서 작성
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-steel">
                  <th className="px-4 py-3 font-medium">견적번호</th>
                  <th className="px-4 py-3 font-medium">제목</th>
                  <th className="px-4 py-3 font-medium">수신</th>
                  <th className="px-4 py-3 font-medium">작성일</th>
                  <th className="px-4 py-3 text-right font-medium">합계 금액</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {estimates.map((estimate) => (
                  <tr key={estimate.id} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-3">
                      <Link href={`/documents/estimate/${estimate.id}`} className="font-medium text-marine">
                        {estimate.estimateNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/documents/estimate/${estimate.id}`} className="font-medium text-ink">
                        {estimate.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-steel">품목 {estimate.itemCount}건</p>
                    </td>
                    <td className="px-4 py-3 text-steel">{estimate.client}</td>
                    <td className="px-4 py-3 text-steel">{estimate.issuedAt}</td>
                    <td className="px-4 py-3 text-right font-bold text-ink">{estimate.total}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={estimate.statusLabel} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
