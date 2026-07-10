export default function AuthDivider() {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-neutral-200" />
      <span className="text-xs font-medium uppercase tracking-wider text-muted">
        or
      </span>
      <div className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}
