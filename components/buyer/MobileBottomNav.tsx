"use client";

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

  const items = BUYER_BOTTOM_NAV.map((item) => {
    if (item.id === "profile" && unreadCount > 0) {
      return { ...item, badge: unreadCount };
    }
    if (item.id === "visits" && pathname.startsWith("/buyer/site-visits")) {
      return item;
    }
    return item;
  });

  return <BottomNav items={items} activeId={activeId} />;
}
