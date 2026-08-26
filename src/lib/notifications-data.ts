export const notificationStats = [
  { label: "전체 알림", value: "18건" },
  { label: "미확인", value: "7건" },
  { label: "정산", value: "5건" },
  { label: "승인", value: "4건" }
];

export const notifications = [
  {
    title: "부산조선 협력사 입금 지연",
    body: "입금 예정일이 2일 지났습니다.",
    type: "정산",
    time: "오늘 09:10",
    status: "미확인",
    target: "계약/매출"
  },
  {
    title: "장비 정비비 승인 요청",
    body: "ROV 추진기 부품 교체 지출 승인이 필요합니다.",
    type: "승인",
    time: "오늘 10:25",
    status: "미확인",
    target: "지출"
  },
  {
    title: "명함 OCR 검수 필요",
    body: "오션테크 담당자 명함 분석 결과를 확인하세요.",
    type: "OCR",
    time: "오늘 11:40",
    status: "미확인",
    target: "거래처"
  },
  {
    title: "정산 회의록 확인",
    body: "한진해운 ROV 정산 회의록 확인이 필요합니다.",
    type: "회의",
    time: "어제 17:20",
    status: "확인",
    target: "회의"
  },
  {
    title: "일일경영보고 생성 완료",
    body: "오늘의 브리핑과 권장 조치가 준비되었습니다.",
    type: "보고",
    time: "어제 18:00",
    status: "확인",
    target: "일일경영보고"
  }
];

export const notificationFilters = ["전체", "미확인", "정산", "승인", "OCR", "회의", "보고"];
