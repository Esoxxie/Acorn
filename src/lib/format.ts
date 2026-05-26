import { format, isToday, parseISO } from "date-fns";
import { de } from "date-fns/locale";

export function formatCalories(value: number): string {
  return `${Math.round(value)} kcal`;
}

export function formatMacro(value: number): string {
  return `${Math.round(value * 10) / 10}g`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

export function formatDateLabel(iso: string): string {
  const date = parseISO(iso);
  if (isToday(date)) {
    return "Heute";
  }

  return format(date, "EEE, d. MMM", { locale: de });
}

export function formatTimeLabel(iso: string): string {
  return format(parseISO(iso), "HH:mm", { locale: de });
}

export function toLocalDatetimeString(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseLocalDatetime(localString: string): string {
  const parts = localString.split(/[-T:]/);
  if (parts.length < 5) return new Date().toISOString();
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const hour = parseInt(parts[3], 10);
  const minute = parseInt(parts[4], 10);
  return new Date(year, month, day, hour, minute).toISOString();
}
