/**
 * 계약(계약/매출) 데이터만 지운다.
 *
 * scripts/clear-operational-data.mjs 는 거래처·직원·사용자까지 전부 지우므로
 * 테스트로 넣어 본 계약만 정리할 때는 이 스크립트를 쓴다.
 *
 * 실행:
 *   CLEAR_CONTRACTS=YES node scripts/clear-contracts.mjs
 *
 * 세금계산서까지 함께 지우려면:
 *   CLEAR_CONTRACTS=YES CLEAR_TAX_INVOICES=YES node scripts/clear-contracts.mjs
 *
 * 회의·일정은 지우지 않고 계약 연결만 끊는다.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const confirmation = process.env.CLEAR_CONTRACTS;
const clearTaxInvoices = process.env.CLEAR_TAX_INVOICES === "YES";

if (confirmation !== "YES") {
  throw new Error("Refusing to delete. Set CLEAR_CONTRACTS=YES to run.");
}

try {
  const before = {
    contracts: await prisma.projectContract.count(),
    taxInvoices: await prisma.taxInvoice.count(),
    linkedMeetings: await prisma.meeting.count({ where: { contractId: { not: null } } }),
    linkedEvents: await prisma.calendarEvent.count({ where: { contractId: { not: null } } })
  };

  console.log("삭제 전 상태:", JSON.stringify(before));

  if (before.contracts === 0) {
    console.log("지울 계약이 없습니다.");
    process.exit(0);
  }

  const result = await prisma.$transaction(async (tx) => {
    // 계약을 참조하는 것들의 연결을 먼저 끊는다 (회의·일정 자체는 남긴다)
    const meetings = await tx.meeting.updateMany({
      where: { contractId: { not: null } },
      data: { contractId: null }
    });
    const events = await tx.calendarEvent.updateMany({
      where: { contractId: { not: null } },
      data: { contractId: null }
    });

    let taxInvoices = { count: 0 };
    if (clearTaxInvoices) {
      taxInvoices = await tx.taxInvoice.deleteMany({});
    } else {
      taxInvoices = await tx.taxInvoice.updateMany({
        where: { contractId: { not: null } },
        data: { contractId: null }
      });
    }

    const contracts = await tx.projectContract.deleteMany({});

    return {
      계약_삭제: contracts.count,
      세금계산서: clearTaxInvoices ? `삭제 ${taxInvoices.count}건` : `연결만 해제 ${taxInvoices.count}건`,
      회의_연결해제: meetings.count,
      일정_연결해제: events.count
    };
  });

  console.log("완료:", JSON.stringify(result, null, 2));
  console.log(`남은 계약: ${await prisma.projectContract.count()}건`);
} finally {
  await prisma.$disconnect();
}
