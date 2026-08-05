"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, BriefcaseBusiness, FilePlus2, Mail, Phone, UserRoundCog } from "lucide-react";
import { ResponsiveFilterBar } from "@/components/responsive-filter-bar";
import { certificateRequests, departmentSummary, employees, hrInterviews, hrStats } from "@/lib/hr-data";

function statusClass(status: string) {
  if (["재직", "발급 완료"].includes(status)) {
    return "bg-[#e8f5fb] text-marine";
  }

  if (["휴직", "검토", "처리 대기"].includes(status)) {
    return "bg-[#e5eef5] text-[#075985]";
  }

  return "bg-paper text-steel";
}

export default function HrPage() {
  const [query, setQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("전체");
  const filteredEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesStatus = selectedStatus === "전체" || employee.status === selectedStatus;
      const searchable = [employee.name, employee.department, employee.role, employee.joined, employee.phone, employee.email]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [query, selectedStatus]);

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-ink">인사 관리</h2>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
          <FilePlus2 className="h-4 w-4" />
          직원 등록
        </button>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {hrStats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-line bg-white p-5">
            <p className="text-sm font-medium text-steel">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink">{stat.value}</p>
            <p className="mt-2 text-sm font-bold text-marine">{stat.hint}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 rounded-md border border-line bg-white p-5">
          <ResponsiveFilterBar
            searchLabel="직원 검색"
            searchPlaceholder="이름, 부서, 직무 검색"
            searchValue={query}
            onSearchChange={setQuery}
            options={["전체", "재직", "휴직", "퇴사"]}
            selectedOption={selectedStatus}
            onOptionChange={setSelectedStatus}
          />

          <div className="hidden overflow-x-auto rounded-md border border-line md:block">
            <table className="min-w-[760px] w-full border-collapse text-left text-sm">
              <thead className="bg-paper text-steel">
                <tr>
                  <th className="px-4 py-3 font-medium">직원</th>
                  <th className="px-4 py-3 font-medium">부서/직무</th>
                  <th className="px-4 py-3 font-medium">입사일</th>
                  <th className="px-4 py-3 font-medium">연락처</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {filteredEmployees.length ? filteredEmployees.map((employee) => (
                  <tr key={employee.email} className="hover:bg-paper">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-paper text-marine">
                          <UserRoundCog className="h-5 w-5" />
                        </span>
                        <p className="font-bold text-ink">{employee.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-ink">{employee.department}</p>
                      <p className="mt-1 text-xs text-steel">{employee.role}</p>
                    </td>
                    <td className="px-4 py-4 text-steel">{employee.joined}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1 text-xs text-steel">
                        <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{employee.phone}</span>
                        <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{employee.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusClass(employee.status)}`}>
                        {employee.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm font-medium text-steel">
                      {employees.length ? "조건에 맞는 직원이 없습니다." : "등록된 직원이 없습니다."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {filteredEmployees.length ? filteredEmployees.map((employee) => (
              <div key={employee.email} className="rounded-md border border-line bg-paper/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-marine">
                      <UserRoundCog className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">{employee.name}</p>
                      <p className="mt-1 truncate text-xs text-steel">{employee.department} · {employee.role}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${statusClass(employee.status)}`}>
                    {employee.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-white px-3 py-2">
                    <p className="text-steel">입사일</p>
                    <p className="mt-1 font-bold text-ink">{employee.joined}</p>
                  </div>
                  <div className="rounded-md bg-white px-3 py-2">
                    <p className="text-steel">연락처</p>
                    <p className="mt-1 truncate font-bold text-ink">{employee.phone}</p>
                  </div>
                </div>
                <p className="mt-3 truncate text-xs text-steel">{employee.email}</p>
              </div>
            )) : (
              <div className="rounded-md border border-line bg-paper px-4 py-10 text-center text-sm font-medium text-steel">
                {employees.length ? "조건에 맞는 직원이 없습니다." : "등록된 직원이 없습니다."}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-md border border-line bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <BriefcaseBusiness className="h-5 w-5 text-marine" />
              <h3 className="font-bold text-ink">부서 구성</h3>
            </div>
            <div className="space-y-3">
              {departmentSummary.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-md bg-paper px-3 py-3">
                  <p className="text-sm font-medium text-ink">{item.label}</p>
                  <p className="text-sm font-bold text-marine">{item.count}명</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-line bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-marine" />
              <h3 className="font-bold text-ink">증명서 요청</h3>
            </div>
            <div className="space-y-3">
              {certificateRequests.map((item) => (
                <div key={`${item.employee}-${item.type}`} className="rounded-md bg-paper px-3 py-3">
                  <p className="text-sm font-medium text-ink">{item.type}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-steel">
                    <span>{item.employee}</span>
                    <span className={`rounded-md px-2 py-1 ${statusClass(item.status)}`}>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="rounded-md border border-line bg-white p-5">
        <h3 className="mb-4 font-bold text-ink">인사 면담</h3>
        <div className="space-y-3">
          {hrInterviews.map((item) => (
            <div key={`${item.date}-${item.employee}`} className="flex items-center gap-3 rounded-md bg-paper px-3 py-3">
              <span className="w-14 shrink-0 text-sm font-bold text-marine">{item.date}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                <p className="mt-1 text-xs text-steel">{item.employee} · {item.owner}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
