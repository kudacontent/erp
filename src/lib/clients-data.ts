export type ClientListItem = {
  slug: string;
  name: string;
  type: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  businessNumber: string;
  website?: string;
  memo: string;
  contracts: number;
  revenue: string;
  lastMeeting: string;
  status: string;
};

export const clientStats = [
  { label: "전체 거래처", value: "0" },
  { label: "활성 계약처", value: "0" },
  { label: "명함 검수", value: "0" },
  { label: "이번 달 미팅", value: "0" }
];

export const clientTypes = ["전체", "선사", "발주처", "협력업체", "공급업체", "잠재고객"];

export const clients: ClientListItem[] = [];

export function getClientBySlug(_slug: string) {
  return undefined;
}

export const clientDetailActivities: Array<{
  date: string;
  title: string;
  type: string;
  owner: string;
}> = [];

export const clientContacts: Array<{
  name: string;
  role: string;
  phone: string;
  email: string;
  primary: boolean;
}> = [];

export const clientContracts: Array<{
  title: string;
  status: string;
  amount: string;
  due: string;
}> = [];

export const ocrQueue: Array<{
  file: string;
  extracted: string;
  status: string;
}> = [];

export const clientActivities: Array<{
  date: string;
  title: string;
  type: string;
}> = [];
