import Link from "next/link";
import { ArrowRight, FileCheck2 } from "lucide-react";

type TaxInvoiceIssuePayload = {
  contractId: string;
  clientName: string;
  itemName: string;
  supplyAmount: string;
  vatAmount: string;
  totalAmount: string;
  dueDate: string;
};

export function TaxInvoiceIssuePanel({ payload }: { payload: TaxInvoiceIssuePayload }) {
  return (
    <section className="rounded-md border border-line bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <FileCheck2 className="h-5 w-5 text-marine" />
        <h3 className="font-bold text-ink">일반 세금계산서 발행</h3>
      </div>
      <p className="text-sm leading-6 text-steel">{payload.clientName} · {payload.itemName} · {payload.totalAmount}</p>
      <p className="mt-3 rounded-md bg-paper px-3 py-3 text-xs leading-5 text-steel">공급자·공급받는자 정보와 품목을 확인한 뒤 발급하도록 일반 작성 화면으로 연결합니다.</p>
      <Link href={`/tax-invoices?contractId=${encodeURIComponent(payload.contractId)}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-marine px-3 py-3 text-sm font-medium text-white">
        세금계산서 작성 열기
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
