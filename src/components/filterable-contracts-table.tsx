"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

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
    <div className="rounded-md border border-line bg-white p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex min-w-72 items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm text-steel">
          <Search className="h-4 w-4" />
          <input
            aria-label="계약 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="계약명, 거래처, 상태 검색"
            className="w-full bg-transparent text-ink outline-none placeholder:text-steel"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSelectedStatus(item)}
              className={[
                "rounded-md border px-3 py-2 text-sm font-medium",
                item === selectedStatus ? "border-marine bg-marine text-white" : "border-line bg-white text-steel"
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 text-sm font-medium text-steel">
        검색 결과 {filteredContracts.length}건
      </div>

      <div className="overflow-hidden rounded-md border border-line">
        <table className="w-full border-collapse text-left text-sm">
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
                    <StatusBadge status={contract.billing} />
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={contract.payment} />
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
    </div>
  );
}
