-- 실제 업무 흐름에 맞춰 두 가지를 채운다.
--
--   견적서 → 스케줄 → 검사 → 인보이스 → 세금계산서 → 입금
--                      ~~~~   ~~~~~~~~
--                      없었음  인쇄만 되고 저장 안 됐음
--
-- 검사: 우리가 거래처에 제공하는 실제 용역이다 (합격·불합격 판정 절차가 아니다).
--       일정을 잡고 현장에서 수행하며, 이 작업이 끝나야 청구로 넘어간다.
-- 인보이스: 세금계산서와 별개인 청구 문서. 누구에게 얼마를 언제 청구했는지 남긴다.

CREATE TYPE "InspectionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'DONE', 'ON_HOLD');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'VOID');

ALTER TABLE "ProjectContract"
  ADD COLUMN "inspectionStatus" "InspectionStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "inspectionStartedAt" TIMESTAMP(3),
  ADD COLUMN "inspectionDoneAt" TIMESTAMP(3),
  ADD COLUMN "inspectorId" TEXT,
  ADD COLUMN "inspectionMemo" TEXT;

ALTER TABLE "ProjectContract"
  ADD CONSTRAINT "ProjectContract_inspectorId_fkey"
  FOREIGN KEY ("inspectorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clientId" TEXT,
    "contractId" TEXT,
    "recipient" TEXT,
    "reference" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "supplyAmount" BIGINT NOT NULL DEFAULT 0,
    "vatAmount" BIGINT NOT NULL DEFAULT 0,
    "totalAmount" BIGINT NOT NULL DEFAULT 0,
    "paymentTerms" TEXT,
    "otherContent" TEXT,
    "supplierNumber" TEXT,
    "supplierName" TEXT,
    "supplierRepresentative" TEXT,
    "supplierAddress" TEXT,
    "supplierPhone" TEXT,
    "supplierEmail" TEXT,
    "memo" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");
CREATE INDEX "Invoice_contractId_idx" ON "Invoice"("contractId");
CREATE INDEX "Invoice_status_issuedAt_idx" ON "Invoice"("status", "issuedAt");

CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
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

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvoiceItem_invoiceId_sortOrder_idx" ON "InvoiceItem"("invoiceId", "sortOrder");

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "ProjectContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceItem"
  ADD CONSTRAINT "InvoiceItem_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
