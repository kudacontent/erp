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

export const clientTypes = ["전체", "선사", "발주처", "협력업체", "공급업체", "잠재고객"];

