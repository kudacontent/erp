export const reportStats = [
  { label: "오늘 일정", value: "4건" },
  { label: "회의 결정", value: "3건" },
  { label: "미완료 조치", value: "5건" },
  { label: "확인 필요", value: "3건" }
];

export const briefingSections = [
  {
    title: "오늘의 핵심 요약",
    body: "한진해운 ROV 정산 회의에서 공급가액과 발행 일정을 확정했고, 남해오션서비스 견적은 추가 검토 후 발송하기로 정리되었습니다."
  },
  {
    title: "매출/정산 변화",
    body: "발행 완료 계약 1건, 발행 대기 계약 2건이 있으며 이번 주 입금 확인 대상은 총 3건입니다."
  },
  {
    title: "지출/승인 변화",
    body: "장비 정비비 지출 1건이 승인 대기 상태이며, 영수증 OCR 검수 대상은 3건입니다."
  }
];

export const riskItems = [
  { title: "부산조선 협력사 입금 지연", level: "높음", detail: "예정일 기준 D+2 상태" },
  { title: "남해오션서비스 세금계산서 발행 대기", level: "중간", detail: "견적 검토 완료 후 발행 필요" },
  { title: "장비 정비비 승인 지연", level: "중간", detail: "지급 예정일 전 승인 필요" }
];

export const recommendedActions = [
  { title: "입금 지연 건 확인", owner: "회계", due: "내일 오전" },
  { title: "견적서 수정본 발송", owner: "영업", due: "내일" },
  { title: "영수증 OCR 검수 완료", owner: "경영지원", due: "금요일" },
  { title: "정산 회의록 대표 확인", owner: "대표", due: "오늘" }
];

export const sourceItems = [
  { type: "회의", title: "한진해운 ROV 정산 회의", count: "결정사항 2건" },
  { type: "계약", title: "ROV 수중 검사 정산", count: "1,240만원" },
  { type: "지출", title: "ROV 추진기 부품 교체", count: "420만원" },
  { type: "캘린더", title: "2026-05-27 오늘 일정", count: "4건" }
];

export const reportHistory = [
  { date: "2026-05-27", status: "확인 완료", summary: "정산 회의 및 입금 확인 중심" },
  { date: "2026-05-26", status: "확인 완료", summary: "지출 승인 및 영수증 검수 중심" },
  { date: "2026-05-25", status: "미확인", summary: "거래처 미팅 후속 조치 중심" }
];
