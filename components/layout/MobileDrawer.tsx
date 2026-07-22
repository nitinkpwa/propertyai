"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Accessible label for the dialog */
  ariaLabel?: string;
  /** Optional width class for the panel */
  widthClassName?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * True mobile drawer: slide from left, dark translucent backdrop,
 * no page blur/scale, swipe-to-close, focus trap, ESC, body scroll lock.
 */
export default function MobileDrawer({
  open,
  onClose,
  children,
  ariaLabel = "Navigation menu",
  widthClassName = "w-[min(100vw-3rem,20rem)]",
}: MobileDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
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
      const el = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      el?.focus();
    });

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
      window.removeEventListener("keydown", onKey);
      previousFocus.current?.focus?.();
    };
  }, [open, onClose]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -80 || info.velocity.x < -400) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[55] lg:hidden" role="presentation">
          {/* Dark translucent backdrop — NO blur, NO page scale */}
          <motion.button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-neutral-950/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClose}
          />

          <motion.aside
            ref={panelRef}
            id={titleId}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            className={`absolute bottom-0 left-0 top-0 flex ${widthClassName} max-w-full flex-col bg-white shadow-[8px_0_40px_rgba(0,0,0,0.18)] will-change-transform pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.8 }}
            drag="x"
            dragConstraints={{ left: -320, right: 0 }}
            dragElastic={{ left: 0.08, right: 0 }}
            onDragEnd={handleDragEnd}
          >
            {children}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
