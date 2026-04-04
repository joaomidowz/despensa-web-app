import { ReactNode } from "react";

export function SectionCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[28px] border border-border/15 bg-card p-6 shadow-panel ${className}`}>
      {children}
    </section>
  );
}
