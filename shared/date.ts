const DAY_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function getLocalDayKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;

  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

export function localDayKeyToDate(dayKey: string): Date {
  const match = DAY_KEY_PATTERN.exec(dayKey);
  if (!match) {
    throw new Error(`Invalid local day key: ${dayKey}`);
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
}

export function addDaysToLocalDayKey(dayKey: string, days: number): string {
  const date = localDayKeyToDate(dayKey);
  date.setDate(date.getDate() + days);

  return getLocalDayKey(date);
}

export function createTimestampForLocalDay(dayKey: string, now: Date = new Date()): string {
  if (dayKey === getLocalDayKey(now)) {
    return now.toISOString();
  }

  const targetDate = localDayKeyToDate(dayKey);
  targetDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

  return targetDate.toISOString();
}
