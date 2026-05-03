import {
  matchesAddedFilterValue,
  matchesTypeFilterValue,
  type DriveItem,
} from "#/components/drive/drive-folder-page";
import { describe, expect, it } from "vitest";

function createItem(overrides: Partial<DriveItem> = {}): DriveItem {
  return {
    id: "file-1",
    type: "file",
    name: "Report",
    modified: "May 1",
    modifiedAtMs: new Date("2026-05-01T00:00:00.000Z").getTime(),
    mimeType: "text/plain",
    ...overrides,
  };
}

describe("drive-folder-page filter helpers", () => {
  it("matches type filters for folders and MIME types", () => {
    const file = createItem({ type: "file", mimeType: "text/plain" });
    const folder = createItem({ id: "folder-1", type: "folder", mimeType: undefined });

    expect(matchesTypeFilterValue(file, null)).toBe(true);
    expect(matchesTypeFilterValue(folder, "folders")).toBe(true);
    expect(matchesTypeFilterValue(file, "folders")).toBe(false);
    expect(matchesTypeFilterValue(file, "text/plain")).toBe(true);
    expect(matchesTypeFilterValue(file, "image/png")).toBe(false);
  });

  it("matches relative-date filters", () => {
    const now = new Date("2026-05-10T00:00:00.000Z");
    const todayItem = createItem({ modifiedAtMs: now.getTime() });
    const eightDaysAgo = createItem({
      modifiedAtMs: new Date("2026-05-02T00:00:00.000Z").getTime(),
    });
    const lastYear = createItem({
      modifiedAtMs: new Date("2025-05-02T00:00:00.000Z").getTime(),
    });

    expect(matchesAddedFilterValue(todayItem, "today", { now })).toBe(true);
    expect(matchesAddedFilterValue(eightDaysAgo, "last-7-days", { now })).toBe(false);
    expect(matchesAddedFilterValue(eightDaysAgo, "last-30-days", { now })).toBe(true);
    expect(matchesAddedFilterValue(lastYear, "last-year", { now })).toBe(true);
    expect(matchesAddedFilterValue(todayItem, "last-year", { now })).toBe(false);
  });

  it("matches custom date ranges using inclusive day boundaries", () => {
    const item = createItem({
      modifiedAtMs: new Date("2026-05-10T12:00:00.000Z").getTime(),
    });

    expect(
      matchesAddedFilterValue(item, "custom-range", {
        customAddedAfter: new Date("2026-05-10T22:00:00.000Z"),
      }),
    ).toBe(true);

    expect(
      matchesAddedFilterValue(item, "custom-range", {
        customAddedBefore: new Date("2026-05-10T00:01:00.000Z"),
      }),
    ).toBe(true);

    expect(
      matchesAddedFilterValue(item, "custom-range", {
        customAddedAfter: new Date("2026-05-11T00:00:00.000Z"),
      }),
    ).toBe(false);
  });
});
