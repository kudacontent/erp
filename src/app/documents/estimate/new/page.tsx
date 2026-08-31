import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { EstimateWorkspace } from "@/components/estimate-workspace";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FINANCE_WRITE = ["CEO", "ADMIN", "ACCOUNTING", "OPERATIONS"];

export default async function NewEstimatePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/documents/estimate/new");
  }

  if (!FINANCE_WRITE.includes(user.role)) {
    redirect("/documents/estimate");
  }

  const clients = await prisma.client.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true }
  });

  return (
    <main className="document-page min-w-0 px-5 py-6 sm:px-8">
      <section className="document-page-header mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/documents/estimate" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-marine">
            <ArrowLeft className="h-4 w-4" />
            견적서 목록
          </Link>
          <div className="flex items-center gap-3">
            <FileText className="h-7 w-7 text-marine" />
            <h2 className="text-3xl font-bold text-ink">새 견적서</h2>
          </div>
          <p className="mt-2 text-sm text-steel">
            항목을 작성하고 저장하면 견적번호가 매겨지고 목록에서 다시 열 수 있습니다.
          </p>
        </div>
      </section>
      <EstimateWorkspace clients={clients} canEdit />
    </main>
  );
}
