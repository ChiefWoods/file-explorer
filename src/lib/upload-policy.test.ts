import { describe, expect, it } from "vitest";

import { MAX_UPLOAD_BYTES, normalizeItemName, validateUploadFile } from "#/lib/upload-policy";

describe("upload policy", () => {
  it("accepts files that match allowlisted MIME and extension", () => {
    const result = validateUploadFile({
      name: "avatar.png",
      size: 1024,
      type: "image/png",
    } as Pick<File, "name" | "size" | "type">);

    expect(result.ok).toBe(true);
  });

  it("rejects oversized files", () => {
    const result = validateUploadFile({
      name: "big.pdf",
      size: MAX_UPLOAD_BYTES + 1,
      type: "application/pdf",
    } as Pick<File, "name" | "size" | "type">);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("too large");
    }
  });

  it("rejects mismatched extension and MIME", () => {
    const result = validateUploadFile({
      name: "invoice.txt",
      size: 200,
      type: "application/pdf",
    } as Pick<File, "name" | "size" | "type">);

    expect(result.ok).toBe(false);
  });

  it("normalizes unsafe file names", () => {
    const normalized = normalizeItemName("  re:port<>/2026?.pdf  ");
    expect(normalized).toBe("re port 2026 .pdf");
  });
});
