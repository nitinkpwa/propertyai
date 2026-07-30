interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Auth shell — scrollable on mobile so the keyboard never hides fields.
 * Safe-area aware; card max 420px / 92vw.
 */
export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-brand-muted/50 via-neutral-50 to-neutral-100 pt-safe">
      <main className="flex min-h-dvh flex-col items-center justify-start overflow-y-auto px-[4vw] pb-[max(2rem,var(--safe-bottom),env(keyboard-inset-height,0px))] pt-[max(2rem,var(--safe-top))] sm:justify-center sm:px-6 sm:py-10 lg:px-8">
        <div className="w-full max-w-[420px] animate-page-enter" style={{ width: "min(420px, 92vw)" }}>
          <div className="rounded-3xl border border-neutral-200/80 bg-white px-6 py-7 shadow-[0_8px_32px_rgba(0,0,0,0.06)] sm:px-8 sm:py-9">
            <div className="mb-6 text-center sm:mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-dark">
                AreaIQ
              </p>
              <h1 className="mt-2 text-[1.75rem] font-bold leading-tight tracking-tight text-heading-primary sm:text-[2rem]">
                {title}
              </h1>
              <p className="mt-2 text-base leading-relaxed text-muted">{subtitle}</p>
            </div>
            {children}
          </div>
          {footer ? <div className="mt-5 pb-4 text-center">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
