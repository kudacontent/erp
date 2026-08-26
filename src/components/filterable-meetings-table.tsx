"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

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
    <div className="rounded-md border border-line bg-white p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex min-w-72 items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm text-steel">
          <Search className="h-4 w-4" />
          <input
            aria-label="회의 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="회의명, 거래처, 참석자 검색"
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
        검색 결과 {filteredMeetings.length}건
      </div>

      <div className="overflow-hidden rounded-md border border-line">
        <table className="w-full border-collapse text-left text-sm">
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
    </div>
  );
}
