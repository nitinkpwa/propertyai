"use client";

import Link from "next/link";
import { MARKET_TICKER_ITEMS } from "./data";
import { IQ_GREEN } from "./theme";

export default function MarketTicker() {
  const items = [...MARKET_TICKER_ITEMS, ...MARKET_TICKER_ITEMS];

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] overflow-hidden border-b border-neutral-200/80 bg-white/90 backdrop-blur-md"
      style={{ height: "36px" }}
    >
      <div className="flex h-full items-center">
        <div className="flex shrink-0 items-center gap-2 border-r border-neutral-200/80 bg-[#F7F9FB] px-4">
          <span
            className="relative flex h-1.5 w-1.5"
            aria-hidden
          >
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: IQ_GREEN }}
            />
            <span
              className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: IQ_GREEN }}
            />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
            Live
          </span>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="flex animate-ticker-scroll whitespace-nowrap">
            {items.map((item, i) => (
              <Link
                key={`${item.text}-${i}`}
                href={item.href}
                className="inline-flex items-center gap-2 px-6 text-xs font-medium text-neutral-600 no-underline transition-colors hover:text-neutral-900"
              >
                <span>{item.icon}</span>
                <span>{item.text}</span>
                <span className="text-neutral-300">·</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
