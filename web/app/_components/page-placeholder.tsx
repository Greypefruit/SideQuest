import type { ReactNode } from "react";

type PlaceholderDetail = {
  label: string;
  value: string;
};

type PagePlaceholderProps = {
  title: string;
  description: string;
  details: PlaceholderDetail[];
  children?: ReactNode;
};

export function PagePlaceholder({
  title,
  description,
  details,
  children,
}: PagePlaceholderProps) {
  return (
    <div className="space-y-6">
      <header className="hidden md:block">
        <h1 className="text-[2rem] font-semibold tracking-tight text-slate-950">{title}</h1>
      </header>

      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-7">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            Раздел Release 1
          </p>
          <p className="text-base leading-7 text-slate-600">{description}</p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {details.map((detail) => (
            <div
              key={detail.label}
              className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4"
            >
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                {detail.label}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">{detail.value}</p>
            </div>
          ))}
        </div>

        {children ? <div className="mt-6">{children}</div> : null}
      </section>
    </div>
  );
}
