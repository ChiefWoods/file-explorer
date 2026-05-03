import { safeInternalPath } from "#/lib/nav-redirect";
import { describe, expect, it } from "vitest";

describe("safeInternalPath", () => {
  it("accepts internal relative paths", () => {
    expect(safeInternalPath("/drive/shared?view=all", "/drive")).toBe("/drive/shared?view=all");
  });

  it("falls back for missing values", () => {
    expect(safeInternalPath(undefined, "/drive")).toBe("/drive");
  });

  it("rejects external protocol urls", () => {
    expect(safeInternalPath("https://evil.example/steal", "/drive")).toBe("/drive");
  });

  it("rejects protocol-relative urls", () => {
    expect(safeInternalPath("//evil.example", "/drive")).toBe("/drive");
  });

  it("rejects non-rooted paths", () => {
    expect(safeInternalPath("drive/shared", "/drive")).toBe("/drive");
  });
});
