-- 계약에 품목(라인 아이템)을 추가한다.
--
-- 그동안 계약은 금액 하나(contractAmount)만 들고 있어서
-- "무엇을 얼마에 팔았는지" 를 담을 수 없었다.
-- 세금계산서에는 이미 TaxInvoiceItem 이 있어 구조가 어긋나 있었다.
--
-- 기존 계약은 품목이 없는 상태로 남는다. 금액은 그대로 유효하다.

CREATE TYPE "TaxType" AS ENUM ('TAXABLE', 'ZERO_RATED', 'EXEMPT');

CREATE TABLE "ContractItem" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "spec" TEXT,
    "unit" TEXT,
    "quantity" DECIMAL(14,2) NOT NULL DEFAULT 1,
    "unitPrice" BIGINT NOT NULL DEFAULT 0,
    "supplyAmount" BIGINT NOT NULL DEFAULT 0,
    "vatAmount" BIGINT NOT NULL DEFAULT 0,
    "taxType" "TaxType" NOT NULL DEFAULT 'TAXABLE',
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContractItem_contractId_sortOrder_idx" ON "ContractItem"("contractId", "sortOrder");

ALTER TABLE "ContractItem"
  ADD CONSTRAINT "ContractItem_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "ProjectContract"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
