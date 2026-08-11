-- CreateEnum
CREATE TYPE "TaxInvoiceStatus" AS ENUM ('DRAFT', 'ISSUING', 'ISSUED', 'FAILED', 'CANCELED');

-- CreateTable
CREATE TABLE "TaxInvoice" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "contractId" TEXT,
    "createdById" TEXT,
    "mgtKey" TEXT NOT NULL,
    "issueDirection" INTEGER NOT NULL DEFAULT 1,
    "taxInvoiceType" INTEGER NOT NULL DEFAULT 1,
    "taxType" INTEGER NOT NULL DEFAULT 1,
    "taxCalcType" INTEGER NOT NULL DEFAULT 1,
    "purposeType" INTEGER NOT NULL DEFAULT 2,
    "writeDate" TEXT NOT NULL,
    "invoicerCorpNum" TEXT NOT NULL,
    "invoicerTaxRegId" TEXT,
    "invoicerCorpName" TEXT NOT NULL,
    "invoicerCeoName" TEXT NOT NULL,
    "invoicerAddress" TEXT NOT NULL,
    "invoicerBizClass" TEXT,
    "invoicerBizType" TEXT,
    "invoicerContactId" TEXT,
    "invoicerContactName" TEXT,
    "invoicerTel" TEXT,
    "invoicerHp" TEXT,
    "invoicerEmail" TEXT,
    "invoiceeCorpNum" TEXT NOT NULL,
    "invoiceeTaxRegId" TEXT,
    "invoiceeCorpName" TEXT NOT NULL,
    "invoiceeCeoName" TEXT NOT NULL,
    "invoiceeAddress" TEXT NOT NULL,
    "invoiceeBizClass" TEXT,
    "invoiceeBizType" TEXT,
    "invoiceeContactName" TEXT,
    "invoiceeTel" TEXT,
    "invoiceeHp" TEXT,
    "invoiceeEmail" TEXT,
    "cash" TEXT,
    "chkBill" TEXT,
    "note" TEXT,
    "credit" TEXT,
    "remark1" TEXT,
    "remark2" TEXT,
    "remark3" TEXT,
    "sendSms" BOOLEAN NOT NULL DEFAULT false,
    "forceIssue" BOOLEAN NOT NULL DEFAULT false,
    "mailTitle" TEXT,
    "amountTotal" BIGINT NOT NULL,
    "taxTotal" BIGINT NOT NULL,
    "totalAmount" BIGINT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerResultCode" INTEGER,
    "providerMessage" TEXT,
    "providerStatus" INTEGER,
    "invoiceKey" TEXT,
    "approvalNumber" TEXT,
    "issuedAt" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "status" "TaxInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxInvoiceItem" (
    "id" TEXT NOT NULL,
    "taxInvoiceId" TEXT NOT NULL,
    "purchaseDate" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "information" TEXT,
    "chargeableUnit" TEXT NOT NULL,
    "unitPrice" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "tax" BIGINT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TaxInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxInvoice_mgtKey_key" ON "TaxInvoice"("mgtKey");
CREATE INDEX "TaxInvoice_status_writeDate_idx" ON "TaxInvoice"("status", "writeDate");
CREATE INDEX "TaxInvoice_clientId_idx" ON "TaxInvoice"("clientId");

-- AddForeignKey
ALTER TABLE "TaxInvoice" ADD CONSTRAINT "TaxInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaxInvoice" ADD CONSTRAINT "TaxInvoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ProjectContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaxInvoice" ADD CONSTRAINT "TaxInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaxInvoiceItem" ADD CONSTRAINT "TaxInvoiceItem_taxInvoiceId_fkey" FOREIGN KEY ("taxInvoiceId") REFERENCES "TaxInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
