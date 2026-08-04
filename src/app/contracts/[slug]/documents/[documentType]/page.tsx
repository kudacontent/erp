import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Send, Save } from "lucide-react";
import { TaxInvoiceIssuePanel } from "@/components/tax-invoice-issue-panel";
import { documentTemplates } from "@/lib/contracts-data";
import { getContractForDetail } from "@/lib/contracts-service";

type DocumentType = keyof typeof documentTemplates;

export default async function ContractDocumentPage({
  params
}: {
  params: Promise<{ slug: string; documentType: string }>;
}) {
  const { slug, documentType } = await params;
  const contract = await getContractForDetail(slug);
  const template = documentTemplates[documentType as DocumentType];

  if (!contract || !template) {
    notFound();
  }

  const inputClass = "mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-marine";

  if (documentType === "quote") {
    return (
      <main className="px-5 py-6 sm:px-8">
        <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href={`/contracts/${contract.slug}`} className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-marine">
              <ArrowLeft className="h-4 w-4" />
              계약 상세
            </Link>
            <h2 className="text-3xl font-bold text-ink">견적서</h2>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink">
              미리보기
            </button>
            <button className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
              <Save className="h-4 w-4" />
              저장
            </button>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="rounded-md border border-line bg-white p-8">
            <div className="mb-8 flex items-start justify-between border-b-2 border-ink pb-6">
              <div>
                <p className="text-sm font-bold text-marine">KUDALABS</p>
                <h3 className="mt-2 text-4xl font-bold tracking-wide text-ink">견적서</h3>
              </div>
              <div className="text-right text-sm text-steel">
                <p>견적번호: 계약 기준 자동 생성</p>
                <p>작성일: 작성 시 입력</p>
                <p>유효기간: 작성일로부터 14일</p>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-line p-4">
                <p className="mb-3 text-sm font-bold text-marine">공급자</p>
                <p className="font-bold text-ink">쿠다랩스</p>
                <p className="mt-2 text-sm text-steel">사업자 정보는 운영 설정을 사용합니다.</p>
                <p className="mt-1 text-sm text-steel">연락처는 운영 설정을 사용합니다.</p>
              </div>
              <div className="rounded-md border border-line p-4">
                <p className="mb-3 text-sm font-bold text-marine">공급받는 자</p>
                <p className="font-bold text-ink">{contract.client}</p>
                <p className="mt-2 text-sm text-steel">담당자: 계약에 연결된 담당자</p>
                <p className="mt-1 text-sm text-steel">견적 대상: {contract.title}</p>
              </div>
            </div>

            <table className="mb-6 w-full border-collapse text-sm">
              <thead className="bg-paper text-steel">
                <tr>
                  <th className="border border-line px-3 py-3 text-left font-medium">품목</th>
                  <th className="border border-line px-3 py-3 text-right font-medium">수량</th>
                  <th className="border border-line px-3 py-3 text-right font-medium">공급가액</th>
                  <th className="border border-line px-3 py-3 text-right font-medium">부가세</th>
                  <th className="border border-line px-3 py-3 text-right font-medium">합계</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-line px-3 py-4 font-medium text-ink">{contract.title}</td>
                  <td className="border border-line px-3 py-4 text-right text-steel">1식</td>
                  <td className="border border-line px-3 py-4 text-right text-steel">{contract.supply}</td>
                  <td className="border border-line px-3 py-4 text-right text-steel">{contract.vat}</td>
                  <td className="border border-line px-3 py-4 text-right font-bold text-ink">{contract.total}</td>
                </tr>
              </tbody>
            </table>

            <div className="mb-6 grid gap-4 md:grid-cols-[1fr_280px]">
              <div className="rounded-md border border-line p-4">
                <p className="mb-3 text-sm font-bold text-marine">작업 범위</p>
                <ul className="space-y-2 text-sm text-steel">
                  <li>계약에 정의된 작업 수행</li>
                  <li>작업 데이터 정리 및 결과 리포트 제공</li>
                  <li>현장 안전 점검 및 장비 회수</li>
                </ul>
              </div>
              <div className="rounded-md bg-paper p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-steel">공급가액</span>
                  <span className="font-bold text-ink">{contract.supply}</span>
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-steel">부가세</span>
                  <span className="font-bold text-ink">{contract.vat}</span>
                </div>
                <div className="mt-4 border-t border-line pt-4">
                  <div className="flex justify-between">
                    <span className="font-bold text-ink">총 견적금액</span>
                    <span className="text-xl font-bold text-marine">{contract.total}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-line p-4 text-sm text-steel">
              <p className="font-bold text-ink">비고</p>
              <p className="mt-2">본 견적은 현장 조건 및 작업 범위 변경에 따라 조정될 수 있습니다.</p>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-md border border-line bg-white p-5">
              <h3 className="mb-4 font-bold text-ink">견적서 상태</h3>
              <div className="space-y-3">
                <div className="rounded-md bg-paper px-3 py-3">
                  <p className="text-sm text-steel">작성 상태</p>
                  <p className="mt-1 text-sm font-bold text-ink">초안</p>
                </div>
                <div className="rounded-md bg-paper px-3 py-3">
                  <p className="text-sm text-steel">승인 상태</p>
                  <p className="mt-1 text-sm font-bold text-ink">검토 전</p>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </main>
    );
  }

  if (documentType === "contract") {
    return (
      <main className="px-5 py-6 sm:px-8">
        <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href={`/contracts/${contract.slug}`} className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-marine">
              <ArrowLeft className="h-4 w-4" />
              계약 상세
            </Link>
            <h2 className="text-3xl font-bold text-ink">계약서</h2>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink">
              미리보기
            </button>
            <button className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
              <Save className="h-4 w-4" />
              저장
            </button>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="rounded-md border border-line bg-white p-8">
            <div className="mb-8 border-b-2 border-ink pb-6 text-center">
              <p className="text-sm font-bold text-marine">KUDALABS</p>
              <h3 className="mt-2 text-4xl font-bold tracking-wide text-ink">용역 계약서</h3>
              <p className="mt-3 text-sm text-steel">{contract.id} · 작성일 입력 필요</p>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-line p-4">
                <p className="mb-3 text-sm font-bold text-marine">갑</p>
                <p className="font-bold text-ink">{contract.client}</p>
                <p className="mt-2 text-sm text-steel">담당자: 계약에 연결된 담당자</p>
                <p className="mt-1 text-sm text-steel">계약 상태: {contract.status}</p>
              </div>
              <div className="rounded-md border border-line p-4">
                <p className="mb-3 text-sm font-bold text-marine">을</p>
                <p className="font-bold text-ink">쿠다랩스</p>
                <p className="mt-2 text-sm text-steel">계약에 정의된 서비스 및 기술지원</p>
                <p className="mt-1 text-sm text-steel">정산 담당: 운영팀</p>
              </div>
            </div>

            <div className="mb-6 rounded-md border border-line">
              <div className="grid border-b border-line md:grid-cols-[180px_1fr]">
                <p className="bg-paper px-4 py-3 text-sm font-bold text-ink">계약명</p>
                <p className="px-4 py-3 text-sm text-steel">{contract.title}</p>
              </div>
              <div className="grid border-b border-line md:grid-cols-[180px_1fr]">
                <p className="bg-paper px-4 py-3 text-sm font-bold text-ink">계약금액</p>
                <p className="px-4 py-3 text-sm text-steel">{contract.total} (공급가액 {contract.supply}, 부가세 {contract.vat})</p>
              </div>
              <div className="grid border-b border-line md:grid-cols-[180px_1fr]">
                <p className="bg-paper px-4 py-3 text-sm font-bold text-ink">계약 기간</p>
                <p className="px-4 py-3 text-sm text-steel">계약 체결일로부터 정산 완료일까지</p>
              </div>
              <div className="grid md:grid-cols-[180px_1fr]">
                <p className="bg-paper px-4 py-3 text-sm font-bold text-ink">정산 조건</p>
                <p className="px-4 py-3 text-sm text-steel">작업 완료 및 결과 리포트 제출 후 세금계산서 발행, 지급기한 {contract.due}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-md border border-line p-4">
                <h4 className="mb-3 text-sm font-bold text-marine">작업 범위</h4>
                <ul className="space-y-2 text-sm text-steel">
                  <li>장비 운용 및 현장 상태 기록</li>
                  <li>현장 점검 데이터 정리 및 이상 항목 보고</li>
                  <li>결과 리포트와 정산 자료 제출</li>
                </ul>
              </section>
              <section className="rounded-md border border-line p-4">
                <h4 className="mb-3 text-sm font-bold text-marine">검수 기준</h4>
                <ul className="space-y-2 text-sm text-steel">
                  <li>촬영 데이터와 작업일지가 누락 없이 제출되어야 합니다.</li>
                  <li>추가 작업은 양사 협의 후 별도 정산합니다.</li>
                  <li>검수 이견은 회의록 기준으로 조정합니다.</li>
                </ul>
              </section>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="border-t border-line pt-5">
                <p className="text-sm font-bold text-ink">갑 서명</p>
                <div className="mt-10 border-b border-line" />
              </div>
              <div className="border-t border-line pt-5">
                <p className="text-sm font-bold text-ink">을 서명</p>
                <div className="mt-10 border-b border-line" />
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-md border border-line bg-white p-5">
              <h3 className="mb-4 font-bold text-ink">계약서 상태</h3>
              <div className="space-y-3">
                <div className="rounded-md bg-paper px-3 py-3">
                  <p className="text-sm text-steel">작성 상태</p>
                  <p className="mt-1 text-sm font-bold text-ink">초안</p>
                </div>
                <div className="rounded-md bg-paper px-3 py-3">
                  <p className="text-sm text-steel">검토 상태</p>
                  <p className="mt-1 text-sm font-bold text-ink">법무 검토 전</p>
                </div>
                <div className="rounded-md bg-paper px-3 py-3">
                  <p className="text-sm text-steel">연결 문서</p>
                  <p className="mt-1 text-sm font-bold text-ink">견적서 · 지출결의서 · 세금계산서</p>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </main>
    );
  }

  if (documentType === "expense-resolution") {
    const expenseItems: Array<{ category: string; description: string; amount: string }> = [];

    return (
      <main className="px-5 py-6 sm:px-8">
        <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href={`/contracts/${contract.slug}`} className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-marine">
              <ArrowLeft className="h-4 w-4" />
              계약 상세
            </Link>
            <h2 className="text-3xl font-bold text-ink">지출결의서</h2>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink">
              미리보기
            </button>
            <button className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
              <Save className="h-4 w-4" />
              저장
            </button>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="rounded-md border border-line bg-white p-8">
            <div className="mb-8 flex items-start justify-between border-b-2 border-ink pb-6">
              <div>
                <p className="text-sm font-bold text-marine">KUDALABS</p>
                <h3 className="mt-2 text-4xl font-bold tracking-wide text-ink">지출결의서</h3>
              </div>
              <div className="text-right text-sm text-steel">
                <p>문서번호: 계약 기준 자동 생성</p>
                <p>작성일: 작성 시 입력</p>
                <p>연결계약: {contract.id}</p>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-md bg-paper px-3 py-3">
                <p className="text-sm text-steel">지출 목적</p>
                <p className="mt-1 font-bold text-ink">{contract.title}</p>
              </div>
              <div className="rounded-md bg-paper px-3 py-3">
                <p className="text-sm text-steel">거래처</p>
                <p className="mt-1 font-bold text-ink">{contract.client}</p>
              </div>
              <div className="rounded-md bg-paper px-3 py-3">
                <p className="text-sm text-steel">결의 상태</p>
                <p className="mt-1 font-bold text-ink">작성 중</p>
              </div>
            </div>

            <table className="mb-6 w-full border-collapse text-sm">
              <thead className="bg-paper text-steel">
                <tr>
                  <th className="border border-line px-3 py-3 text-left font-medium">지출 항목</th>
                  <th className="border border-line px-3 py-3 text-left font-medium">내용</th>
                  <th className="border border-line px-3 py-3 text-right font-medium">금액</th>
                </tr>
              </thead>
              <tbody>
                {expenseItems.map((item) => (
                  <tr key={item.category}>
                    <td className="border border-line px-3 py-4 font-medium text-ink">{item.category}</td>
                    <td className="border border-line px-3 py-4 text-steel">{item.description}</td>
                    <td className="border border-line px-3 py-4 text-right font-bold text-ink">{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid gap-4 md:grid-cols-[1fr_280px]">
              <section className="rounded-md border border-line p-4">
                <h4 className="mb-3 text-sm font-bold text-marine">증빙 서류</h4>
                <ul className="space-y-2 text-sm text-steel">
                  <li>작업 내역서</li>
                  <li>출장비 영수증</li>
                  <li>외주 인력 작업확인서</li>
                </ul>
              </section>
              <section className="rounded-md bg-paper p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-steel">결의 금액</span>
                  <span className="font-bold text-ink">0원</span>
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-steel">계약 합계</span>
                  <span className="font-bold text-ink">{contract.total}</span>
                </div>
                <div className="mt-4 border-t border-line pt-4">
                  <div className="flex justify-between">
                    <span className="font-bold text-ink">결의 비율</span>
                    <span className="text-xl font-bold text-marine">0%</span>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-md border border-line bg-white p-5">
              <h3 className="mb-4 font-bold text-ink">승인 라인</h3>
              <div className="space-y-3">
                {["작성자", "운영 검토", "대표 승인"].map((step, index) => (
                  <div key={step} className="rounded-md bg-paper px-3 py-3">
                    <p className="text-sm text-steel">{step}</p>
                    <p className="mt-1 text-sm font-bold text-ink">{index === 0 ? "작성 중" : "대기"}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </main>
    );
  }

  if (documentType === "tax-invoice-request") {
    const taxInvoicePayload = {
      contractId: contract.id,
      clientName: contract.client,
      itemName: contract.title,
      supplyAmount: contract.supply,
      vatAmount: contract.vat,
      totalAmount: contract.total,
      dueDate: contract.due
    };

    return (
      <main className="px-5 py-6 sm:px-8">
        <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href={`/contracts/${contract.slug}`} className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-marine">
              <ArrowLeft className="h-4 w-4" />
              계약 상세
            </Link>
            <h2 className="text-3xl font-bold text-ink">세금계산서 발행</h2>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
            <Send className="h-4 w-4" />
            발행 요청
          </button>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="rounded-md border border-line bg-white p-5">
            <h3 className="mb-5 font-bold text-ink">발행 요청 정보</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md bg-paper px-3 py-3">
                <p className="text-sm text-steel">공급받는 자</p>
                <p className="mt-1 font-bold text-ink">{contract.client}</p>
              </div>
              <div className="rounded-md bg-paper px-3 py-3">
                <p className="text-sm text-steel">품목</p>
                <p className="mt-1 font-bold text-ink">{contract.title}</p>
              </div>
              <div className="rounded-md bg-paper px-3 py-3">
                <p className="text-sm text-steel">공급가액</p>
                <p className="mt-1 font-bold text-ink">{contract.supply}</p>
              </div>
              <div className="rounded-md bg-paper px-3 py-3">
                <p className="text-sm text-steel">부가세</p>
                <p className="mt-1 font-bold text-ink">{contract.vat}</p>
              </div>
              <div className="rounded-md bg-paper px-3 py-3 md:col-span-2">
                <p className="text-sm text-steel">합계</p>
                <p className="mt-1 text-xl font-bold text-marine">{contract.total}</p>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-md border border-line bg-white p-5">
              <h3 className="mb-4 font-bold text-ink">API 연동 상태</h3>
              <div className="space-y-3">
                <div className="rounded-md bg-paper px-3 py-3">
                  <p className="text-sm text-steel">연동 방식</p>
                  <p className="mt-1 text-sm font-bold text-ink">연동 설정 필요</p>
                </div>
                <div className="rounded-md bg-paper px-3 py-3">
                  <p className="text-sm text-steel">발행 상태</p>
                  <p className="mt-1 text-sm font-bold text-ink">{contract.billing}</p>
                </div>
                <div className="rounded-md bg-paper px-3 py-3">
                  <p className="text-sm text-steel">실서비스 연결</p>
                  <p className="mt-1 text-sm font-bold text-ink">팝빌 또는 바로빌 샌드박스 선택 가능</p>
                </div>
              </div>
            </section>
            <TaxInvoiceIssuePanel payload={taxInvoicePayload} />
          </aside>
        </section>
      </main>
    );
  }

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href={`/contracts/${contract.slug}`} className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-marine">
            <ArrowLeft className="h-4 w-4" />
            계약 상세
          </Link>
          <h2 className="text-3xl font-bold text-ink">{template.heading}</h2>
          <p className="mt-2 text-sm text-steel">{contract.title} · {contract.client}</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-medium text-white">
          <Save className="h-4 w-4" />
          저장
        </button>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-line bg-white p-5">
          <h3 className="mb-5 font-bold text-ink">{template.title}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {template.fields.map((field, index) => (
              <label key={field} className={index === 1 ? "block md:col-span-2" : "block"}>
                <span className="text-sm font-medium text-steel">{field}</span>
                {index === 1 ? (
                  <textarea className="mt-2 min-h-28 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-marine" />
                ) : (
                  <input className={inputClass} />
                )}
              </label>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-md border border-line bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-marine" />
              <h3 className="font-bold text-ink">계약 기준 정보</h3>
            </div>
            <div className="space-y-3">
              <div className="rounded-md bg-paper px-3 py-3">
                <p className="text-sm text-steel">거래처</p>
                <p className="mt-1 text-sm font-bold text-ink">{contract.client}</p>
              </div>
              <div className="rounded-md bg-paper px-3 py-3">
                <p className="text-sm text-steel">공급가액</p>
                <p className="mt-1 text-sm font-bold text-ink">{contract.supply}</p>
              </div>
              <div className="rounded-md bg-paper px-3 py-3">
                <p className="text-sm text-steel">부가세</p>
                <p className="mt-1 text-sm font-bold text-ink">{contract.vat}</p>
              </div>
              <div className="rounded-md bg-paper px-3 py-3">
                <p className="text-sm text-steel">합계</p>
                <p className="mt-1 text-sm font-bold text-marine">{contract.total}</p>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-line bg-white p-5">
            <h3 className="mb-4 font-bold text-ink">문서 상태</h3>
            <div className="space-y-3">
              <div className="rounded-md bg-paper px-3 py-3">
                <p className="text-sm text-steel">작성 상태</p>
                <p className="mt-1 text-sm font-bold text-ink">초안</p>
              </div>
              <div className="rounded-md bg-paper px-3 py-3">
                <p className="text-sm text-steel">승인 상태</p>
                <p className="mt-1 text-sm font-bold text-ink">검토 전</p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
