import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatWon } from "@/lib/money";
import type { ContractRecord } from "@/lib/contracts-data";

export type CreateContractInput = {
  clientName: string;
  projectTitle: string;
  supplyAmount: number;
  vatAmount: number;
  dueDate?: string;
  memo?: string;
};

type DbContract = Prisma.ProjectContractGetPayload<{ include: { client: true } }>;

function formatAmount(value: bigint | number) {
  return formatWon(value);
}

function formatContractId(contract: DbContract) {
  const date = contract.createdAt.toISOString().slice(0, 10).replaceAll("-", "");
  return `CON-${date}-${contract.id.slice(0, 4).toUpperCase()}`;
}

function displayBillingStatus(status: DbContract["billingStatus"]) {
  return status === "ISSUED" ? "발행 완료" : status === "CANCELED" ? "발행 취소" : "발행 대기";
}

function displayPaymentStatus(status: DbContract["paymentStatus"]) {
  return status === "PAID" ? "입금 완료" : status === "PARTIAL" ? "부분 입금" : "미입금";
}

function displayContractStatus(status: DbContract["contractStatus"]) {
  switch (status) {
    case "SIGNED":
    case "BILLING_PENDING":
    case "BILLING_DONE":
      return "진행";
    case "PAYMENT_PENDING":
    case "PARTIAL_PAYMENT":
      return "정산 중";
    case "PAID":
    case "CLOSED":
      return "완료";
    case "CANCELED":
      return "취소";
    default:
      return "검토";
  }
}

function toContractRecord(contract: DbContract): ContractRecord {
  return {
    slug: contract.id,
    id: formatContractId(contract),
    client: contract.client.name,
    title: contract.projectTitle,
    supply: formatAmount(contract.contractAmount),
    vat: formatAmount(contract.vatAmount),
    total: formatAmount(contract.totalAmount),
    billing: displayBillingStatus(contract.billingStatus),
    payment: displayPaymentStatus(contract.paymentStatus),
    due: contract.dueDate ? contract.dueDate.toISOString().slice(0, 10) : "-",
    status: displayContractStatus(contract.contractStatus)
  };
}

export async function getContractsForList(): Promise<ContractRecord[]> {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  try {
    const dbContracts = await prisma.projectContract.findMany({
      include: { client: true },
      orderBy: { createdAt: "desc" }
    });

    return dbContracts.map(toContractRecord);
  } catch {
    return [];
  }
}

export async function getContractForDetail(slug: string) {
  if (!process.env.DATABASE_URL) {
    return undefined;
  }

  try {
    const contract = await prisma.projectContract.findUnique({
      where: { id: slug },
      include: { client: true }
    });

    return contract ? toContractRecord(contract) : undefined;
  } catch {
    return undefined;
  }
}

export async function createContract(input: CreateContractInput) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const client = await prisma.client.findFirst({
    where: { name: input.clientName },
    select: { id: true }
  });

  if (!client) {
    throw new Error("CLIENT_NOT_FOUND");
  }

  const contractAmount = BigInt(Math.round(Number(input.supplyAmount)));
  const vatAmount = BigInt(Math.round(Number(input.vatAmount)));
  const dueDate = input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null;

  const contract = await prisma.projectContract.create({
    data: {
      clientId: client.id,
      projectTitle: input.projectTitle,
      contractAmount,
      vatAmount,
      totalAmount: contractAmount + vatAmount,
      dueDate: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
      memo: input.memo || null
    },
    include: { client: true }
  });

  return toContractRecord(contract);
}

export async function advanceContractStatus(slug: string) {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const current = await prisma.projectContract.findUnique({
    where: { id: slug },
    include: { client: true }
  });

  if (!current) {
    return null;
  }

  if (current.paymentStatus === "PAID") {
    return toContractRecord(current);
  }

  if (current.billingStatus === "ISSUED") {
    const updated = await prisma.projectContract.update({
      where: { id: slug },
      data: { paymentStatus: "PAID", contractStatus: "PAID", closedAt: new Date() },
      include: { client: true }
    });
    return toContractRecord(updated);
  }

  if (current.contractStatus === "DRAFT") {
    const updated = await prisma.projectContract.update({
      where: { id: slug },
      data: { contractStatus: "SIGNED", contractedAt: new Date() },
      include: { client: true }
    });
    return toContractRecord(updated);
  }

  const updated = await prisma.projectContract.update({
    where: { id: slug },
    data: { billingStatus: "ISSUED", contractStatus: "BILLING_DONE" },
    include: { client: true }
  });

  return toContractRecord(updated);
}

/**
 * 계약 진행 단계 판정에 필요한 사실들을 모은다.
 *
 * 각 단계가 "실제로 끝났는지" 는 다른 테이블에 흩어져 있다.
 * 견적서·일정·인보이스는 개수를 세고, 검사·세금계산서·입금은 계약의 상태 필드를 본다.
 */
export async function getContractLifecycleSignals(contractId: string) {
  const contract = await prisma.projectContract.findUnique({
    where: { id: contractId },
    select: {
      inspectionStatus: true,
      inspectionStartedAt: true,
      inspectionDoneAt: true,
      inspectionMemo: true,
      billingStatus: true,
      paymentStatus: true,
      contractStatus: true,
      inspector: { select: { name: true } },
      _count: { select: { estimates: true, calendarEvents: true, invoices: true } }
    }
  });

  if (!contract) return null;

  const sentInvoices = await prisma.invoice.count({
    where: { contractId, status: { in: ["SENT", "PAID"] } }
  });

  return {
    signals: {
      estimateCount: contract._count.estimates,
      scheduleCount: contract._count.calendarEvents,
      inspectionStatus: contract.inspectionStatus,
      invoiceCount: contract._count.invoices,
      invoiceSent: sentInvoices > 0,
      taxInvoiceIssued: contract.billingStatus === "ISSUED",
      paymentStatus: contract.paymentStatus,
      canceled: contract.contractStatus === "CANCELED"
    },
    inspection: {
      status: contract.inspectionStatus,
      startedAt: contract.inspectionStartedAt ? contract.inspectionStartedAt.toISOString().slice(0, 10) : null,
      doneAt: contract.inspectionDoneAt ? contract.inspectionDoneAt.toISOString().slice(0, 10) : null,
      inspector: contract.inspector?.name ?? null,
      memo: contract.inspectionMemo
    }
  };
}
