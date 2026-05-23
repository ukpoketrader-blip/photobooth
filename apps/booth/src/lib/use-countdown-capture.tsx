"use client";

import { useEffect, useState } from "react";

export function useCountdownCapture(onCapture: () => void) {
  const [count, setCount] = useState<number | null>(null);

  const start = () => setCount(3);

  useEffect(() => {
    if (count === null) return;
    if (count === 0) {
      onCapture();
      setCount(null);
      return;
    }
    const t = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onCapture]);

  const isCounting = count !== null;

  return {
    count,
    start,
    isCounting,
    overlay:
      isCounting && count !== null ? (
        <div className="countdown-overlay" aria-live="polite">
          <div key={count} className="countdown-display">
            {count > 0 ? count : "Go!"}
          </div>
        </div>
      ) : null,
  };
}
