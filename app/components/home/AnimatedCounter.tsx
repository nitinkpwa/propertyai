"use client";

import { useEffect, useState } from "react";

export default function AnimatedCounter({
  value,
  duration = 1200,
}: {
  value: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(value / (duration / 16)));
    const id = window.setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        window.clearInterval(id);
      } else {
        setDisplay(start);
      }
    }, 16);
    return () => window.clearInterval(id);
  }, [value, duration]);

  return <>{display.toLocaleString("en-IN")}</>;
}
