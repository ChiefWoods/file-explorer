/** @vitest-environment jsdom */

import "#/test/dom-test-setup";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fileEntries: string[] = [];
const zipInstances: Array<{
  file: ReturnType<typeof vi.fn>;
  generateAsync: ReturnType<typeof vi.fn>;
}> = [];

vi.mock("jszip", () => ({
  default: vi.fn().mockImplementation(() => {
    const instance = {
      file: vi.fn((path: string) => {
        fileEntries.push(path);
      }),
      generateAsync: vi.fn(async () => new Blob(["zip"], { type: "application/zip" })),
    };
    zipInstances.push(instance);
    return instance;
  }),
}));

import { downloadMultipleFiles } from "#/lib/drive-download";

describe("downloadMultipleFiles", () => {
  beforeEach(() => {
    fileEntries.length = 0;
    zipInstances.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing for empty inputs", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await downloadMultipleFiles([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(zipInstances).toHaveLength(0);
  });

  it("redirects directly for single file downloads", async () => {
    const assignSpy = vi.spyOn(window.location, "assign").mockImplementation(() => {});

    await downloadMultipleFiles([{ name: "one.txt", downloadUrl: "https://cdn.example/one" }]);
    expect(assignSpy).toHaveBeenCalledWith("https://cdn.example/one");
  });

  it("zips multiple files and sanitizes nested paths", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(new Blob(["file-bytes"]), {
          status: 200,
        }),
      ),
    );
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:zip-url");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await downloadMultipleFiles([
      {
        name: "a?.txt",
        relativePath: "folder<>/sub|folder",
        downloadUrl: "https://cdn.example/a",
      },
      {
        name: "b.txt",
        relativePath: "folder<>",
        downloadUrl: "https://cdn.example/b",
      },
    ]);

    expect(fileEntries).toEqual(["folder_/sub_folder/a_.txt", "folder_/b.txt"]);
    expect(zipInstances).toHaveLength(1);
    expect(zipInstances[0].generateAsync).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:zip-url");
  });

  it("throws when file fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("bad", {
        status: 500,
      }),
    );

    await expect(
      downloadMultipleFiles([
        { name: "broken.txt", downloadUrl: "https://cdn.example/broken" },
        { name: "ok.txt", downloadUrl: "https://cdn.example/ok" },
      ]),
    ).rejects.toThrow("Could not fetch broken.txt for download.");
  });
});
