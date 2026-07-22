"use client";

interface NotificationBarBellProps {
  unreadCount: number;
  onClick: () => void;
  className?: string;
}

/** Compact bell for the Smart Notification Bar (opens drawer). */
export default function NotificationBarBell({
  unreadCount,
  onClick,
  className = "",
}: NotificationBarBellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-emerald-900 transition hover:bg-emerald-100/80 active:scale-[0.96] ${className}`}
      aria-label={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : "Notifications"
      }
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unreadCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-0.5 text-[9px] font-bold text-white shadow-sm">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}
