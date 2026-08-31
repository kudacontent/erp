"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, Mail, Phone } from "lucide-react";
import { ResponsiveFilterBar } from "@/components/responsive-filter-bar";
import { EmptyState } from "@/components/ui/empty-state";

type ClientListItem = {
  slug: string;
  name: string;
  type: string;
  contact: string;
  phone: string;
  email: string;
  address?: string;
  businessNumber?: string;
  contracts: number;
  revenue: string;
  lastMeeting: string;
  status: string;
};

export function FilterableClientsTable({
  clients,
  clientTypes
}: {
  clients: ClientListItem[];
  clientTypes: string[];
}) {
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState("전체");

  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesType = selectedType === "전체" || client.type === selectedType;
      const searchable = [
        client.name,
        client.type,
        client.contact,
        client.phone,
        client.email,
        client.address,
        client.businessNumber,
        client.status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesType && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [clients, query, selectedType]);

  return (
    <div className="min-w-0 rounded-md border border-line bg-white p-5">
      <ResponsiveFilterBar
        searchLabel="거래처 검색"
        searchPlaceholder="거래처명, 담당자, 이메일 검색"
        searchValue={query}
        onSearchChange={setQuery}
        options={clientTypes}
        selectedOption={selectedType}
        onOptionChange={setSelectedType}
      />

      <div className="mb-3 text-sm font-medium text-steel">
        검색 결과 {filteredClients.length}건
      </div>

      <div className="hidden overflow-x-auto rounded-md border border-line md:block">
        <table className="min-w-[720px] w-full border-collapse text-left text-sm">
          <thead className="bg-paper text-steel">
            <tr>
              <th className="px-4 py-3 font-medium">거래처</th>
              <th className="px-4 py-3 font-medium">담당자</th>
              <th className="px-4 py-3 font-medium">계약</th>
              <th className="px-4 py-3 font-medium">최근 미팅</th>
              <th className="px-4 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {filteredClients.length ? (
              filteredClients.map((client) => (
                <tr key={client.slug} className="hover:bg-paper">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-paper text-marine">
                        <Building2 className="h-5 w-5" />
                      </span>
                      <div>
                        <Link href={`/clients/${client.slug}`} className="font-bold text-ink hover:text-marine">
                          {client.name}
                        </Link>
                        <p className="mt-1 text-xs text-steel">{client.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-ink">{client.contact}</p>
                    <div className="mt-1 flex flex-col gap-1 text-xs text-steel">
                      <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</span>
                      <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-ink">{client.contracts}건</p>
                    <p className="mt-1 text-xs text-steel">{client.revenue}</p>
                  </td>
                  <td className="px-4 py-4 text-steel">{client.lastMeeting}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-md bg-paper px-2 py-1 text-xs font-medium text-marine">{client.status}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-2">
                  <EmptyState
                    title={clients.length ? "조건에 맞는 거래처가 없습니다" : "등록된 거래처가 없습니다"}
                    description={clients.length ? "검색어나 필터를 바꿔보세요." : "첫 거래처를 등록하면 여기에 표시됩니다."}
                    action={clients.length ? null : (
                      <Link href="/clients/new" className="inline-flex items-center justify-center rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
                        거래처 등록
                      </Link>
                    )}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {filteredClients.length ? filteredClients.map((client) => (
          <Link
            key={client.slug}
            href={`/clients/${client.slug}`}
            className="block rounded-md border border-line bg-paper/60 p-4 transition hover:border-marine hover:bg-[#e8f5fb]"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-marine">
                <Building2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{client.name}</p>
                    <p className="mt-1 text-xs text-steel">{client.type}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-medium text-marine">{client.status}</span>
                </div>
                <p className="mt-3 truncate text-sm font-medium text-ink">{client.contact || "담당자 미등록"}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-white px-3 py-2">
                    <p className="text-steel">계약</p>
                    <p className="mt-1 font-bold text-ink">{client.contracts}건</p>
                  </div>
                  <div className="rounded-md bg-white px-3 py-2">
                    <p className="text-steel">최근 미팅</p>
                    <p className="mt-1 truncate font-bold text-ink">{client.lastMeeting}</p>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )) : (
          <div className="rounded-md border border-line bg-paper">
            <EmptyState
              title={clients.length ? "조건에 맞는 거래처가 없습니다" : "등록된 거래처가 없습니다"}
              description={clients.length ? "검색어나 필터를 바꿔보세요." : "첫 거래처를 등록하면 여기에 표시됩니다."}
              action={clients.length ? null : (
                  <Link href="/clients/new" className="inline-flex items-center justify-center rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
                    거래처 등록
                  </Link>
                )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
