"use client";

import { useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { OverlayPortal } from "@/components/layout/engine";
import { useFocusTrap, useOverlay } from "@/lib/layout/overlay";
import { ui } from "@/lib/design/tokens";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Extra tall content (filters) */
  tall?: boolean;
  /** Accessible label when no title */
  ariaLabel?: string;
}

export default function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  tall = false,
  ariaLabel,
}: BottomSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const { zClassName } = useOverlay("sheet", open, onClose);
  useFocusTrap(open, panelRef);

  return (
    <AnimatePresence>
      {open ? (
        <OverlayPortal>
          <div className={`fixed inset-0 ${zClassName} lg:hidden`} role="presentation">
            <motion.button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              aria-label={!title ? ariaLabel ?? "Sheet" : undefined}
              className={`${ui.sheet} ${tall ? "h-[92dvh]" : ""} flex flex-col`}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 380 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.12}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) onClose();
              }}
            >
              <div className="flex shrink-0 flex-col items-center pt-3">
                <div className="h-1 w-10 rounded-full bg-neutral-300" aria-hidden />
                {(title || description) && (
                  <div className="w-full px-5 pb-3 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {title ? (
                          <h2 id={titleId} className="type-title text-heading-primary">
                            {title}
                          </h2>
                        ) : null}
                        {description ? (
                          <p className="mt-1 type-caption text-muted">{description}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={onClose}
                        className="touch-target inline-flex shrink-0 items-center justify-center rounded-full text-muted hover:bg-neutral-100"
                        aria-label="Close sheet"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto scroll-touch px-5 pb-4">{children}</div>

              {footer ? (
                <div
                  className={`shrink-0 border-t border-neutral-100 bg-white px-5 pt-3 ${ui.safeBottom}`}
                >
                  {footer}
                </div>
              ) : (
                <div className={ui.safeBottom} />
              )}
            </motion.div>
          </div>
        </OverlayPortal>
      ) : null}
    </AnimatePresence>
  );
}
