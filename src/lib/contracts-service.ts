import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
  return `${Number(value).toLocaleString("ko-KR")}만원`;
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
