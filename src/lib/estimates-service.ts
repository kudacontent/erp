import { prisma } from "@/lib/prisma";
import { formatWon } from "@/lib/money";

export const ESTIMATE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "작성 중",
  SENT: "발송",
  ACCEPTED: "수주 확정",
  REJECTED: "실주",
  EXPIRED: "기한 만료",
  CONVERTED: "계약 전환"
};

function formatDate(value: Date | null) {
  if (!value) return "-";
  return value.toISOString().slice(0, 10).replace(/-/g, ".");
}

/** 목록 화면용. 표에 바로 그릴 수 있는 문자열로 바꿔서 넘긴다 */
export async function getEstimatesForList() {
  const estimates = await prisma.estimate.findMany({
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    include: {
      client: { select: { id: true, name: true } },
      _count: { select: { items: true } }
    }
  });

  return estimates.map((estimate) => ({
    id: estimate.id,
    estimateNo: estimate.estimateNo,
    title: estimate.title,
    client: estimate.client?.name ?? estimate.recipient ?? "미지정",
    status: estimate.status,
    statusLabel: ESTIMATE_STATUS_LABEL[estimate.status] ?? estimate.status,
    issuedAt: formatDate(estimate.issuedAt),
    validUntil: formatDate(estimate.validUntil),
    total: formatWon(estimate.totalAmount),
    totalRaw: estimate.totalAmount.toString(),
    itemCount: estimate._count.items,
    converted: Boolean(estimate.contractId),
    contractId: estimate.contractId
  }));
}

/** 견적서 화면(편집·인쇄)용 원본 값 */
export async function getEstimateForEdit(id: string) {
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      items: { orderBy: { sortOrder: "asc" } }
    }
  });

  if (!estimate) return null;

  return {
    id: estimate.id,
    estimateNo: estimate.estimateNo,
    title: estimate.title,
    clientId: estimate.clientId,
    clientName: estimate.client?.name ?? null,
    recipient: estimate.recipient ?? "",
    reference: estimate.reference ?? "",
    status: estimate.status,
    issuedAt: estimate.issuedAt ? estimate.issuedAt.toISOString().slice(0, 10) : "",
    validUntil: estimate.validUntil ? estimate.validUntil.toISOString().slice(0, 10) : "",
    validityNote: estimate.validityNote ?? "",
    otherContent: estimate.otherContent ?? "",
    supplierNumber: estimate.supplierNumber ?? "",
    supplierName: estimate.supplierName ?? "",
    supplierRepresentative: estimate.supplierRepresentative ?? "",
    supplierAddress: estimate.supplierAddress ?? "",
    supplierPhone: estimate.supplierPhone ?? "",
    supplierEmail: estimate.supplierEmail ?? "",
    memo: estimate.memo ?? "",
    contractId: estimate.contractId,
    items: estimate.items.map((item) => ({
      id: item.id,
      section: item.section ?? "",
      name: item.name,
      spec: item.spec ?? "",
      unit: item.unit ?? "",
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxType: item.taxType as "TAXABLE" | "ZERO_RATED" | "EXEMPT"
    }))
  };
}

export type EstimateForEdit = NonNullable<Awaited<ReturnType<typeof getEstimateForEdit>>>;
export type EstimateListRow = Awaited<ReturnType<typeof getEstimatesForList>>[number];
