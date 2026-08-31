import { prisma } from "@/lib/prisma";
import type { ContractStatusPatch, ContractStatusSnapshot } from "@/lib/contract-status-sync";

/**
 * 계약 상태 규칙(contract-status-sync)을 실제 DB 에 적용한다.
 *
 * 규칙 자체는 순수 함수로 따로 두고(테스트 대상), 여기서는 읽고 쓰기만 한다.
 *
 * 이 함수는 실패해도 예외를 밖으로 던지지 않는다.
 * 세금계산서 발행처럼 이미 성공한 작업의 뒤처리로 호출되기 때문에,
 * 여기서 터지면 발행은 됐는데 사용자에게는 실패로 보이는 최악의 상황이 된다.
 */
export async function applyContractPatch(
  contractId: string,
  decide: (snapshot: ContractStatusSnapshot) => ContractStatusPatch | null,
  context: { action: string; userId?: string | null }
) {
  try {
    const current = await prisma.projectContract.findUnique({
      where: { id: contractId },
      select: { contractStatus: true, billingStatus: true, paymentStatus: true }
    });

    if (!current) {
      return null;
    }

    const patch = decide(current as ContractStatusSnapshot);

    if (!patch) {
      return null;
    }

    await prisma.projectContract.update({ where: { id: contractId }, data: patch });

    await prisma.auditLog
      .create({
        data: {
          action: context.action,
          entityType: "PROJECT_CONTRACT",
          entityId: contractId,
          beforeData: current,
          afterData: JSON.parse(JSON.stringify(patch)),
          userId: context.userId ?? null
        }
      })
      .catch(() => undefined);

    return patch;
  } catch {
    return null;
  }
}
