import { describe, expect, it } from "vitest";
import { addDaysToLocalDayKey, createTimestampForLocalDay, getLocalDayKey } from "../../shared/date";

describe("local date helpers", () => {
  it("formats local day keys without UTC slicing", () => {
    const date = new Date(2026, 4, 24, 23, 30, 0, 0);

    expect(getLocalDayKey(date)).toBe("2026-05-24");
  });

  it("adds days to local day keys", () => {
    expect(addDaysToLocalDayKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysToLocalDayKey("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("creates timestamps for selected days using the current local time", () => {
    const now = new Date(2026, 4, 24, 18, 45, 12, 30);
    const timestamp = createTimestampForLocalDay("2026-05-20", now);
    const parsed = new Date(timestamp);

    expect(getLocalDayKey(parsed)).toBe("2026-05-20");
    expect(parsed.getHours()).toBe(18);
    expect(parsed.getMinutes()).toBe(45);
  });
});
