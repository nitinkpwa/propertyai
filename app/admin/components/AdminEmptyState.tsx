interface AdminEmptyStateProps {
  icon: string;
  title: string;
  description: string;
}

export default function AdminEmptyState({ icon, title, description }: AdminEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-50 text-3xl">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-heading-primary">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>
    </div>
  );
}
