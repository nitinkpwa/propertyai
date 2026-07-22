"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cormorant_Garamond } from "next/font/google";
import Logo from "@/components/common/Logo";
import { useTribute } from "@/hooks/useTribute";

const tributeSerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const PARTICLES = [
  { x: "10%", y: "16%", size: 2, delay: 0 },
  { x: "84%", y: "12%", size: 1.5, delay: 0.35 },
  { x: "16%", y: "74%", size: 2, delay: 0.7 },
  { x: "90%", y: "64%", size: 1.5, delay: 1.05 },
  { x: "48%", y: "8%", size: 1.5, delay: 0.2 },
  { x: "70%", y: "82%", size: 2, delay: 0.9 },
  { x: "5%", y: "48%", size: 1.5, delay: 0.55 },
  { x: "95%", y: "40%", size: 2, delay: 1.25 },
  { x: "32%", y: "88%", size: 1.5, delay: 0.45 },
  { x: "60%", y: "26%", size: 1.5, delay: 1.1 },
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Full-screen first-visit memorial tribute.
 * Respectful, non-partisan — never a marketing popup.
 */
export default function WelcomeTribute() {
  const { open, dismiss } = useTribute();
  const titleId = useId();
  const descId = useId();
  const flameId = useId().replace(/:/g, "");
  const glowId = useId().replace(/:/g, "");
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("[data-tribute-primary]")
        ?.focus();
    });

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      previousFocus.current?.focus?.();
    };
  }, [open, dismiss]);

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden p-3 sm:p-5 md:p-8"
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Dismiss tribute"
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(32,32,34,0.7)_0%,rgba(6,6,8,0.92)_100%)] backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            onClick={dismiss}
          />

          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            aria-hidden
          >
            {PARTICLES.map((p, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full bg-[#f5e6c8]/30"
                style={{
                  left: p.x,
                  top: p.y,
                  width: p.size,
                  height: p.size,
                }}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0.12, 0.42, 0.12],
                  y: [0, -16, 0],
                }}
                transition={{
                  duration: 6,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className={[
              "relative z-10 flex w-full max-w-[680px] flex-col items-center overflow-hidden",
              "rounded-[22px] border border-white/[0.14]",
              "bg-gradient-to-b from-white/[0.15] via-white/[0.08] to-white/[0.04]",
              "shadow-[0_40px_100px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.12)]",
              "backdrop-blur-2xl text-center",
              /* Padding: 24 / 32 / 56 */
              "px-6 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-14 lg:py-14",
              "sm:rounded-[26px] md:rounded-[28px]",
              /* Fit viewport — never scroll */
              "max-h-[calc(100dvh-1.5rem)]",
              /* Compress on short viewports */
              "[@media(max-height:740px)]:py-5 [@media(max-height:740px)]:sm:py-6",
              "[@media(max-height:640px)]:py-4 [@media(max-height:640px)]:px-5",
            ].join(" ")}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#f5e6c8]/[0.08] to-transparent"
            />

            <div className="relative flex w-full min-h-0 flex-col items-center">
              <div className="mb-3 opacity-95 sm:mb-4 lg:mb-6 [@media(max-height:640px)]:mb-2">
                <Logo
                  size="footer"
                  href={null}
                  variant="light"
                  showTagline={false}
                />
              </div>

              <motion.div
                className={[
                  "relative mb-3 flex items-center justify-center sm:mb-4 lg:mb-6",
                  "h-[70px] w-[54px] sm:h-[92px] sm:w-[70px] lg:h-[112px] lg:w-[86px]",
                  "[@media(max-height:640px)]:mb-2 [@media(max-height:640px)]:h-[56px] [@media(max-height:640px)]:w-[44px]",
                ].join(" ")}
                aria-hidden
                animate={{
                  filter: [
                    "drop-shadow(0 0 12px rgba(255,230,180,0.3))",
                    "drop-shadow(0 0 26px rgba(255,230,180,0.55))",
                    "drop-shadow(0 0 12px rgba(255,230,180,0.3))",
                  ],
                }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <CandleIllustration
                  flameId={`tribute-flame-${flameId}`}
                  glowId={`tribute-glow-${glowId}`}
                />
              </motion.div>

              <h2
                id={titleId}
                className={`${tributeSerif.className} text-[32px] font-bold leading-[1.12] tracking-[-0.025em] text-white md:text-[40px] lg:text-[48px] [@media(max-height:640px)]:text-[28px]`}
              >
                A Moment of Respect
              </h2>

              <div
                id={descId}
                className={[
                  "mt-3 w-full max-w-[620px] space-y-2.5 sm:mt-4 sm:space-y-3.5 lg:mt-5 lg:space-y-4",
                  "text-base leading-[1.8] text-white/82",
                  "md:text-[17px] lg:text-lg",
                  "[@media(max-height:640px)]:mt-2 [@media(max-height:640px)]:space-y-2 [@media(max-height:640px)]:text-[15px] [@media(max-height:640px)]:leading-[1.65]",
                ].join(" ")}
              >
                <p>
                  We honour the courage, resilience, and peaceful civic
                  participation shown during the 2026 Jantar Mantar
                  demonstrations.
                </p>
                <p>
                  AreaIQ recognizes the importance of peaceful dialogue,
                  democratic participation, empathy, and the dignity of every
                  individual.
                </p>
                <p>
                  May we continue building a future guided by compassion,
                  responsibility, understanding, and informed decisions.
                </p>
                <p
                  className={`${tributeSerif.className} pt-0.5 text-[17px] font-semibold tracking-wide text-white/55 md:text-lg`}
                >
                  — Team AreaIQ
                </p>
              </div>

              <div
                className={[
                  "mt-5 flex w-full max-w-md flex-col items-stretch gap-2.5",
                  "sm:mt-7 sm:flex-row sm:items-center sm:justify-center sm:gap-3.5",
                  "lg:mt-9",
                  "[@media(max-height:640px)]:mt-3",
                ].join(" ")}
              >
                <button
                  type="button"
                  data-tribute-primary
                  onClick={dismiss}
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-gradient-to-b from-[#74c454] to-[#4aaa27] px-6 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(74,170,39,0.35)] transition duration-200 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#74c454]/60 active:scale-[0.98] sm:min-h-[52px] sm:flex-none sm:min-w-[200px] sm:px-8"
                >
                  Continue to AreaIQ
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-white/20 bg-transparent px-6 text-[15px] font-medium text-white/80 transition duration-200 hover:border-white/35 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 active:scale-[0.98] sm:min-h-[52px] sm:flex-none sm:min-w-[120px] sm:px-8"
                >
                  Skip
                </button>
              </div>

              <p className="mt-3 text-[11px] font-medium tracking-[0.04em] text-white/35 sm:mt-4 [@media(max-height:640px)]:mt-2">
                Displayed once for first-time visitors.
              </p>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function CandleIllustration({
  flameId,
  glowId,
}: {
  flameId: string;
  glowId: string;
}) {
  return (
    <svg
      viewBox="0 0 80 120"
      className="h-full w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse
        cx="40"
        cy="28"
        rx="30"
        ry="30"
        fill={`url(#${glowId})`}
        opacity="0.6"
      />
      <path
        d="M40 6c5 7 9 13.5 9 20 0 5.2-4 9.2-9 9.2s-9-4-9-9.2c0-6.5 4-13 9-20Z"
        fill={`url(#${flameId})`}
      />
      <path
        d="M40 16c2 3.2 3.6 6 3.6 8.6 0 2.1-1.6 3.8-3.6 3.8s-3.6-1.7-3.6-3.8c0-2.6 1.6-5.4 3.6-8.6Z"
        fill="#FFF9F0"
        opacity="0.9"
      />
      <path
        d="M40 34v5.5"
        stroke="#A89880"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="27" y="38" width="26" height="64" rx="4" fill="#F7F1E6" />
      <rect x="27" y="38" width="26" height="7" rx="2.5" fill="#EDE4D4" />
      <path
        d="M49 46v50"
        stroke="#D9CFBD"
        strokeWidth="7"
        strokeOpacity="0.28"
        strokeLinecap="round"
      />
      <ellipse cx="40" cy="108" rx="24" ry="5.5" fill="#000" opacity="0.3" />
      <defs>
        <radialGradient
          id={glowId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(40 28) rotate(90) scale(30)"
        >
          <stop stopColor="#FFE9B8" stopOpacity="0.75" />
          <stop offset="1" stopColor="#FFE9B8" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={flameId}
          x1="40"
          y1="6"
          x2="40"
          y2="35"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFF8EA" />
          <stop offset="0.45" stopColor="#F5D9A0" />
          <stop offset="1" stopColor="#D4A86A" />
        </linearGradient>
      </defs>
    </svg>
  );
}
