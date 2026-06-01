import React, { useState } from "react";
import { X, Plus, Sparkles } from "lucide-react";

export default function FeaturesInput({ value = [], onChange }) {
  const [text, setText] = useState("");

  const add = () => {
    const t = text.trim();
    if (!t) return;
    if (value.includes(t)) return;
    onChange([...value, t]);
    setText("");
  };

  const remove = (idx) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div data-testid="features-input">
      <div className="flex gap-2 mb-3">
        <input
          data-testid="feature-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="مثال: مسبح داخلي · ملعب كرة قدم · غرفة بلايستيشن"
          className="flex-1 h-11 rounded-md border border-forest/10 bg-bone px-4 text-sm focus:ring-2 focus:ring-gold/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          data-testid="add-feature-btn"
          className="inline-flex items-center gap-1.5 px-4 h-11 rounded-md bg-forest text-bone hover:bg-forest-dark transition text-sm"
        >
          <Plus size={14} /> إضافة
        </button>
      </div>

      {value.length === 0 ? (
        <div className="text-xs text-inkSoft text-center py-6 border border-dashed border-forest/15 rounded-lg">
          أضف ميزات شاليهك بحرية كاملة
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {value.map((f, i) => (
            <div
              key={`${f}-${i}`}
              data-testid={`feature-tag-${i}`}
              className="inline-flex items-center gap-2 bg-forest text-bone rounded-full px-3 py-1.5 text-sm group"
            >
              <Sparkles size={12} strokeWidth={1.5} className="text-gold" />
              <span>{f}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                data-testid={`remove-feature-${i}`}
                className="hover:bg-bone/10 rounded-full p-0.5"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
