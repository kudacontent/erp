import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import { FilterableContractsTable } from "@/components/filterable-contracts-table";
import { getContractsForList } from "@/lib/contracts-service";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

// 이 화면은 등록 즉시 목록에 반영되어야 한다.
// 이 선언이 없으면 Next.js 가 빌드 시점 DB 스냅샷으로 페이지를 구워 정적 파일로 서빙하고,
// 이후 새로 등록한 데이터가 재빌드 전까지 화면에 나타나지 않는다.
export const dynamic = "force-dynamic";

// 회사의 돈에 관한 화면이다. 권한이 없으면 대시보드로 돌려보낸다.
const FINANCE_ROLES = ["CEO", "ADMIN", "ACCOUNTING", "OPERATIONS", "AUDITOR"];


export default async function ContractsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/contracts");
  }

  if (!FINANCE_ROLES.includes(user.role)) {
    redirect("/");
  }

  const contracts = await getContractsForList();
  const stats = [
    { label: "등록 계약", value: `${contracts.length}건`, amount: "운영 데이터 기준" },
    { label: "입금 대기", value: `${contracts.filter((contract) => contract.payment === "미입금").length}건`, amount: "운영 데이터 기준" },
    { label: "발행 대기", value: `${contracts.filter((contract) => contract.billing === "발행 대기").length}건`, amount: "운영 데이터 기준" },
    { label: "정산 완료", value: `${contracts.filter((contract) => contract.payment === "입금 완료").length}건`, amount: "운영 데이터 기준" }
  ];

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-ink">계약 및 매출</h2>
        </div>
        <Link href="/contracts/new" className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
          <FilePlus2 className="h-4 w-4" />
          계약 등록
        </Link>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-line bg-white p-5">
            <p className="text-sm font-medium text-steel">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink">{stat.value}</p>
            <p className="mt-2 text-sm font-bold text-marine">{stat.amount}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 min-w-0">
        <FilterableContractsTable contracts={contracts} statusOptions={["전체", "발행 대기", "입금 대기", "지연", "완료"]} />
      </section>
    </main>
  );
}
