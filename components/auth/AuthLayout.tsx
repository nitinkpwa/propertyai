interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-muted/40 via-neutral-50 to-neutral-50 pt-16">
      <main className="flex min-h-[calc(100vh-4rem)] items-end justify-center px-4 pb-8 pt-6 sm:items-center sm:px-6 sm:py-10 lg:px-8">
        <div className="w-full max-w-md animate-page-enter">
          <div className="rounded-t-3xl border border-neutral-200/80 bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)] sm:rounded-3xl sm:p-10">
            <div className="mb-8 text-center">
              <h1 className="text-[28px] font-bold tracking-tight text-heading-primary sm:text-2xl">
                {title}
              </h1>
              <p className="mt-2 text-base text-muted">{subtitle}</p>
            </div>
            {children}
          </div>
          {footer ? <div className="mt-6 text-center">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
