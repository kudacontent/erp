"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ResponsiveFilterBar } from "@/components/responsive-filter-bar";

type ContractListItem = {
  slug: string;
  id: string;
  client: string;
  title: string;
  supply: string;
  vat: string;
  total: string;
  billing: string;
  payment: string;
  due: string;
  status: string;
};

function statusClass(value: string) {
  if (["입금 완료", "완료", "발행 완료"].includes(value)) {
    return "bg-[#e8f5fb] text-marine";
  }

  if (["지연", "확인"].includes(value)) {
    return "bg-[#e5eef5] text-[#075985]";
  }

  return "bg-paper text-steel";
}

function matchesStatus(contract: ContractListItem, selectedStatus: string) {
  if (selectedStatus === "전체") {
    return true;
  }

  if (selectedStatus === "발행 대기") {
    return contract.billing === "발행 대기";
  }

  if (selectedStatus === "입금 대기") {
    return ["입금 대기", "미입금"].includes(contract.payment);
  }

  if (selectedStatus === "지연") {
    return contract.payment === "지연";
  }

  if (selectedStatus === "완료") {
    return contract.status === "완료" || contract.payment === "입금 완료";
  }

  return true;
}

export function FilterableContractsTable({
  contracts,
  statusOptions
}: {
  contracts: ContractListItem[];
  statusOptions: string[];
}) {
  const [query, setQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("전체");

  const filteredContracts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return contracts.filter((contract) => {
      const searchable = [
        contract.id,
        contract.title,
        contract.client,
        contract.total,
        contract.billing,
        contract.payment,
        contract.due,
        contract.status
      ].join(" ").toLowerCase();

      return matchesStatus(contract, selectedStatus) && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [contracts, query, selectedStatus]);

  return (
    <div className="min-w-0 rounded-md border border-line bg-white p-5">
      <ResponsiveFilterBar
        searchLabel="계약 검색"
        searchPlaceholder="계약명, 거래처, 상태 검색"
        searchValue={query}
        onSearchChange={setQuery}
        options={statusOptions}
        selectedOption={selectedStatus}
        onOptionChange={setSelectedStatus}
      />

      <div className="mb-3 text-sm font-medium text-steel">
        검색 결과 {filteredContracts.length}건
      </div>

      <div className="hidden overflow-x-auto rounded-md border border-line md:block">
        <table className="min-w-[720px] w-full border-collapse text-left text-sm">
          <thead className="bg-paper text-steel">
            <tr>
              <th className="px-4 py-3 font-medium">계약</th>
              <th className="px-4 py-3 font-medium">금액</th>
              <th className="px-4 py-3 font-medium">세금계산서</th>
              <th className="px-4 py-3 font-medium">입금</th>
              <th className="px-4 py-3 font-medium">예정일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {filteredContracts.length ? (
              filteredContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-paper">
                  <td className="px-4 py-4">
                    <Link href={`/contracts/${contract.slug}`} className="font-bold text-ink hover:text-marine">
                      {contract.title}
                    </Link>
                    <p className="mt-1 text-xs text-steel">{contract.client} · {contract.id}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-ink">{contract.total}</p>
                    <p className="mt-1 text-xs text-steel">공급 {contract.supply} / VAT {contract.vat}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusClass(contract.billing)}`}>
                      {contract.billing}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusClass(contract.payment)}`}>
                      {contract.payment}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-steel">{contract.due}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm font-medium text-steel">
                  조건에 맞는 계약이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {filteredContracts.length ? filteredContracts.map((contract) => (
          <Link
            key={contract.id}
            href={`/contracts/${contract.slug}`}
            className="block rounded-md border border-line bg-paper/60 p-4 transition hover:border-marine hover:bg-[#e8f5fb]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">{contract.title}</p>
                <p className="mt-1 truncate text-xs text-steel">{contract.client} · {contract.id}</p>
              </div>
              <p className="shrink-0 text-sm font-bold text-ink">{contract.total}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-white px-3 py-2">
                <p className="text-steel">세금계산서</p>
                <p className="mt-1 truncate font-bold text-marine">{contract.billing}</p>
              </div>
              <div className="rounded-md bg-white px-3 py-2">
                <p className="text-steel">입금</p>
                <p className="mt-1 truncate font-bold text-marine">{contract.payment}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-steel">
              <span>예정일</span>
              <span className="font-medium text-ink">{contract.due}</span>
            </div>
          </Link>
        )) : (
          <div className="rounded-md border border-line bg-paper px-4 py-10 text-center text-sm font-medium text-steel">
            조건에 맞는 계약이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
