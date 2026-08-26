import { Camera, FileText, Plus, Upload, Users } from "lucide-react";
import Link from "next/link";
import { FilterableClientsTable } from "@/components/filterable-clients-table";
import { clientActivities, clientStats, clientTypes, ocrQueue } from "@/lib/clients-data";
import { getClientsForList } from "@/lib/clients-service";

export default async function ClientsPage() {
  const clients = await getClientsForList();

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-ink">거래처 관리</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/clients/business-card" className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink">
            <Camera className="h-4 w-4 text-marine" />
            명함 스캔
          </Link>
          <Link href="/clients/new" className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
            <Plus className="h-4 w-4" />
            거래처 등록
          </Link>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {clientStats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-line bg-white p-5">
            <p className="text-sm font-medium text-steel">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <FilterableClientsTable clients={clients} clientTypes={clientTypes} />

        <aside className="space-y-4">
          <section className="rounded-md border border-line bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-ink">명함 OCR</h3>
              <Upload className="h-5 w-5 text-marine" />
            </div>
            <div className="rounded-md border border-dashed border-line bg-paper px-4 py-8 text-center">
              <Camera className="mx-auto h-8 w-8 text-marine" />
              <p className="mt-3 text-sm font-medium text-ink">명함 이미지 업로드</p>
              <p className="mt-1 text-xs text-steel">JPG, PNG, HEIC</p>
            </div>
          </section>

          <section className="rounded-md border border-line bg-white p-5">
            <h3 className="mb-4 font-bold text-ink">검수 대기</h3>
            <div className="space-y-3">
              {ocrQueue.map((item) => (
                <div key={item.file} className="rounded-md bg-paper px-3 py-3">
                  <p className="truncate text-sm font-medium text-ink">{item.extracted}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-steel">
                    <span className="truncate">{item.file}</span>
                    <span className="shrink-0 font-medium text-marine">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-line bg-white p-5">
          <h3 className="mb-4 font-bold text-ink">최근 활동</h3>
          <div className="space-y-3">
            {clientActivities.map((activity) => (
              <div key={`${activity.date}-${activity.title}`} className="flex items-center gap-3 rounded-md bg-paper px-3 py-3">
                <span className="w-12 shrink-0 text-sm font-bold text-marine">{activity.date}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{activity.title}</p>
                </div>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-steel">{activity.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-line bg-white p-5">
          <h3 className="mb-4 font-bold text-ink">담당자 관리</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-md bg-paper px-3 py-3">
              <Users className="h-5 w-5 text-marine" />
              <div>
                <p className="text-sm font-medium text-ink">담당자 58명</p>
                <p className="mt-1 text-xs text-steel">거래처별 연락처 연결</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-paper px-3 py-3">
              <FileText className="h-5 w-5 text-marine" />
              <div>
                <p className="text-sm font-medium text-ink">첨부 문서 24건</p>
                <p className="mt-1 text-xs text-steel">계약서, 견적서, 명함 이미지</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
