import { Hammer } from "lucide-react";

type ModuleShellProps = {
  title: string;
  eyebrow: string;
  description: string;
  items: string[];
};

export function ModuleShell({ title, eyebrow, description, items }: ModuleShellProps) {
  return (
    <main className="px-5 py-6 sm:px-8">
      <div className="max-w-5xl">
        <section className="rounded-md border border-line bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-marine">{eyebrow}</p>
              <h1 className="mt-2 text-3xl font-bold text-ink">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-steel">{description}</p>
            </div>
            <span className="hidden h-11 w-11 items-center justify-center rounded-md bg-paper text-marine sm:flex">
              <Hammer className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <div key={item} className="rounded-md border border-line bg-paper px-4 py-3 text-sm text-ink">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
