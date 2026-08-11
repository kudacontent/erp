import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { EstimateWorkspace } from "@/components/estimate-workspace";

export default function EstimatePage() {
  return (
    <main className="document-page min-w-0 px-5 py-6 sm:px-8">
      <section className="document-page-header mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/contracts" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-marine">
            <ArrowLeft className="h-4 w-4" />
            계약 및 매출
          </Link>
          <div className="flex items-center gap-3">
            <FileText className="h-7 w-7 text-marine" />
            <h2 className="text-3xl font-bold text-ink">견적서</h2>
          </div>
          <p className="mt-2 text-sm text-steel">견적서 자체에서 항목을 작성하고 저장·인쇄합니다.</p>
        </div>
      </section>
      <EstimateWorkspace />
    </main>
  );
}
