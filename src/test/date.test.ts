import { describe, expect, it } from "vitest";
import { addDaysToLocalDayKey, createTimestampForLocalDay, getLocalDayKey } from "../../shared/date";
import { parseLocalDatetime, toLocalDatetimeString } from "../lib/format";

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

describe("LogFlow datetime helpers", () => {
  it("converts ISO string to local HTML input format YYYY-MM-DDTHH:mm", () => {
    const localStr = toLocalDatetimeString("2026-05-26T17:27:37.000Z");
    const expectedDate = new Date("2026-05-26T17:27:37.000Z");
    const pad = (n: number) => String(n).padStart(2, "0");
    const expectedStr = `${expectedDate.getFullYear()}-${pad(expectedDate.getMonth() + 1)}-${pad(expectedDate.getDate())}T${pad(expectedDate.getHours())}:${pad(expectedDate.getMinutes())}`;
    expect(localStr).toBe(expectedStr);
  });

  it("handles invalid dates in toLocalDatetimeString", () => {
    expect(toLocalDatetimeString("invalid-date")).toBe("");
  });

  it("parses local string to ISO string in timezone-safe manner", () => {
    const localStr = "2026-05-26T17:27";
    const isoStr = parseLocalDatetime(localStr);
    const parsedDate = new Date(isoStr);
    expect(parsedDate.getFullYear()).toBe(2026);
    expect(parsedDate.getMonth()).toBe(4); // 0-based month (May is 4)
    expect(parsedDate.getDate()).toBe(26);
    expect(parsedDate.getHours()).toBe(17);
    expect(parsedDate.getMinutes()).toBe(27);
  });

  it("handles invalid inputs gracefully in parseLocalDatetime", () => {
    const result = parseLocalDatetime("invalid");
    expect(() => new Date(result)).not.toThrow();
  });
});
