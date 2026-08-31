import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildCalendarViewData, type CalendarEventRecord } from "./calendar-data.ts";

/** 서울 기준 시각을 UTC Date 로 */
const kst = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(Date.UTC(y, m - 1, d, h, min) - 9 * 60 * 60 * 1000);

const ev = (id: string, start: Date, end: Date, isAllDay = false): CalendarEventRecord => ({
  id,
  title: id,
  category: "회의",
  startTime: start,
  endTime: end,
  isAllDay,
  description: null,
  syncStatus: "LOCAL_ONLY"
});

/** 해당 날짜 칸에 들어간 일정 id 목록 */
function eventsOn(view: ReturnType<typeof buildCalendarViewData>, key: string) {
  const day = view.calendarDays.find((d) => d.key === key);
  return (day?.events ?? []).map((e) => e.id);
}

describe("여러 날에 걸친 일정", () => {
  // 이전에는 일정을 시작일 한 칸에만 넣어서
  // 3일짜리 일정도 첫날에만 보였다.
  const view = buildCalendarViewData(
    [
      // 구글 종일 일정 8/1~8/3 은 end=8/4 (exclusive) 로 들어온다
      ev("종일3일", kst(2026, 8, 1), kst(2026, 8, 4), true),
      ev("하루", kst(2026, 8, 5, 10), kst(2026, 8, 5, 11)),
      // 지난달에 시작해 이번 달로 넘어오는 일정
      ev("월넘김", kst(2026, 7, 30), kst(2026, 8, 3), true),
      ev("밤샘", kst(2026, 8, 10, 22), kst(2026, 8, 11, 1)),
      // 정확히 자정에 끝나는 일정은 다음날을 차지하지 않아야 한다
      ev("자정끝", kst(2026, 8, 15, 10), kst(2026, 8, 16, 0))
    ],
    kst(2026, 8, 12, 12),
    kst(2026, 8, 12, 12)
  );

  test("3일짜리 종일 일정이 8/1, 8/2, 8/3 에 모두 나온다", () => {
    assert.ok(eventsOn(view, "2026-08-01").includes("종일3일"));
    assert.ok(eventsOn(view, "2026-08-02").includes("종일3일"));
    assert.ok(eventsOn(view, "2026-08-03").includes("종일3일"));
  });

  test("구글의 exclusive end 때문에 8/4 까지 늘어나면 안 된다", () => {
    assert.ok(!eventsOn(view, "2026-08-04").includes("종일3일"));
  });

  test("하루짜리 일정은 그날 하루만", () => {
    assert.deepEqual(eventsOn(view, "2026-08-05"), ["하루"]);
    assert.ok(!eventsOn(view, "2026-08-06").includes("하루"));
  });

  test("지난달에 시작한 일정도 이번 달 칸에 나온다", () => {
    assert.ok(eventsOn(view, "2026-08-01").includes("월넘김"));
    assert.ok(eventsOn(view, "2026-08-02").includes("월넘김"));
    assert.ok(!eventsOn(view, "2026-08-03").includes("월넘김"));
  });

  test("자정을 넘기는 일정은 양쪽 날에", () => {
    assert.ok(eventsOn(view, "2026-08-10").includes("밤샘"));
    assert.ok(eventsOn(view, "2026-08-11").includes("밤샘"));
  });

  test("정각 자정에 끝나면 다음날은 차지하지 않는다", () => {
    assert.ok(eventsOn(view, "2026-08-15").includes("자정끝"));
    assert.ok(!eventsOn(view, "2026-08-16").includes("자정끝"));
  });

  test("이어지는 날에는 위치 표시가 붙는다", () => {
    const first = view.calendarDays.find((d) => d.key === "2026-08-01");
    const spanning = first?.events.find((e) => e.id === "종일3일");
    assert.equal(spanning?.spanPosition, "start");

    const last = view.calendarDays.find((d) => d.key === "2026-08-03");
    assert.equal(last?.events.find((e) => e.id === "종일3일")?.spanPosition, "end");
  });

  test("월간 목록에는 기간으로 표시한다", () => {
    const row = view.monthEvents.find((e) => e.title === "종일3일");
    assert.equal(row?.date, "08/01~08/03");

    const single = view.monthEvents.find((e) => e.title === "하루");
    assert.equal(single?.date, "08/05");
  });
});

describe("오늘 일정", () => {
  test("오늘을 지나가는 일정도 포함한다", () => {
    const view = buildCalendarViewData(
      [ev("장기", kst(2026, 8, 10), kst(2026, 8, 15), true)],
      kst(2026, 8, 12, 12),
      kst(2026, 8, 12, 12)
    );

    assert.equal(view.todayEvents.length, 1);
    assert.equal(view.todayEvents[0].time, "계속");
  });
});
