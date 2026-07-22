"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { IntelligenceNotification } from "@/lib/notifications/types";

interface NotificationTickerProps {
  item: IntelligenceNotification | null;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export default function NotificationTicker({
  item,
  onSwipeLeft,
  onSwipeRight,
}: NotificationTickerProps) {
  if (!item) return null;

  return (
    <div className="relative min-h-5 min-w-0 flex-1 overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={item.id}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragEnd={(_, info) => {
            if (info.offset.x < -48 || info.velocity.x < -300) onSwipeLeft?.();
            else if (info.offset.x > 48 || info.velocity.x > 300) onSwipeRight?.();
          }}
          className="flex min-w-0 items-center gap-2"
          title={`${item.reason} · confidence ${item.confidence}%`}
        >
          <span className="shrink-0 text-sm leading-none" aria-hidden>
            {item.icon}
          </span>
          <p className="truncate text-[13px] font-medium leading-snug text-emerald-950 sm:text-sm">
            {item.title}
          </p>
          {!item.read && item.kind !== "market_status" && item.kind !== "platform_stat" ? (
            <span
              className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-brand sm:inline-block"
              aria-label="Unread"
            />
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
