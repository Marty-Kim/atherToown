import * as React from 'react';

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--at-text-dim)]">
        {title}
      </h4>
      {children}
    </section>
  );
}

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5">
      <span className="shrink-0 text-[11.5px] text-[var(--at-text-dim)]">{label}</span>
      <span className="min-w-0 text-right text-[12px] text-[var(--at-text)]">{value}</span>
    </div>
  );
}
