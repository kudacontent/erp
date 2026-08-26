import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { contracts as sampleContracts, type ContractRecord } from "@/lib/contracts-data";

type LocalContractStore = {
  contracts: ContractRecord[];
};

export type CreateContractInput = {
  clientName: string;
  projectTitle: string;
  supplyAmount: number;
  vatAmount: number;
  dueDate?: string;
  memo?: string;
};

const dataDirectory = path.join(process.cwd(), "data");
const storePath = path.join(dataDirectory, "local-contracts.json");

function formatManwon(value: number) {
  return `${value.toLocaleString("ko-KR")}만원`;
}

function createContractId() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `CON-${date}-${suffix}`;
}

function createContractSlug(id: string) {
  return id.toLowerCase().replaceAll("_", "-");
}

async function readStore(): Promise<LocalContractStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as LocalContractStore;

    return {
      contracts: Array.isArray(parsed.contracts) ? parsed.contracts : []
    };
  } catch {
    return { contracts: [] };
  }
}

async function writeStore(store: LocalContractStore) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function mergeContracts(localContracts: ContractRecord[]) {
  const localBySlug = new Map(localContracts.map((contract) => [contract.slug, contract]));
  const mergedSamples = sampleContracts.map((contract) => localBySlug.get(contract.slug) ?? contract);
  const localOnly = localContracts.filter((contract) => !sampleContracts.some((sample) => sample.slug === contract.slug));

  return [...localOnly, ...mergedSamples];
}

export async function getContractsForList() {
  const store = await readStore();

  return mergeContracts(store.contracts);
}

export async function getContractForDetail(slug: string) {
  const contracts = await getContractsForList();

  return contracts.find((contract) => contract.slug === slug);
}

export async function createContract(input: CreateContractInput) {
  const contractAmount = Number(input.supplyAmount);
  const vatAmount = Number(input.vatAmount);
  const totalAmount = contractAmount + vatAmount;
  const id = createContractId();

  const contract: ContractRecord = {
    slug: createContractSlug(id),
    id,
    client: input.clientName,
    title: input.projectTitle,
    supply: formatManwon(contractAmount),
    vat: formatManwon(vatAmount),
    total: formatManwon(totalAmount),
    billing: "발행 대기",
    payment: "미입금",
    due: input.dueDate || "-",
    status: "검토"
  };

  const store = await readStore();
  await writeStore({
    contracts: [contract, ...store.contracts.filter((item) => item.slug !== contract.slug)]
  });

  return contract;
}

function advanceContract(contract: ContractRecord): ContractRecord {
  if (contract.payment === "입금 완료") {
    return contract;
  }

  if (contract.billing === "발행 완료") {
    return {
      ...contract,
      payment: "입금 완료",
      status: "완료"
    };
  }

  if (contract.status === "완료") {
    return {
      ...contract,
      billing: "발행 완료",
      payment: "입금 대기"
    };
  }

  if (contract.status === "진행") {
    return {
      ...contract,
      status: "완료"
    };
  }

  return {
    ...contract,
    status: "진행"
  };
}

export async function advanceContractStatus(slug: string) {
  const current = await getContractForDetail(slug);

  if (!current) {
    return null;
  }

  const updated = advanceContract(current);
  const store = await readStore();

  await writeStore({
    contracts: [updated, ...store.contracts.filter((contract) => contract.slug !== slug)]
  });

  return updated;
}
