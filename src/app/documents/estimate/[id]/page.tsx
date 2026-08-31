import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { EstimateWorkspace } from "@/components/estimate-workspace";
import { EstimateConvertButton } from "@/components/estimate-convert-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ESTIMATE_STATUS_LABEL, getEstimateForEdit } from "@/lib/estimates-service";

export const dynamic = "force-dynamic";

const FINANCE_READ = ["CEO", "ADMIN", "ACCOUNTING", "OPERATIONS", "AUDITOR"];
const FINANCE_WRITE = ["CEO", "ADMIN", "ACCOUNTING", "OPERATIONS"];

export default async function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/documents/estimate/${id}`);
  }

  if (!FINANCE_READ.includes(user.role)) {
    redirect("/");
  }

  const estimate = await getEstimateForEdit(id);

  if (!estimate) {
    notFound();
  }

  const clients = await prisma.client.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true }
  });

  const canWrite = FINANCE_WRITE.includes(user.role);

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
            <h2 className="text-3xl font-bold text-ink">{estimate.title}</h2>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-sm text-steel">{estimate.estimateNo}</p>
            <StatusBadge status={ESTIMATE_STATUS_LABEL[estimate.status] ?? estimate.status} />
          </div>
        </div>

        {canWrite ? (
          <EstimateConvertButton
            estimateId={estimate.id}
            contractId={estimate.contractId}
            hasClient={Boolean(estimate.clientId)}
          />
        ) : null}
      </section>
      <EstimateWorkspace estimate={estimate} clients={clients} canEdit={canWrite} />
    </main>
  );
}
