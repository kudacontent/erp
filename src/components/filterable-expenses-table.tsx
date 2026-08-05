"use client";

import { useMemo, useState } from "react";
import { ResponsiveFilterBar } from "@/components/responsive-filter-bar";

type ExpenseListItem = {
  id: string;
  vendor: string;
  category: string;
  title: string;
  amount: string;
  method: string;
  spentAt: string;
  approval: string;
  receipt: string;
};

function approvalClass(value: string) {
  if (["승인 완료", "지급 완료"].includes(value)) {
    return "bg-[#e8f5fb] text-marine";
  }

  if (["승인 대기", "검토"].includes(value)) {
    return "bg-[#e5eef5] text-[#075985]";
  }

  return "bg-paper text-steel";
}

export function FilterableExpensesTable({
  expenses,
  statusOptions
}: {
  expenses: ExpenseListItem[];
  statusOptions: string[];
}) {
  const [query, setQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("전체");

  const filteredExpenses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return expenses.filter((expense) => {
      const matchesStatus = selectedStatus === "전체" || expense.approval === selectedStatus;
      const searchable = [
        expense.id,
        expense.title,
        expense.vendor,
        expense.category,
        expense.amount,
        expense.method,
        expense.spentAt,
        expense.approval,
        expense.receipt
      ].join(" ").toLowerCase();

      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [expenses, query, selectedStatus]);

  return (
    <div className="rounded-md border border-line bg-white p-5">
      <ResponsiveFilterBar
        searchLabel="지출 검색"
        searchPlaceholder="지출명, 공급업체, 카테고리 검색"
        searchValue={query}
        onSearchChange={setQuery}
        options={statusOptions}
        selectedOption={selectedStatus}
        onOptionChange={setSelectedStatus}
      />

      <div className="mb-3 text-sm font-medium text-steel">
        검색 결과 {filteredExpenses.length}건
      </div>

      <div className="overflow-x-auto rounded-md border border-line">
        <table className="min-w-[720px] w-full border-collapse text-left text-sm">
          <thead className="bg-paper text-steel">
            <tr>
              <th className="px-4 py-3 font-medium">지출</th>
              <th className="px-4 py-3 font-medium">카테고리</th>
              <th className="px-4 py-3 font-medium">금액</th>
              <th className="px-4 py-3 font-medium">결제</th>
              <th className="px-4 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {filteredExpenses.length ? (
              filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-paper">
                  <td className="px-4 py-4">
                    <p className="font-bold text-ink">{expense.title}</p>
                    <p className="mt-1 text-xs text-steel">{expense.vendor} · {expense.spentAt}</p>
                  </td>
                  <td className="px-4 py-4 text-steel">{expense.category}</td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-ink">{expense.amount}</p>
                    <p className="mt-1 text-xs text-steel">{expense.receipt}</p>
                  </td>
                  <td className="px-4 py-4 text-steel">{expense.method}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${approvalClass(expense.approval)}`}>
                      {expense.approval}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm font-medium text-steel">
                  조건에 맞는 지출이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
