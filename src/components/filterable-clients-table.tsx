"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, Mail, Phone, Search } from "lucide-react";

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
    <div className="rounded-md border border-line bg-white p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex w-full min-w-0 items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm text-steel sm:min-w-72">
          <Search className="h-4 w-4" />
          <input
            aria-label="거래처 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="거래처명, 담당자, 이메일 검색"
            className="w-full bg-transparent text-ink outline-none placeholder:text-steel"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {clientTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={[
                "rounded-md border px-3 py-2 text-sm font-medium",
                type === selectedType ? "border-marine bg-marine text-white" : "border-line bg-white text-steel"
              ].join(" ")}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 text-sm font-medium text-steel">
        검색 결과 {filteredClients.length}건
      </div>

      <div className="overflow-x-auto rounded-md border border-line">
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
                <td colSpan={5} className="px-4 py-10 text-center text-sm font-medium text-steel">
                  조건에 맞는 거래처가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
