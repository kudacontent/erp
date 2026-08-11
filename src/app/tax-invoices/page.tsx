import Link from "next/link";
import { ArrowLeft, ReceiptText } from "lucide-react";
import { TaxInvoiceWorkspace } from "@/components/tax-invoice-workspace";
import { getTaxInvoiceSupplierDefaults } from "@/lib/barobill-tax-invoice";
import { getClientsForList } from "@/lib/clients-service";
import { prisma } from "@/lib/prisma";

export default async function TaxInvoicesPage({ searchParams }: { searchParams: Promise<{ contractId?: string }> }) {
  const params = await searchParams;
  const [clients, initialContract] = await Promise.all([
    getClientsForList(),
    params.contractId && process.env.DATABASE_URL
      ? prisma.projectContract.findUnique({
          where: { id: params.contractId },
          include: { client: true }
        })
      : Promise.resolve(null)
  ]);
  const supplierDefaults = getTaxInvoiceSupplierDefaults();

  return (
    <main className="min-w-0 px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/contracts" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-marine">
            <ArrowLeft className="h-4 w-4" />
            계약 및 매출
          </Link>
          <div className="flex items-center gap-3">
            <ReceiptText className="h-7 w-7 text-marine" />
            <h2 className="text-3xl font-bold text-ink">세금계산서 발행</h2>
          </div>
          <p className="mt-2 text-sm text-steel">견적·계약 금액을 기준으로 세금계산서 발행 요청을 준비합니다.</p>
        </div>
      </section>
      <TaxInvoiceWorkspace
        clients={clients}
        supplierDefaults={supplierDefaults}
        initialContract={initialContract ? {
          id: initialContract.id,
          clientId: initialContract.clientId,
          projectTitle: initialContract.projectTitle,
          client: {
            name: initialContract.client.name,
            businessNumber: initialContract.client.businessNumber || "",
            ceoName: initialContract.client.ceoName || "",
            address: initialContract.client.address || "",
            email: initialContract.client.email || "",
            phone: initialContract.client.phone || ""
          }
        } : undefined}
      />
    </main>
  );
}
