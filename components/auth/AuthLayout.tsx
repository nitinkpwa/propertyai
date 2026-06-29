import Link from "next/link";
import { EMERALD } from "@/lib/auth/constants";

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
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-3 no-underline">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)] transition-transform duration-200 group-hover:scale-105"
              style={{ backgroundColor: EMERALD }}
            >
              A
            </div>
            <span className="text-lg font-semibold tracking-tight text-neutral-900">
              Area<span style={{ color: EMERALD }}>IQ</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all sm:p-10">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-neutral-500 sm:text-base">
                {subtitle}
              </p>
            </div>
            {children}
          </div>
          {footer ? <div className="mt-6 text-center">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
