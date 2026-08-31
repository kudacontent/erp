import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, FileText, FileSignature, ReceiptText } from "lucide-react";
import { ContractAdvanceButton } from "@/components/contract-advance-button";
import { ContractItems } from "@/components/contract-items";
import { EntityActions } from "@/components/ui/entity-actions";
import {
  contractActivity,
  getContractDocuments,
  contractFiles,
  getContractLifecycle,
  getContractNextActions
} from "@/lib/contracts-data";
import { getContractForDetail } from "@/lib/contracts-service";
import { getCurrentUser } from "@/lib/auth";
import { isHardDeleteEnabled } from "@/lib/hard-delete";

// 계약 금액과 품목은 등록·수정 즉시 반영되어야 한다.
// 이 선언이 없으면 빌드 시점 스냅샷이 정적 파일로 굳어 최신 값이 보이지 않는다.
export const dynamic = "force-dynamic";

// 회사의 돈에 관한 화면이다. 목록 화면과 같은 기준으로 막는다.
const FINANCE_READ = ["CEO", "ADMIN", "ACCOUNTING", "OPERATIONS", "AUDITOR"];
// 품목을 고칠 수 있는 역할. 감사(AUDITOR)는 보기만 한다.
const FINANCE_WRITE = ["CEO", "ADMIN", "ACCOUNTING", "OPERATIONS"];

function lifecycleClass(state: string) {
  if (state === "done") {
    return "border-marine bg-[#e8f5fb] text-marine";
  }

  if (state === "active") {
    return "border-marine bg-marine text-white";
  }

  return "border-line bg-paper text-steel";
}

function actionClass(tone: string) {
  if (tone === "primary") {
    return "bg-marine text-white";
  }

  return "border border-line bg-white text-ink";
}

export default async function ContractDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/contracts/${slug}`);
  }

  if (!FINANCE_READ.includes(user.role)) {
    redirect("/");
  }

  const contract = await getContractForDetail(slug);

  if (!contract) {
    notFound();
  }

  const lifecycle = getContractLifecycle(contract);
  const nextActions = getContractNextActions(contract);

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/contracts" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-marine">
            <ArrowLeft className="h-4 w-4" />
            계약 목록
          </Link>
          <h2 className="text-3xl font-bold text-ink">{contract.title}</h2>
          <p className="mt-2 text-sm text-steel">{contract.client} · {contract.id}</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <ContractAdvanceButton slug={contract.slug} />
          <EntityActions
            allowHardDelete={isHardDeleteEnabled() && user.role === "CEO"}
            endpoint={`/api/contracts/${contract.slug}`}
            resourceKey="contract"
            displayName={contract.title}
            editLabel="계약 수정"
            deleteLabel="계약 취소"
            deleteDescription="계약 상태가 '취소'로 바뀝니다. 기록은 그대로 남고 목록에서 취소 상태로 보입니다. 세금계산서가 발행됐거나 입금이 확인된 계약은 취소되지 않습니다."
            redirectTo="/contracts"
            fields={[
              { key: "projectTitle", label: "계약명", required: true, wide: true },
              { key: "supplyAmount", label: "공급가액", type: "number", hint: "원 단위" },
              { key: "vatAmount", label: "부가세", type: "number", hint: "원 단위" },
              { key: "contractedAt", label: "계약일", type: "date" },
              { key: "dueDate", label: "입금 예정일", type: "date" },
              { key: "memo", label: "메모", type: "textarea", wide: true }
            ]}
          />
        </div>
      </section>

      <section className="mb-6 rounded-md border border-line bg-white p-5">
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-bold text-ink">계약 진행 단계</h3>
            <p className="mt-1 text-sm text-steel">{contract.client} 계약의 현재 처리 위치</p>
          </div>
          <p className="text-sm font-bold text-marine">{contract.status} · {contract.billing} · {contract.payment}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          {lifecycle.map((step, index) => (
            <div key={step.key} className={`rounded-md border p-4 ${lifecycleClass(step.state)}`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="text-xs font-bold">{String(index + 1).padStart(2, "0")}</span>
                {step.state === "done" ? <CheckCircle2 className="h-4 w-4" /> : null}
              </div>
              <p className="font-bold">{step.label}</p>
              <p className={["mt-2 text-xs leading-5", step.state === "active" ? "text-white/80" : "text-steel"].join(" ")}>
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-md border border-line bg-white p-5">
          <p className="text-sm text-steel">공급가액</p>
          <p className="mt-3 text-2xl font-bold text-ink">{contract.supply}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-5">
          <p className="text-sm text-steel">부가세</p>
          <p className="mt-3 text-2xl font-bold text-ink">{contract.vat}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-5">
          <p className="text-sm text-steel">합계</p>
          <p className="mt-3 text-2xl font-bold text-marine">{contract.total}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-5">
          <p className="text-sm text-steel">입금 예정일</p>
          <p className="mt-3 text-2xl font-bold text-ink">{contract.due}</p>
        </div>
      </section>

      <div className="mb-6">
        <ContractItems slug={contract.slug} canEdit={FINANCE_WRITE.includes(user.role)} />
      </div>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-line bg-white p-5">
          <h3 className="mb-5 font-bold text-ink">정산 상태</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md bg-paper p-4">
              <p className="text-sm text-steel">계약 상태</p>
              <p className="mt-2 text-xl font-bold text-ink">{contract.status}</p>
            </div>
            <div className="rounded-md bg-paper p-4">
              <p className="text-sm text-steel">세금계산서</p>
              <p className="mt-2 text-xl font-bold text-ink">{contract.billing}</p>
            </div>
            <div className="rounded-md bg-paper p-4">
              <p className="text-sm text-steel">입금</p>
              <p className="mt-2 text-xl font-bold text-ink">{contract.payment}</p>
            </div>
          </div>
        </div>

        <aside className="rounded-md border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">다음 처리</h3>
          </div>
          <div className="space-y-3">
            {nextActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`block rounded-md px-3 py-3 text-center text-sm font-bold ${actionClass(action.tone)}`}
              >
                {action.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 rounded-md bg-paper px-3 py-3">
            <p className="text-sm text-steel">현재 우선순위</p>
            <p className="mt-1 text-sm font-bold text-ink">
              {contract.billing === "발행 완료" ? "입금 확인 후 정산 마감" : "문서 확정 후 발행 요청"}
            </p>
          </div>
        </aside>
      </section>

      <section className="mb-6 rounded-md border border-line bg-white p-5">
        <div className="mb-5 flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-marine" />
          <h3 className="font-bold text-ink">이어서 할 일</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {getContractDocuments(contract.slug).map((document) => (
            <div key={document.title} className="rounded-md border border-line bg-paper p-4">
              <div>
                <p className="font-bold text-ink">{document.title}</p>
                <p className="mt-2 text-sm leading-5 text-steel">{document.description}</p>
              </div>
              <Link
                href={document.href}
                className="mt-4 block w-full rounded-md border border-line bg-white px-3 py-2 text-center text-sm font-medium text-marine"
              >
                {document.action}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">이력</h3>
          </div>
          <div className="space-y-3">
            {contractActivity.map((item) => (
              <div key={`${item.date}-${item.title}`} className="flex items-center gap-3 rounded-md bg-paper px-3 py-3">
                <span className="w-24 shrink-0 text-sm font-bold text-marine">{item.date}</span>
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{item.title}</p>
                <span className="rounded-md bg-white px-2 py-1 text-xs text-steel">{item.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-marine" />
            <h3 className="font-bold text-ink">첨부 문서</h3>
          </div>
          <div className="space-y-3">
            {contractFiles.map((file) => (
              <div key={file.name} className="rounded-md bg-paper px-3 py-3">
                <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                <p className="mt-1 text-xs text-steel">{file.type} · {file.date}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
