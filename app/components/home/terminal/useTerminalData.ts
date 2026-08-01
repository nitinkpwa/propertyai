"use client";

import { useEffect, useState } from "react";
import { getCachedListingProperties } from "@/lib/home/listingsCache";
import { buildTerminalBundle } from "@/lib/home/terminalData";
import type { TerminalBundle } from "@/lib/home/terminalTypes";
import { listingToIntelligenceCard } from "@/lib/home/types";
import type { IntelligencePropertyCardModel } from "@/lib/home/types";

type State = {
  loading: boolean;
  bundle: TerminalBundle | null;
  properties: IntelligencePropertyCardModel[];
};

let shared: TerminalBundle | null = null;
let sharedProps: IntelligencePropertyCardModel[] = [];
let sharedAt = 0;
const TTL = 30_000;

function readShared(): State | null {
  if (shared && Date.now() - sharedAt < TTL) {
    return { loading: false, bundle: shared, properties: sharedProps };
  }
  return null;
}

export function useTerminalData(): State {
  const [state, setState] = useState<State>(() => {
    return readShared() ?? { loading: true, bundle: null, properties: [] };
  });

  useEffect(() => {
    const cached = readShared();
    if (cached) return;

    let cancelled = false;

    getCachedListingProperties()
      .then((rows) => {
        if (cancelled) return;
        const bundle = buildTerminalBundle(rows);
        const properties = rows.slice(0, 12).map(listingToIntelligenceCard);
        shared = bundle;
        sharedProps = properties;
        sharedAt = Date.now();
        setState({ loading: false, bundle, properties });
      })
      .catch(() => {
        if (cancelled) return;
        const empty = buildTerminalBundle([]);
        setState({ loading: false, bundle: empty, properties: [] });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
