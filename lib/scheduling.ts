export function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minsToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

export function generateSlotsForDay(start: string, end: string, duration: number): string[] {
  const startMins = timeToMins(start);
  const endMins = timeToMins(end);
  const slots: string[] = [];
  for (let m = startMins; m + duration <= endMins; m += 60)
    slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:00`);
  return slots;
}

export function buildWeek(base: Date): Date[] {
  const start = new Date(base);
  start.setDate(start.getDate() - start.getDay() + 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
