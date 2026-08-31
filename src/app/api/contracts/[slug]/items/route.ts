import { NextResponse } from "next/server";
import { z } from "zod";
import { FINANCE_READ_ROLES, withAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const writableRoles = ["CEO", "ADMIN", "OPERATIONS", "ACCOUNTING"] as const;

/**
 * 계약 품목.
 *
 * 품목 수는 계약마다 다르므로 (한 줄짜리 용역부터 수십 줄짜리 납품까지)
 * 개별 행을 하나씩 저장하지 않고 "현재 표 전체"를 통째로 저장한다.
 * 화면에서 행을 추가·삭제·정렬해도 저장 한 번이면 서버 상태가 화면과 같아진다.
 */
const itemSchema = z.object({
  name: z.string().trim().min(1, "품목명을 입력하세요.").max(200),
  spec: z.string().trim().max(200).optional().nullable(),
  unit: z.string().trim().max(20).optional().nullable(),
  quantity: z.coerce.number().min(0, "수량을 확인하세요.").max(1_000_000),
  unitPrice: z.coerce.number().min(0, "단가를 확인하세요.").max(1_000_000_000_000),
  taxType: z.enum(["TAXABLE", "ZERO_RATED", "EXEMPT"]).default("TAXABLE"),
  memo: z.string().trim().max(500).optional().nullable()
});

const putSchema = z.object({
  items: z.array(itemSchema).max(200, "품목은 200개까지 저장할 수 있습니다.")
});

type ParsedItem = z.infer<typeof itemSchema>;

/**
 * 공급가액 = 수량 × 단가 (원 단위 반올림).
 * 부가세는 과세 품목만 10%, 영세율·면세는 0.
 */
function computeAmounts(item: ParsedItem) {
  const supply = Math.round(item.quantity * item.unitPrice);
  const vat = item.taxType === "TAXABLE" ? Math.round(supply / 10) : 0;
  return { supply: BigInt(supply), vat: BigInt(vat) };
}

function serializeItem(item: {
  id: string;
  sortOrder: number;
  name: string;
  spec: string | null;
  unit: string | null;
  quantity: unknown;
  unitPrice: bigint;
  supplyAmount: bigint;
  vatAmount: bigint;
  taxType: string;
  memo: string | null;
}) {
  return {
    id: item.id,
    sortOrder: item.sortOrder,
    name: item.name,
    spec: item.spec,
    unit: item.unit,
    quantity: Number(item.quantity),
    unitPrice: item.unitPrice.toString(),
    supplyAmount: item.supplyAmount.toString(),
    vatAmount: item.vatAmount.toString(),
    taxType: item.taxType,
    memo: item.memo
  };
}

export const GET = withAuth(async (_request, context) => {
  const { slug } = await context.params;

  const contract = await prisma.projectContract.findUnique({
    where: { id: slug },
    select: { id: true }
  });

  if (!contract) {
    return NextResponse.json({ ok: false, message: "계약을 찾을 수 없습니다." }, { status: 404 });
  }

  const items = await prisma.contractItem.findMany({
    where: { contractId: slug },
    orderBy: { sortOrder: "asc" }
  });

  return NextResponse.json({ ok: true, items: items.map(serializeItem) });
}, { roles: [...FINANCE_READ_ROLES] });

export const PUT = withAuth(async (request, context, user) => {
  const { slug } = await context.params;
  const parsed = putSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.projectContract.findUnique({
    where: { id: slug },
    select: {
      id: true,
      contractStatus: true,
      contractAmount: true,
      vatAmount: true,
      totalAmount: true,
      _count: { select: { taxInvoices: true } }
    }
  });

  if (!existing) {
    return NextResponse.json({ ok: false, message: "계약을 찾을 수 없습니다." }, { status: 404 });
  }

  if (existing.contractStatus === "CANCELED") {
    return NextResponse.json({ ok: false, message: "취소된 계약의 품목은 수정할 수 없습니다." }, { status: 409 });
  }

  // 세금계산서가 이미 나간 계약의 금액을 바꾸면 발행분과 어긋난다
  if (existing._count.taxInvoices > 0) {
    return NextResponse.json(
      { ok: false, message: "세금계산서가 발행된 계약입니다. 품목을 바꾸려면 세금계산서를 먼저 처리하세요." },
      { status: 409 }
    );
  }

  const rows = parsed.data.items.map((item, index) => {
    const { supply, vat } = computeAmounts(item);
    return {
      contractId: slug,
      sortOrder: index,
      name: item.name,
      spec: item.spec || null,
      unit: item.unit || null,
      quantity: item.quantity,
      unitPrice: BigInt(Math.round(item.unitPrice)),
      supplyAmount: supply,
      vatAmount: vat,
      taxType: item.taxType,
      memo: item.memo || null
    };
  });

  const supplyTotal = rows.reduce((sum, row) => sum + row.supplyAmount, BigInt(0));
  const vatTotal = rows.reduce((sum, row) => sum + row.vatAmount, BigInt(0));

  // 품목이 하나도 없으면 계약 금액은 손대지 않는다.
  // (품목을 쓰지 않고 총액만 직접 입력하는 계약도 있기 때문)
  const updateAmounts = rows.length > 0;

  const [, , contract] = await prisma.$transaction([
    prisma.contractItem.deleteMany({ where: { contractId: slug } }),
    prisma.contractItem.createMany({ data: rows }),
    prisma.projectContract.update({
      where: { id: slug },
      data: updateAmounts
        ? { contractAmount: supplyTotal, vatAmount: vatTotal, totalAmount: supplyTotal + vatTotal }
        : {}
    })
  ]);

  await prisma.auditLog
    .create({
      data: {
        action: "UPDATE",
        entityType: "CONTRACT_ITEM",
        entityId: slug,
        beforeData: { itemCount: null, totalAmount: existing.totalAmount.toString() },
        afterData: { itemCount: rows.length, totalAmount: contract.totalAmount.toString() },
        userId: user.id
      }
    })
    .catch(() => undefined);

  const items = await prisma.contractItem.findMany({
    where: { contractId: slug },
    orderBy: { sortOrder: "asc" }
  });

  return NextResponse.json({
    ok: true,
    items: items.map(serializeItem),
    totals: {
      supplyAmount: contract.contractAmount.toString(),
      vatAmount: contract.vatAmount.toString(),
      totalAmount: contract.totalAmount.toString()
    }
  });
}, { roles: [...writableRoles], write: true });
