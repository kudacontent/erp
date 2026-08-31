import { Camera, Plus } from "lucide-react";
import Link from "next/link";
import { FilterableClientsTable } from "@/components/filterable-clients-table";
import { clientTypes } from "@/lib/clients-data";
import { getClientsForList } from "@/lib/clients-service";

// 이 화면은 등록 즉시 목록에 반영되어야 한다.
// 이 선언이 없으면 Next.js 가 빌드 시점 DB 스냅샷으로 페이지를 구워 정적 파일로 서빙하고,
// 이후 새로 등록한 데이터가 재빌드 전까지 화면에 나타나지 않는다.
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await getClientsForList();
  const stats = [
    { label: "전체 거래처", value: String(clients.length) },
    { label: "활성 계약처", value: String(clients.filter((client) => client.contracts > 0).length) },
    { label: "담당자 연결", value: String(clients.filter((client) => client.contact !== "-").length) },
    { label: "이번 달 미팅", value: "0" }
  ];

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-ink">거래처 관리</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/clients/business-card" className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
            <Camera className="h-4 w-4" />
            명함으로 거래처 만들기
          </Link>
          <Link href="/clients/new" className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
            <Plus className="h-4 w-4" />
            거래처 등록
          </Link>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-line bg-white p-5">
            <p className="text-sm font-medium text-steel">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 min-w-0">
        <FilterableClientsTable clients={clients} clientTypes={clientTypes} />
      </section>

    </main>
  );
}
