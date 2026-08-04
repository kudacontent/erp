export const notificationStats = [
  { label: "전체 알림", value: "0건" },
  { label: "미확인", value: "0건" },
  { label: "정산", value: "0건" },
  { label: "승인", value: "0건" }
];

export type NotificationListItem = {
  title: string;
  body: string;
  type: string;
  time: string;
  status: string;
  target: string;
};

export const notifications: NotificationListItem[] = [];
export const notificationFilters = ["전체", "미확인", "정산", "승인", "OCR", "회의", "보고"];
