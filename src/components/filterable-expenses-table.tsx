"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ResponsiveFilterBar } from "@/components/responsive-filter-bar";

type ExpenseListItem = {
  expenseId: string;
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
    <div className="min-w-0 rounded-md border border-line bg-white p-5">
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

      <div className="hidden overflow-x-auto rounded-md border border-line md:block">
        <table className="min-w-[720px] w-full border-collapse text-left text-sm">
          <thead className="bg-paper text-steel">
            <tr>
              <th className="px-4 py-3 font-medium">지출</th>
              <th className="px-4 py-3 font-medium">카테고리</th>
              <th className="px-4 py-3 font-medium">금액</th>
              <th className="px-4 py-3 font-medium">결제</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 text-right font-medium">처리</th>
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
                  <td className="px-4 py-4 text-right">
                    <Link href={`/expenses/${expense.expenseId}`} className="inline-flex rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-marine hover:bg-paper">
                      상세·처리
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm font-medium text-steel">
                  조건에 맞는 지출이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {filteredExpenses.length ? filteredExpenses.map((expense) => (
          <div key={expense.id} className="rounded-md border border-line bg-paper/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">{expense.title}</p>
                <p className="mt-1 truncate text-xs text-steel">{expense.vendor} · {expense.spentAt}</p>
              </div>
              <p className="shrink-0 text-sm font-bold text-ink">{expense.amount}</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md bg-white px-2 py-1 text-steel">{expense.category}</span>
              <span className="rounded-md bg-white px-2 py-1 text-steel">{expense.method}</span>
              <span className="rounded-md bg-white px-2 py-1 text-steel">{expense.receipt}</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span className="text-steel">승인 상태</span>
              <span className={`rounded-md px-2 py-1 font-medium ${approvalClass(expense.approval)}`}>{expense.approval}</span>
            </div>
            <Link href={`/expenses/${expense.expenseId}`} className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-marine">
              상세·처리
            </Link>
          </div>
        )) : (
          <div className="rounded-md border border-line bg-paper px-4 py-10 text-center text-sm font-medium text-steel">
            조건에 맞는 지출이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
