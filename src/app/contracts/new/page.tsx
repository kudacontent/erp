import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContractForm } from "@/components/contract-form";
import { getClientsForList } from "@/lib/clients-service";

export default async function NewContractPage() {
  const clients = await getClientsForList();

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/contracts" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-marine">
            <ArrowLeft className="h-4 w-4" />
            계약 목록
          </Link>
          <h2 className="text-3xl font-bold text-ink">계약 등록</h2>
        </div>
      </section>

      <ContractForm clients={clients.map((client) => ({ name: client.name, slug: client.slug }))} />
    </main>
  );
}
