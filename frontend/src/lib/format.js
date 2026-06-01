// Time + date formatting helpers (Arabic-friendly)

export const SUPPORT_PHONE = "0566397331";

/**
 * Convert "HH:MM" 24h string to "h:MM AM/PM" 12h string.
 */
export const formatTime12 = (t) => {
  if (!t || typeof t !== "string" || !t.includes(":")) return t || "";
  const [hRaw, mRaw] = t.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

/**
 * Today's date in YYYY-MM-DD format, for "min" attribute on date inputs.
 */
export const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Current HH:MM in 24h format, used for input "min" on time fields when date == today.
 */
export const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const BLOCK_REASONS = [
  { value: "personal", label: "استخدام شخصي" },
  { value: "maintenance", label: "صيانة" },
  { value: "closure", label: "إغلاق مؤقت" },
];

export const blockReasonLabel = (v) =>
  BLOCK_REASONS.find((r) => r.value === v)?.label || "محجوب";
