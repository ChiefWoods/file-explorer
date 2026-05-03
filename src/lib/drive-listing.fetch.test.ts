import { requestDriveListing } from "#/lib/drive-listing.fetch";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("requestDriveListing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed listing payload for successful responses", async () => {
    const payload = {
      folderId: "root-1",
      breadcrumbs: [],
      isOwner: true,
      viewMode: "list",
      sidebarFolders: [],
      folders: [],
      files: [],
      storageUsedBytes: 0,
      storagePct: 0,
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(requestDriveListing("/api/drive/listing?folderId=root")).resolves.toEqual(payload);
  });

  it("throws response status and API message for non-OK responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: "Access denied." },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(requestDriveListing("/api/drive/listing?folderId=abc")).rejects.toMatchObject({
      status: 403,
      statusCode: 403,
      message: "Access denied.",
    });
  });

  it("throws fallback message when error response body is invalid JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not-json", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      }),
    );

    await expect(requestDriveListing("/api/drive/listing?folderId=abc")).rejects.toMatchObject({
      status: 500,
      statusCode: 500,
      message: "Could not load folder.",
    });
  });

  it("rejects malformed success payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(requestDriveListing("/api/drive/listing?folderId=abc")).rejects.toMatchObject({
      status: 200,
      statusCode: 200,
      message: "Could not load folder.",
    });
  });
});
