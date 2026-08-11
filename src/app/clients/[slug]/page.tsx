import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, FileText, Mail, Phone, UserRound } from "lucide-react";
import { getClientDetail } from "@/lib/clients-service";

export default async function ClientDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getClientDetail(slug);

  if (!detail) {
    notFound();
  }

  const { client, contacts, contracts, activities } = detail;

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/clients" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-marine">
            <ArrowLeft className="h-4 w-4" />
            거래처 목록
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-marine">
              <Building2 className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-3xl font-bold text-ink">{client.name}</h2>
              <p className="mt-1 text-sm text-steel">{client.type} · {client.status}</p>
            </div>
          </div>
        </div>
        <button className="rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">정보 수정</button>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-md border border-line bg-white p-5">
          <p className="text-sm text-steel">계약</p>
          <p className="mt-3 text-3xl font-bold text-ink">{client.contracts}건</p>
        </div>
        <div className="rounded-md border border-line bg-white p-5">
          <p className="text-sm text-steel">누적 매출</p>
          <p className="mt-3 text-3xl font-bold text-ink">{client.revenue}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-5">
          <p className="text-sm text-steel">최근 미팅</p>
          <p className="mt-3 text-2xl font-bold text-ink">{client.lastMeeting}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-5">
          <p className="text-sm text-steel">사업자번호</p>
          <p className="mt-3 text-xl font-bold text-ink">{client.businessNumber}</p>
        </div>
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-line bg-white p-5">
          <h3 className="mb-5 font-bold text-ink">계약 현황</h3>
          <div className="space-y-3">
            {contracts.length > 0 ? contracts.map((contract) => (
              <div key={contract.title} className="grid gap-3 rounded-md bg-paper px-4 py-3 md:grid-cols-[1fr_120px_120px]">
                <div>
                  <p className="font-medium text-ink">{contract.title}</p>
                  <p className="mt-1 text-sm text-steel">{contract.due}</p>
                </div>
                <p className="text-sm font-bold text-marine">{contract.status}</p>
                <p className="text-sm font-bold text-ink">{contract.amount}</p>
              </div>
            )) : (
              <div className="rounded-md bg-paper px-4 py-8 text-center text-sm text-steel">등록된 계약이 없습니다.</div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-md border border-line bg-white p-5">
            <h3 className="mb-4 font-bold text-ink">기본 정보</h3>
            <div className="space-y-3 text-sm">
              <p className="text-steel">{client.address}</p>
              {client.website ? <a href={client.website} target="_blank" rel="noreferrer" className="block break-all text-marine hover:underline">{client.website}</a> : null}
              <p className="text-ink">{client.memo}</p>
            </div>
          </section>

          <section className="rounded-md border border-line bg-white p-5">
            <h3 className="mb-4 font-bold text-ink">주요 연락처</h3>
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm text-ink"><UserRound className="h-4 w-4 text-marine" />{client.contact}</p>
              <p className="flex items-center gap-2 text-sm text-ink"><Phone className="h-4 w-4 text-marine" />{client.phone}</p>
              <p className="flex items-center gap-2 text-sm text-ink"><Mail className="h-4 w-4 text-marine" />{client.email}</p>
            </div>
          </section>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-line bg-white p-5">
          <h3 className="mb-5 font-bold text-ink">활동 이력</h3>
          <div className="space-y-3">
            {activities.length > 0 ? activities.map((activity) => (
              <div key={`${activity.date}-${activity.title}`} className="flex items-center gap-3 rounded-md bg-paper px-3 py-3">
                <CalendarDays className="h-5 w-5 text-marine" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{activity.title}</p>
                  <p className="mt-1 text-xs text-steel">{activity.date} · {activity.owner}</p>
                </div>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-steel">{activity.type}</span>
              </div>
            )) : (
              <div className="rounded-md bg-paper px-4 py-8 text-center text-sm text-steel">활동 이력이 없습니다.</div>
            )}
          </div>
        </div>

        <div className="rounded-md border border-line bg-white p-5">
          <h3 className="mb-5 font-bold text-ink">담당자 목록</h3>
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div key={`${contact.name}-${contact.email}`} className="rounded-md bg-paper px-3 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-ink">{contact.name}</p>
                  {contact.primary ? <span className="rounded-md bg-white px-2 py-1 text-xs text-marine">대표</span> : null}
                </div>
                <p className="mt-1 text-xs text-steel">{[contact.department, contact.role].filter(Boolean).join(" · ")}</p>
                <p className="mt-2 text-xs text-steel">{contact.phone}</p>
                <p className="mt-1 text-xs text-steel">{contact.email}</p>
                {contact.businessCardImageUrl ? (
                  <a href={contact.businessCardImageUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-medium text-marine hover:underline">
                    명함 이미지 보기{contact.ocrConfidence ? ` · OCR ${Math.round(contact.ocrConfidence * 100)}%` : ""}
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
