import { format, isToday, parseISO } from "date-fns";

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
    return "Today";
  }

  return format(date, "EEE, d MMM");
}

export function formatTimeLabel(iso: string): string {
  return format(parseISO(iso), "HH:mm");
}
