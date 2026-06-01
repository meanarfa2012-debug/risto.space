import React from "react";
import { Star } from "lucide-react";

export default function StarRating({ value = 0, max = 5, size = 16, interactive = false, onChange, testIdPrefix = "rating" }) {
  return (
    <div className="inline-flex items-center gap-0.5" dir="ltr">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.round(value);
        const StarComp = (
          <Star
            size={size}
            strokeWidth={1.5}
            className={filled ? "fill-gold text-gold" : "text-gold/40"}
          />
        );
        if (interactive) {
          return (
            <button
              type="button"
              key={i}
              data-testid={`${testIdPrefix}-star-${i + 1}`}
              onClick={() => onChange?.(i + 1)}
              className="transition-transform hover:scale-110"
              aria-label={`${i + 1} نجوم`}
            >
              {StarComp}
            </button>
          );
        }
        return <span key={i}>{StarComp}</span>;
      })}
    </div>
  );
}
