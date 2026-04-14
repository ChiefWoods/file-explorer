import { randomBytes } from "node:crypto";

import { z } from "zod";
import { SHARE_DURATION_PRESETS, type ShareDurationPreset } from "#/lib/share-duration";

// 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
const MS_PER_DAY = 86_400_000;
const MAX_SHARE_DAYS = 365;

export const createShareLinkInputSchema = z
  .object({
    folderId: z.string().trim().min(1, "Folder is required."),
    duration: z.enum(SHARE_DURATION_PRESETS).optional(),
    expiresAt: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.duration && !value.expiresAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either a duration preset or expiresAt.",
        path: ["duration"],
      });
    }
  });

export type ResolveShareExpiryInput = {
  duration?: ShareDurationPreset;
  expiresAt?: string;
};

export function resolveShareExpiry(input: ResolveShareExpiryInput, now = new Date()): Date | null {
  if (input.expiresAt) {
    const parsed = new Date(input.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid expiresAt date.");
    }

    if (parsed <= now) {
      throw new Error("Expiry must be in the future.");
    }

    const maxAllowed = new Date(now.getTime() + MAX_SHARE_DAYS * MS_PER_DAY);
    if (parsed > maxAllowed) {
      throw new Error(`Expiry must be within ${MAX_SHARE_DAYS} days.`);
    }

    return parsed;
  }

  const duration = input.duration ?? "7d";
  if (duration === "never") {
    return null;
  }
  const days = duration === "1d" ? 1 : duration === "7d" ? 7 : 30;

  return new Date(now.getTime() + days * MS_PER_DAY);
}

export function isShareExpired(expiresAt: Date | null, now = new Date()): boolean {
  if (!expiresAt) {
    return false;
  }
  return expiresAt.getTime() <= now.getTime();
}

export function createShareToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}
