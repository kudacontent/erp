-- 견적서를 DB 에 저장한다.
--
-- 그동안 견적서 화면은 브라우저 localStorage 에만 남아서
-- 다른 직원이 볼 수도, 지난 견적을 다시 찾을 수도 없었다.
-- 실무에서 견적서는 계약보다 자주 쓰이므로 정식 문서로 승격한다.
--
-- 견적 → 계약 전개는 contractId 로 연결한다.

CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED');

CREATE TABLE "Estimate" (
    "id" TEXT NOT NULL,
    "estimateNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clientId" TEXT,
    "recipient" TEXT,
    "reference" TEXT,
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "validityNote" TEXT,
    "supplyAmount" BIGINT NOT NULL DEFAULT 0,
    "vatAmount" BIGINT NOT NULL DEFAULT 0,
    "totalAmount" BIGINT NOT NULL DEFAULT 0,
    "otherContent" TEXT,
    "supplierNumber" TEXT,
    "supplierName" TEXT,
    "supplierRepresentative" TEXT,
    "supplierAddress" TEXT,
    "supplierPhone" TEXT,
    "supplierEmail" TEXT,
    "memo" TEXT,
    "contractId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estimate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Estimate_estimateNo_key" ON "Estimate"("estimateNo");
CREATE INDEX "Estimate_clientId_idx" ON "Estimate"("clientId");
CREATE INDEX "Estimate_status_issuedAt_idx" ON "Estimate"("status", "issuedAt");

CREATE TABLE "EstimateItem" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "section" TEXT,
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

    CONSTRAINT "EstimateItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EstimateItem_estimateId_sortOrder_idx" ON "EstimateItem"("estimateId", "sortOrder");

ALTER TABLE "Estimate"
  ADD CONSTRAINT "Estimate_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Estimate"
  ADD CONSTRAINT "Estimate_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "ProjectContract"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Estimate"
  ADD CONSTRAINT "Estimate_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EstimateItem"
  ADD CONSTRAINT "EstimateItem_estimateId_fkey"
  FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
