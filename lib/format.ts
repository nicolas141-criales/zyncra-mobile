export function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${Math.round(n).toLocaleString("es-CO")}`;
}

export function fmtMoneyFull(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CO");
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function fmtDateShort(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

export function fmtDateCompact(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export function fmtDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

export function fmt12(t: string): string {
  const h = parseInt(t.slice(0, 2), 10);
  const m = t.slice(3, 5);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${suffix}`;
}

export function fmt12Hour(t: string): string {
  const h = parseInt(t.slice(0, 2), 10);
  return `${h % 12 || 12}:00 ${h >= 12 ? "PM" : "AM"}`;
}

export function fmtPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("57") ? d : `57${d}`;
}

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}
