"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { BRAND_PRIMARY } from "@/lib/design/colors";
import { Z_INDEX } from "@/lib/layout/zIndex";
import {
  buildOnboardingSteps,
  stepSelectors,
  type TourStep,
} from "@/lib/onboarding/steps";
import {
  calculateSpotlight,
  getBestTooltipPosition,
  getCenterTooltipLayout,
  getMobileSheetLayout,
  getMobileSheetMaxHeight,
  getSafeInsets,
  getTargetRect,
  getViewportMode,
  getViewportSize,
  isRectInViewport,
  isTourDebugEnabled,
  isUsableTarget,
  logTargetDebug,
  scrollTargetIntoSafeView,
  type Rect,
  type TooltipLayout,
  type ViewportMode,
} from "@/lib/onboarding/positioning";
import {
  getOnboardingStep,
  isOnboardingActive,
  isOnboardingCompleted,
  markOnboardingCompleted,
  ONBOARDING_RESTART_EVENT,
  setOnboardingActive,
  setOnboardingStep,
} from "@/lib/onboarding/storage";
import { useAuth } from "@/lib/auth/AuthProvider";

const WAIT_MS = 12000;
const POLL_MS = 100;
const SPOTLIGHT_PAD = 8;
const TOUR_HOST_ID = "areaiq-onboarding-host";

function ensureTourHost(): HTMLElement {
  let host = document.getElementById(TOUR_HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = TOUR_HOST_ID;
    host.setAttribute("data-layout", "onboarding-host");
    Object.assign(host.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100dvh",
      zIndex: String(Z_INDEX.system),
      pointerEvents: "none",
      transform: "none",
      contain: "none",
      filter: "none",
      perspective: "none",
    });
    document.body.appendChild(host);
  }
  return host;
}

function subscribeTourHost() {
  return () => {};
}

function getTourHostSnapshot(): HTMLElement {
  return ensureTourHost();
}

function getTourHostServerSnapshot(): null {
  return null;
}

function getTourDebugSnapshot(): boolean {
  return isTourDebugEnabled();
}

function getTourDebugServerSnapshot(): boolean {
  return false;
}

function queryVisible(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const nodes = Array.from(document.querySelectorAll(sel));
    for (const node of nodes) {
      if (!isUsableTarget(node)) continue;
      const rect = getTargetRect(node);
      // Prefer targets that intersect the viewport; still allow fixed chrome
      // that may be momentarily measured before layout settles.
      if (isRectInViewport(rect) || rect.width > 0) return node;
    }
  }
  return null;
}

function waitForTarget(
  selectors: string[],
  timeout = WAIT_MS,
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const el = queryVisible(selectors);
      if (el) {
        resolve(el);
        return;
      }
      if (Date.now() - start >= timeout) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, POLL_MS);
    };
    tick();
  });
}

function targetLabel(el: HTMLElement): string {
  return (
    el.getAttribute("data-tour") ||
    el.id ||
    el.tagName.toLowerCase()
  );
}

function useViewportMode(): ViewportMode {
  const [mode, setMode] = useState<ViewportMode>(() =>
    typeof window === "undefined" ? "desktop" : getViewportMode(),
  );
  useEffect(() => {
    const apply = () => setMode(getViewportMode());
    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);
  return mode;
}

type Props = {
  open: boolean;
  stepIndex: number;
  steps: TourStep[];
  onStepChange: (index: number) => void;
  onClose: (reason: "skip" | "complete") => void;
};

function OnboardingTourOverlay({
  open,
  stepIndex,
  steps,
  onStepChange,
  onClose,
}: Props) {
  const titleId = useId();
  const descId = useId();
  const reduce = useReducedMotion();
  const mode = useViewportMode();
  const isCompact = mode === "mobile" || mode === "tablet";
  const cardRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [spotlight, setSpotlight] = useState<Rect | null>(null);
  const [layout, setLayout] = useState<TooltipLayout | null>(null);
  const [ready, setReady] = useState(false);

  const portalHost = useSyncExternalStore(
    subscribeTourHost,
    getTourHostSnapshot,
    getTourHostServerSnapshot,
  );
  const debugOn = useSyncExternalStore(
    subscribeTourHost,
    getTourDebugSnapshot,
    getTourDebugServerSnapshot,
  );

  const step = steps[stepIndex];
  const total = steps.length;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;
  const hasTargets = Boolean(
    stepSelectors(step ?? { id: "", title: "", description: "" }, mode).length,
  );
  const isCenter = step?.placement === "center" || !hasTargets;

  const description = useMemo(() => {
    if (!step) return "";
    return step.resolveDescription?.() ?? step.description;
  }, [step]);

  const sheetMaxH = useMemo(
    () => (isCompact ? getMobileSheetMaxHeight() : 0),
    [isCompact],
  );

  const computeLayout = useCallback(
    (geo: Rect | null, measuredH?: number) => {
      if (!step) return null;
      if (isCenter) {
        if (isCompact) return getMobileSheetLayout();
        return getCenterTooltipLayout(420);
      }
      if (isCompact) return getMobileSheetLayout();
      if (!geo) return getCenterTooltipLayout(400);

      const prefer =
        step.placement === "auto" || !step.placement
          ? "auto"
          : step.placement;
      return getBestTooltipPosition({
        targetRect: geo,
        tooltipSize: {
          width: 400,
          height: measuredH ?? 260,
        },
        prefer: prefer === "center" ? "auto" : prefer,
        safe: getSafeInsets(mode),
      });
    },
    [isCenter, isCompact, mode, step],
  );

  /** Measure → spotlight + tooltip from the SAME viewport rect. */
  const syncGeometry = useCallback(() => {
    if (!step) return;
    if (isCenter || !targetRef.current) {
      setTargetRect(null);
      setSpotlight(null);
      setLayout(computeLayout(null, cardRef.current?.offsetHeight));
      return;
    }

    const el = targetRef.current;
    const measured = getTargetRect(el);

    if (
      measured.width <= 0 ||
      measured.height <= 0 ||
      !isUsableTarget(el)
    ) {
      setTargetRect(null);
      setSpotlight(null);
      setLayout(computeLayout(null, cardRef.current?.offsetHeight));
      return;
    }

    const safe = getSafeInsets(mode);
    const sheetReserve = isCompact ? sheetMaxH + safe.bottom + 12 : undefined;
    const spot = calculateSpotlight(measured, SPOTLIGHT_PAD, {
      safe,
      maxHeight: step.maxSpotlightHeight ?? (isCompact ? 320 : 520),
      sheetReserve,
    });

    setTargetRect(measured);
    setSpotlight(spot);
    setLayout(computeLayout(spot, cardRef.current?.offsetHeight));
    logTargetDebug(step.id, targetLabel(el), measured);
  }, [computeLayout, isCenter, isCompact, mode, sheetMaxH, step]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    let cancelled = false;

    const run = async () => {
      setReady(false);
      targetRef.current = null;
      setTarget(null);
      setTargetRect(null);
      setSpotlight(null);
      setLayout(null);

      if (isCenter) {
        if (!cancelled) {
          setLayout(computeLayout(null));
          setReady(true);
        }
        return;
      }

      const selectors = stepSelectors(step, mode);
      let el = await waitForTarget(selectors);
      if (cancelled) return;

      if (!el) {
        const fallback = queryVisible([
          '[data-tour="featured-properties"]',
          '[data-tour="intelligence-map-section"]',
          '[data-tour="terminal-hero"]',
          '[data-tour="home-navbar"]',
        ]);
        if (!fallback) {
          setLayout(computeLayout(null));
          setReady(true);
          return;
        }
        el = fallback;
      }

      // Scroll first → wait for settle → measure second (inside scroll helper)
      await scrollTargetIntoSafeView(el, {
        mode,
        align: step.scrollAlign ?? (isCompact ? "upper" : "center"),
        sheetReserve: isCompact
          ? sheetMaxH + getSafeInsets(mode).bottom
          : undefined,
      });
      if (cancelled) return;

      // Re-validate after scroll; if desktop-only target vanished, try responsive set again
      if (!isUsableTarget(el) || !isRectInViewport(getTargetRect(el))) {
        const retry = queryVisible(selectors);
        if (retry) el = retry;
      }

      targetRef.current = el;
      setTarget(el);
      setReady(true);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [computeLayout, isCenter, isCompact, mode, open, sheetMaxH, step, stepIndex]);

  useLayoutEffect(() => {
    if (!ready) return;
    syncGeometry();
    const id = window.requestAnimationFrame(() => syncGeometry());
    return () => window.cancelAnimationFrame(id);
  }, [ready, syncGeometry, stepIndex, target]);

  useEffect(() => {
    if (!open || !ready) return;
    let frame = 0;
    const onUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => syncGeometry());
    };
    window.addEventListener("resize", onUpdate);
    window.addEventListener("orientationchange", onUpdate);
    window.addEventListener("scroll", onUpdate, true);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onUpdate);
    vv?.addEventListener("scroll", onUpdate);
    const ro =
      typeof ResizeObserver !== "undefined" && cardRef.current
        ? new ResizeObserver(onUpdate)
        : null;
    if (cardRef.current) ro?.observe(cardRef.current);
    if (target) ro?.observe(target);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("orientationchange", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
      vv?.removeEventListener("resize", onUpdate);
      vv?.removeEventListener("scroll", onUpdate);
      ro?.disconnect();
    };
  }, [open, ready, syncGeometry, target]);

  useEffect(() => {
    if (!open) return;
    // Lock background interaction; scrollTargetIntoSafeView temporarily unlocks for programmatic scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !ready) return;
    const focusable = cardRef.current?.querySelector<HTMLElement>(
      "button:not([tabindex='-1']), [href]",
    );
    focusable?.focus();
  }, [open, ready, stepIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose("skip");
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isLast) onClose("complete");
        else onStepChange(stepIndex + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (!isFirst && !step?.hideBack) onStepChange(stepIndex - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isFirst, isLast, onClose, onStepChange, step?.hideBack, stepIndex]);

  if (!open || !step || !portalHost) return null;

  const goNext = () => {
    if (isLast) onClose("complete");
    else onStepChange(stepIndex + 1);
  };

  const goBack = () => {
    if (!isFirst) onStepChange(stepIndex - 1);
  };

  const progressLabel =
    isCenter && isFirst
      ? "AreaIQ Tour"
      : `${stepIndex + 1} of ${total}`;

  const useSheet = isCompact || (isCenter && isCompact);
  const useCenteredDesktop = isCenter && !isCompact;
  const { width: vw, height: vh } = getViewportSize();

  const cardShellClass = useSheet
    ? "pointer-events-auto absolute inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-lg flex-col px-3"
    : "pointer-events-auto absolute z-10";

  const cardShellStyle = useSheet
    ? {
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        marginBottom:
          mode === "mobile"
            ? "calc(var(--bottomnav-height, 64px) + 4px)"
            : "0px",
      }
    : layout
      ? {
          top: layout.top,
          left: layout.left,
          width: layout.width,
        }
      : undefined;

  const cardInnerClass = useSheet
    ? "flex max-h-[42vh] flex-col overflow-hidden rounded-t-3xl rounded-b-2xl border border-neutral-200/80 bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.18)]"
    : "flex max-h-[min(70vh,560px)] flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.22)]";

  // Four fixed dimmers around the target — same viewport coords as getTargetRect()
  const spot = spotlight && !isCenter ? spotlight : null;
  const dim = "bg-slate-950/48";

  const overlay = (
    <div
      className="pointer-events-auto"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: Z_INDEX.system,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div className="absolute inset-0" aria-hidden>
        {spot ? (
          <>
            <div
              className={`pointer-events-none absolute left-0 right-0 top-0 ${dim}`}
              style={{ height: Math.max(0, spot.top) }}
            />
            <div
              className={`pointer-events-none absolute left-0 right-0 ${dim}`}
              style={{
                top: spot.top + spot.height,
                height: Math.max(0, vh - (spot.top + spot.height)),
              }}
            />
            <div
              className={`pointer-events-none absolute left-0 ${dim}`}
              style={{
                top: spot.top,
                width: Math.max(0, spot.left),
                height: spot.height,
              }}
            />
            <div
              className={`pointer-events-none absolute ${dim}`}
              style={{
                top: spot.top,
                left: spot.left + spot.width,
                width: Math.max(0, vw - (spot.left + spot.width)),
                height: spot.height,
              }}
            />
            <motion.div
              className="pointer-events-none rounded-2xl border-2"
              style={{
                position: "fixed",
                top: spot.top,
                left: spot.left,
                width: spot.width,
                height: spot.height,
                borderColor: BRAND_PRIMARY,
                boxShadow: `0 0 0 2px ${BRAND_PRIMARY}55, 0 0 20px ${BRAND_PRIMARY}33`,
                background: "transparent",
              }}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.22 }}
            />
            {debugOn && targetRect ? (
              <div
                className="pointer-events-none fixed z-[1] rounded-md bg-black/80 px-2 py-1 font-mono text-[10px] leading-tight text-emerald-300"
                style={{
                  top: Math.max(4, spot.top - 36),
                  left: Math.max(4, Math.min(spot.left, vw - 160)),
                }}
              >
                TARGET: {target ? targetLabel(target) : "—"}
                <br />
                x: {Math.round(targetRect.left)} y: {Math.round(targetRect.top)}
                <br />
                w: {Math.round(targetRect.width)} h:{" "}
                {Math.round(targetRect.height)}
                <br />
                vp: {vw}×{vh}
              </div>
            ) : null}
          </>
        ) : (
          <motion.div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.22 }}
          />
        )}
      </div>

      <button
        type="button"
        className="absolute inset-0 cursor-default bg-transparent"
        aria-label="Tour backdrop"
        tabIndex={-1}
        onClick={() => onClose("skip")}
      />

      <AnimatePresence mode="wait">
        {ready ? (
          useCenteredDesktop ? (
            <motion.div
              key={step.id}
              ref={cardRef}
              className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center px-4"
              initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={cardInnerClass}
                style={{
                  width: Math.min(
                    420,
                    typeof window !== "undefined" ? window.innerWidth - 32 : 420,
                  ),
                }}
              >
                <div
                  className="h-1 w-full shrink-0"
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_PRIMARY} ${((stepIndex + 1) / total) * 100}%, #E8EEE9 ${((stepIndex + 1) / total) * 100}%)`,
                  }}
                  aria-hidden
                />
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 pb-2 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                        {progressLabel}
                      </p>
                      <h2
                        id={titleId}
                        className="mt-1 text-[1.5rem] font-bold leading-snug tracking-tight text-heading-primary"
                      >
                        {step.title}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => onClose("skip")}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition hover:bg-neutral-50 hover:text-heading-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                      aria-label="Skip tour"
                    >
                      Skip
                    </button>
                  </div>
                  <p
                    id={descId}
                    className="whitespace-pre-line text-[0.98rem] leading-[1.55] text-body"
                  >
                    {description}
                  </p>
                  {step.tip ? (
                    <p className="rounded-xl border border-emerald-100 bg-[#F3FAEF] px-3 py-2 text-[12px] font-medium leading-snug text-emerald-900">
                      {step.tip}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-neutral-100 bg-white px-5 py-3">
                  <div className="flex items-center gap-2">
                    {isFirst ? (
                      <button
                        type="button"
                        onClick={() => onClose("skip")}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl px-2.5 text-sm font-semibold text-muted transition hover:text-heading-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                      >
                        Skip for now
                      </button>
                    ) : !step.hideBack ? (
                      <button
                        type="button"
                        onClick={goBack}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-neutral-200 bg-white px-3.5 text-sm font-semibold text-label transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                      >
                        ← Back
                      </button>
                    ) : (
                      <span className="min-w-0" />
                    )}
                  </div>
                  <div className="flex flex-1 items-center justify-end gap-2">
                    {isLast ? (
                      <button
                        type="button"
                        onClick={() => onClose("skip")}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl px-2 text-sm font-semibold text-muted transition hover:text-heading-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                      >
                        Take tour later
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={goNext}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-bold text-white shadow-[0_8px_24px_rgba(74,170,39,0.35)] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                      style={{ backgroundColor: BRAND_PRIMARY }}
                    >
                      {step.primaryLabel ??
                        (isLast ? "Start Exploring →" : "Next →")}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={step.id}
              ref={cardRef}
              className={cardShellClass}
              style={cardShellStyle}
              initial={
                reduce
                  ? false
                  : useSheet
                    ? { opacity: 0, y: 36 }
                    : { opacity: 0, y: 8, scale: 0.98 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduce
                  ? undefined
                  : useSheet
                    ? { opacity: 0, y: 20 }
                    : { opacity: 0, y: 6, scale: 0.98 }
              }
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={cardInnerClass}>
                <div
                  className="h-1 w-full shrink-0"
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_PRIMARY} ${((stepIndex + 1) / total) * 100}%, #E8EEE9 ${((stepIndex + 1) / total) * 100}%)`,
                  }}
                  aria-hidden
                />

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 sm:text-[11px]">
                        {progressLabel}
                      </p>
                      <h2
                        id={titleId}
                        className="mt-1 text-[1.25rem] font-bold leading-snug tracking-tight text-heading-primary sm:text-[1.5rem]"
                      >
                        {step.title}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => onClose("skip")}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition hover:bg-neutral-50 hover:text-heading-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                      aria-label="Skip tour"
                    >
                      Skip
                    </button>
                  </div>

                  <p
                    id={descId}
                    className="whitespace-pre-line text-[0.9375rem] leading-[1.5] text-body sm:text-[0.98rem] sm:leading-[1.55]"
                  >
                    {description}
                  </p>

                  {step.tip ? (
                    <p className="rounded-xl border border-emerald-100 bg-[#F3FAEF] px-3 py-2 text-[12px] font-medium leading-snug text-emerald-900">
                      {step.tip}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-neutral-100 bg-white px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-2">
                    {!isFirst && !step.hideBack ? (
                      <button
                        type="button"
                        onClick={goBack}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-neutral-200 bg-white px-3.5 text-sm font-semibold text-label transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                      >
                        ← Back
                      </button>
                    ) : isFirst ? (
                      <button
                        type="button"
                        onClick={() => onClose("skip")}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl px-2.5 text-sm font-semibold text-muted transition hover:text-heading-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                      >
                        Skip for now
                      </button>
                    ) : (
                      <span className="min-w-0" />
                    )}
                  </div>
                  <div className="flex flex-1 items-center justify-end gap-2">
                    {isLast ? (
                      <button
                        type="button"
                        onClick={() => onClose("skip")}
                        className="inline-flex min-h-10 max-w-[42%] items-center justify-center rounded-xl px-2 text-left text-xs font-semibold text-muted transition hover:text-heading-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:max-w-none sm:text-sm"
                      >
                        Take tour later
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={goNext}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-bold text-white shadow-[0_8px_24px_rgba(74,170,39,0.35)] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                      style={{ backgroundColor: BRAND_PRIMARY }}
                    >
                      {step.primaryLabel ??
                        (isLast ? "Start Exploring →" : "Next →")}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        ) : null}
      </AnimatePresence>
    </div>
  );

  return createPortal(overlay, portalHost);
}

export default function OnboardingTourProvider() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [booted, setBooted] = useState(false);
  const bootRef = useRef(false);

  const steps = useMemo(
    () => buildOnboardingSteps({ signedIn: Boolean(user) }),
    [user],
  );

  const finish = useCallback((reason: "skip" | "complete") => {
    markOnboardingCompleted();
    setOnboardingActive(false);
    setOpen(false);
    void reason;
  }, []);

  const startTour = useCallback(
    (fromStep = 0) => {
      setStepIndex(fromStep);
      setOnboardingActive(true, fromStep);
      setOpen(true);
      if (pathname !== "/") {
        router.push("/");
      }
    },
    [pathname, router],
  );

  const changeStep = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(index, steps.length - 1));
      setStepIndex(next);
      setOnboardingStep(next);
      const step = steps[next];
      if (step?.requirePath && pathname !== step.requirePath) {
        router.push(step.requirePath);
      }
    },
    [pathname, router, steps],
  );

  useEffect(() => {
    if (loading || bootRef.current) return;
    bootRef.current = true;
    const t = window.setTimeout(() => {
      try {
        if (isOnboardingActive()) {
          const step = getOnboardingStep();
          setStepIndex(step);
          setOpen(true);
          if (pathname !== "/") router.push("/");
        } else if (!isOnboardingCompleted()) {
          setStepIndex(0);
          setOnboardingActive(true, 0);
          setOpen(true);
          if (pathname !== "/") router.push("/");
        }
      } finally {
        setBooted(true);
      }
    }, 700);
    return () => window.clearTimeout(t);
  }, [loading, pathname, router]);

  useEffect(() => {
    const onRestart = () => {
      startTour(0);
    };
    window.addEventListener(ONBOARDING_RESTART_EVENT, onRestart);
    return () => window.removeEventListener(ONBOARDING_RESTART_EVENT, onRestart);
  }, [startTour]);

  useEffect(() => {
    if (!booted) return;
    if (!isOnboardingActive()) return;
    if (open) return;
    // Restore tour UI after navigation if session says tour is still active
    const id = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(id);
  }, [booted, open, pathname]);

  if (!booted && !open) return null;

  return (
    <OnboardingTourOverlay
      open={open}
      stepIndex={stepIndex}
      steps={steps}
      onStepChange={changeStep}
      onClose={finish}
    />
  );
}
