"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BUYER_BOTTOM_NAV } from "@/lib/design/bottomNav";
import BottomNav from "@/components/layout/BottomNav";
import { useBuyerNotifications } from "@/lib/buyer/notifications";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount } = useBuyerNotifications(user?.id);

  const activeId =
    BUYER_BOTTOM_NAV.find((item) => {
      if (!item.href) return false;
      if (item.href === "/buyer") return pathname === "/buyer";
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    })?.id ?? (pathname.startsWith("/buyer/notifications") ? "profile" : undefined);

  const items = BUYER_BOTTOM_NAV.map((item) =>
    item.id === "profile" && unreadCount > 0
      ? { ...item, badge: unreadCount }
      : item,
  );

  return <BottomNav items={items} activeId={activeId} />;
}

/** Optional compact link used in older layouts */
export function BuyerBrowseLink() {
  return (
    <Link href="/properties" className="text-xs font-semibold text-emerald-600">
      Browse
    </Link>
  );
}
