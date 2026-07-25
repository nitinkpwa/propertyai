"use client";

import { useId, useRef } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { OverlayPortal } from "@/components/layout/engine";
import { useFocusTrap, useOverlay } from "@/lib/layout/overlay";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Accessible label for the dialog */
  ariaLabel?: string;
  /** Optional width class for the panel */
  widthClassName?: string;
}

/**
 * True mobile drawer: slide from left, dark translucent backdrop,
 * swipe-to-close, focus trap, ESC, coordinated scroll lock.
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
  const { zClassName } = useOverlay("drawer", open, onClose);
  useFocusTrap(open, panelRef);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -80 || info.velocity.x < -400) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <OverlayPortal>
          <div className={`fixed inset-0 ${zClassName} lg:hidden`} role="presentation">
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
              className={`absolute bottom-0 left-0 top-0 flex ${widthClassName} max-w-full flex-col bg-white shadow-[8px_0_40px_rgba(0,0,0,0.18)] will-change-transform pt-[var(--safe-top)] pb-[var(--safe-bottom)]`}
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
        </OverlayPortal>
      ) : null}
    </AnimatePresence>
  );
}
