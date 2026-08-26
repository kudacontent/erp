"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

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
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex min-w-72 items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm text-steel">
          <Search className="h-4 w-4" />
          <input
            aria-label="지출 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="지출명, 공급업체, 카테고리 검색"
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
        검색 결과 {filteredExpenses.length}건
      </div>

      <div className="overflow-hidden rounded-md border border-line">
        <table className="w-full border-collapse text-left text-sm">
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
