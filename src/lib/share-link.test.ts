import { createShareToken, isShareExpired, resolveShareExpiry } from "#/lib/share-link";
import { describe, expect, it } from "vitest";

describe("share-link helpers", () => {
  it("resolves preset durations from now", () => {
    const now = new Date("2026-04-13T00:00:00.000Z");
    const expiresAt = resolveShareExpiry({ duration: "7d" }, now);

    expect(expiresAt?.toISOString()).toBe("2026-04-20T00:00:00.000Z");
  });

  it("resolves 30d duration from now", () => {
    const now = new Date("2026-04-13T00:00:00.000Z");
    const expiresAt = resolveShareExpiry({ duration: "30d" }, now);

    expect(expiresAt?.toISOString()).toBe("2026-05-13T00:00:00.000Z");
  });

  it("supports never-expiring duration", () => {
    const now = new Date("2026-04-13T00:00:00.000Z");
    const expiresAt = resolveShareExpiry({ duration: "never" }, now);

    expect(expiresAt).toBeNull();
  });

  it("accepts explicit custom expiry", () => {
    const now = new Date("2026-04-13T00:00:00.000Z");
    const expiresAt = resolveShareExpiry({ expiresAt: "2026-05-01T00:00:00.000Z" }, now);

    expect(expiresAt?.toISOString()).toBe("2026-05-01T00:00:00.000Z");
  });

  it("rejects past custom expiry", () => {
    const now = new Date("2026-04-13T00:00:00.000Z");
    expect(() => resolveShareExpiry({ expiresAt: "2026-04-01T00:00:00.000Z" }, now)).toThrow(
      "future",
    );
  });

  it("flags expiry correctly", () => {
    const now = new Date("2026-04-13T00:00:00.000Z");
    const expiredAt = new Date("2026-04-12T23:59:59.000Z");
    const validUntil = new Date("2026-04-14T00:00:00.000Z");

    expect(isShareExpired(expiredAt, now)).toBe(true);
    expect(isShareExpired(validUntil, now)).toBe(false);
    expect(isShareExpired(null, now)).toBe(false);
  });

  it("generates strong tokens", () => {
    const token = createShareToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[a-f0-9]+$/);
  });
});
