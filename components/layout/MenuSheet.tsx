"use client";

import BottomSheet from "@/components/ui/BottomSheet";

interface MenuSheetItem {
  id: string;
  label: string;
  icon?: string;
  badge?: number;
  danger?: boolean;
}

interface MenuSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  items: MenuSheetItem[];
  onSelect: (id: string) => void;
}

export default function MenuSheet({
  open,
  onClose,
  title = "Menu",
  items,
  onSelect,
}: MenuSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <ul className="space-y-1 pb-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => {
                onSelect(item.id);
                onClose();
              }}
              className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base font-medium transition-colors active:bg-neutral-50 ${
                item.danger ? "text-rose-600" : "text-heading-primary"
              }`}
            >
              {item.icon ? <span aria-hidden>{item.icon}</span> : null}
              <span className="flex-1">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
