"use client";

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
}

export default function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <section className="border-b border-neutral-100 pb-6 last:border-b-0 last:pb-0">
      <h3 className="mb-3 text-sm font-semibold tracking-tight text-heading-primary">
        {title}
      </h3>
      {children}
    </section>
  );
}
