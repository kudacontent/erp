import Link from "next/link";
import { ArrowLeft, ReceiptText } from "lucide-react";
import { TaxInvoiceWorkspace } from "@/components/tax-invoice-workspace";
import { getTaxInvoiceSupplierDefaults } from "@/lib/barobill-tax-invoice";
import { getClientsForList } from "@/lib/clients-service";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

// 이 화면은 항상 최신 데이터를 보여줘야 한다
export const dynamic = "force-dynamic";

// 회사의 돈에 관한 화면이다. 권한이 없으면 대시보드로 돌려보낸다.
const FINANCE_ROLES = ["CEO", "ADMIN", "ACCOUNTING", "OPERATIONS", "AUDITOR"];

export default async function TaxInvoicesPage({ searchParams }: { searchParams: Promise<{ contractId?: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/tax-invoices");
  }

  if (!FINANCE_ROLES.includes(user.role)) {
    redirect("/");
  }

  const params = await searchParams;
  const [clients, initialContract] = await Promise.all([
    getClientsForList(),
    params.contractId && process.env.DATABASE_URL
      ? prisma.projectContract.findUnique({
          where: { id: params.contractId },
          include: { client: true, items: { orderBy: { sortOrder: "asc" } } }
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
          <p className="mt-2 text-sm text-steel">홈택스 건별 발급 흐름에 맞춰 공급자·공급받는자·품목을 입력하고 바로빌로 발급 요청합니다.</p>
        </div>
      </section>
      <TaxInvoiceWorkspace
        clients={clients}
        supplierDefaults={supplierDefaults}
        initialContract={initialContract ? {
          id: initialContract.id,
          clientId: initialContract.clientId,
          projectTitle: initialContract.projectTitle,
          items: initialContract.items.map((item) => ({
            name: item.name,
            spec: item.spec,
            quantity: Number(item.quantity),
            unitPrice: item.unitPrice.toString(),
            supplyAmount: item.supplyAmount.toString(),
            vatAmount: item.vatAmount.toString()
          })),
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
