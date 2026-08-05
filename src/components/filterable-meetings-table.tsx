"use client";

import { useMemo, useState } from "react";
import { ResponsiveFilterBar } from "@/components/responsive-filter-bar";

type MeetingListItem = {
  id: string;
  title: string;
  type: string;
  client: string;
  time: string;
  attendees: string;
  status: string;
  minutes: string;
};

function meetingStatusClass(status: string) {
  if (["완료", "후속 조치"].includes(status)) {
    return "bg-[#e8f5fb] text-marine";
  }

  if (["진행 중", "예정"].includes(status)) {
    return "bg-[#e5eef5] text-[#075985]";
  }

  return "bg-paper text-steel";
}

export function FilterableMeetingsTable({
  meetings,
  statusOptions
}: {
  meetings: MeetingListItem[];
  statusOptions: string[];
}) {
  const [query, setQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("전체");

  const filteredMeetings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return meetings.filter((meeting) => {
      const matchesStatus = selectedStatus === "전체" || meeting.status === selectedStatus;
      const searchable = [
        meeting.id,
        meeting.title,
        meeting.type,
        meeting.client,
        meeting.time,
        meeting.attendees,
        meeting.status,
        meeting.minutes
      ].join(" ").toLowerCase();

      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [meetings, query, selectedStatus]);

  return (
    <div className="min-w-0 rounded-md border border-line bg-white p-5">
      <ResponsiveFilterBar
        searchLabel="회의 검색"
        searchPlaceholder="회의명, 거래처, 참석자 검색"
        searchValue={query}
        onSearchChange={setQuery}
        options={statusOptions}
        selectedOption={selectedStatus}
        onOptionChange={setSelectedStatus}
      />

      <div className="mb-3 text-sm font-medium text-steel">
        검색 결과 {filteredMeetings.length}건
      </div>

      <div className="hidden overflow-x-auto rounded-md border border-line md:block">
        <table className="min-w-[720px] w-full border-collapse text-left text-sm">
          <thead className="bg-paper text-steel">
            <tr>
              <th className="px-4 py-3 font-medium">회의</th>
              <th className="px-4 py-3 font-medium">거래처</th>
              <th className="px-4 py-3 font-medium">시간</th>
              <th className="px-4 py-3 font-medium">참석</th>
              <th className="px-4 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {filteredMeetings.length ? (
              filteredMeetings.map((meeting) => (
                <tr key={meeting.id} className="hover:bg-paper">
                  <td className="px-4 py-4">
                    <p className="font-bold text-ink">{meeting.title}</p>
                    <p className="mt-1 text-xs text-steel">{meeting.type} · {meeting.minutes}</p>
                  </td>
                  <td className="px-4 py-4 text-steel">{meeting.client}</td>
                  <td className="px-4 py-4 text-steel">{meeting.time}</td>
                  <td className="px-4 py-4 text-steel">{meeting.attendees}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${meetingStatusClass(meeting.status)}`}>
                      {meeting.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm font-medium text-steel">
                  조건에 맞는 회의가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {filteredMeetings.length ? filteredMeetings.map((meeting) => (
          <div key={meeting.id} className="rounded-md border border-line bg-paper/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">{meeting.title}</p>
                <p className="mt-1 truncate text-xs text-steel">{meeting.type} · {meeting.client}</p>
              </div>
              <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${meetingStatusClass(meeting.status)}`}>
                {meeting.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-white px-3 py-2">
                <p className="text-steel">시간</p>
                <p className="mt-1 truncate font-bold text-ink">{meeting.time}</p>
              </div>
              <div className="rounded-md bg-white px-3 py-2">
                <p className="text-steel">참석</p>
                <p className="mt-1 truncate font-bold text-ink">{meeting.attendees}</p>
              </div>
            </div>
            <p className="mt-3 truncate text-xs text-steel">회의록: {meeting.minutes}</p>
          </div>
        )) : (
          <div className="rounded-md border border-line bg-paper px-4 py-10 text-center text-sm font-medium text-steel">
            조건에 맞는 회의가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
