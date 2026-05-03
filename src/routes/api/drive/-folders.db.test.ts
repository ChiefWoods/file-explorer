import { assertDatabaseUrlConfigured, resetDb, seedUserWithRoot } from "#/test/db-test-utils";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

assertDatabaseUrlConfigured();

vi.mock("#/lib/api/session", () => ({
  requireAuthSession: vi.fn(),
  getOptionalAuthSession: vi.fn(),
}));

vi.mock("#/lib/cloudinary", () => ({
  buildCloudinaryDownloadUrl: vi.fn(
    (secureUrl: string, name?: string) => `dl:${secureUrl}:${name ?? ""}`,
  ),
  destroyCloudinaryAsset: vi.fn(),
  toCloudinaryResourceType: vi.fn((resourceType: string) => resourceType),
  uploadBufferToCloudinary: vi.fn(),
}));

type FoldersHandlers = typeof import("#/routes/api/drive/folders");
type FolderByIdHandlers = typeof import("#/routes/api/drive/folders/$folderId");
type DbModule = typeof import("#/lib/db");
type SessionModule = typeof import("#/lib/api/session");
type CloudinaryModule = typeof import("#/lib/cloudinary");

let db: DbModule;
let foldersHandlers: FoldersHandlers;
let folderByIdHandlers: FolderByIdHandlers;
let sessionModule: SessionModule;
let cloudinaryModule: CloudinaryModule;

const USER_ID = "folders-owner";

describe("folders API handlers (db integration)", () => {
  beforeAll(async () => {
    db = await import("#/lib/db");
    foldersHandlers = await import("#/routes/api/drive/folders");
    folderByIdHandlers = await import("#/routes/api/drive/folders/$folderId");
    sessionModule = await import("#/lib/api/session");
    cloudinaryModule = await import("#/lib/cloudinary");
  });

  beforeEach(async () => {
    await resetDb(db.prisma);
    (sessionModule.requireAuthSession as unknown as ReturnType<typeof vi.fn>).mockReset();
    (cloudinaryModule.destroyCloudinaryAsset as unknown as ReturnType<typeof vi.fn>).mockReset();
    (sessionModule.requireAuthSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: USER_ID },
      session: { id: "session-1" },
    });
    (
      cloudinaryModule.destroyCloudinaryAsset as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      result: "ok",
    });
  });

  afterAll(async () => {
    await db.prisma.$disconnect();
  });

  it("creates a folder and rejects duplicates in the same parent", async () => {
    const root = await seedUserWithRoot(db.prisma, USER_ID);

    const createRequest = new Request("http://localhost/api/drive/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Docs", parentId: root.id }),
    });

    const firstResponse = await foldersHandlers.handleCreateFolder(createRequest);
    expect(firstResponse.status).toBe(201);

    const duplicateResponse = await foldersHandlers.handleCreateFolder(
      new Request("http://localhost/api/drive/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Docs", parentId: root.id }),
      }),
    );
    expect(duplicateResponse.status).toBe(409);
    await expect(duplicateResponse.json()).resolves.toMatchObject({
      error: { code: "FOLDER_ALREADY_EXISTS" },
    });
  });

  it("lists folders/files and applies MIME filter", async () => {
    const root = await seedUserWithRoot(db.prisma, USER_ID);
    await db.prisma.folder.create({
      data: { userId: USER_ID, parentId: root.id, name: "A" },
    });
    await db.prisma.file.createMany({
      data: [
        {
          userId: USER_ID,
          folderId: root.id,
          name: "img.png",
          mimeType: "image/png",
          bytes: 10,
          cloudinaryPublicId: "img-1",
          resourceType: "image",
          secureUrl: "https://cdn.example/img",
        },
        {
          userId: USER_ID,
          folderId: root.id,
          name: "notes.txt",
          mimeType: "text/plain",
          bytes: 8,
          cloudinaryPublicId: "txt-1",
          resourceType: "raw",
          secureUrl: "https://cdn.example/txt",
        },
      ],
    });

    const response = await foldersHandlers.handleListFolders(
      new Request(`http://localhost/api/drive/folders?folderId=${root.id}&fileType=image`),
    );
    const json = (await response.json()) as {
      folders: Array<{ id: string }>;
      files: Array<{ name: string; downloadUrl: string }>;
      storage: { usedBytes: number };
    };

    expect(response.status).toBe(200);
    expect(json.folders).toHaveLength(1);
    expect(json.files).toEqual([
      expect.objectContaining({
        name: "img.png",
        downloadUrl: "dl:https://cdn.example/img:img.png",
      }),
    ]);
    expect(json.storage.usedBytes).toBe(18);
  });

  it("returns INVALID_DATE_FILTER for malformed date search params", async () => {
    const root = await seedUserWithRoot(db.prisma, USER_ID);
    const response = await foldersHandlers.handleListFolders(
      new Request(
        `http://localhost/api/drive/folders?folderId=${root.id}&modifiedAfter=not-a-date`,
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_DATE_FILTER" },
    });
  });

  it("updates folder name and parent", async () => {
    const root = await seedUserWithRoot(db.prisma, USER_ID);
    const src = await db.prisma.folder.create({
      data: { userId: USER_ID, parentId: root.id, name: "Src" },
    });
    const docs = await db.prisma.folder.create({
      data: { userId: USER_ID, parentId: root.id, name: "Docs" },
    });

    const response = await folderByIdHandlers.handleUpdateFolder(
      new Request(`http://localhost/api/drive/folders/${src.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Source", parentId: docs.id }),
      }),
      src.id,
    );

    expect(response.status).toBe(200);
    const updated = await db.prisma.folder.findUnique({ where: { id: src.id } });
    expect(updated?.name).toBe("Source");
    expect(updated?.parentId).toBe(docs.id);
  });

  it("returns relative paths for nested folder download payloads", async () => {
    const root = await seedUserWithRoot(db.prisma, USER_ID);
    const docs = await db.prisma.folder.create({
      data: { userId: USER_ID, parentId: root.id, name: "Docs" },
    });
    const reports = await db.prisma.folder.create({
      data: { userId: USER_ID, parentId: docs.id, name: "Reports" },
    });
    await db.prisma.file.create({
      data: {
        userId: USER_ID,
        folderId: reports.id,
        name: "q1.pdf",
        mimeType: "application/pdf",
        bytes: 12,
        cloudinaryPublicId: "q1",
        resourceType: "raw",
        secureUrl: "https://cdn.example/q1",
      },
    });

    const response = await folderByIdHandlers.handleGetFolderDownload(
      new Request(`http://localhost/api/drive/folders/${docs.id}`),
      docs.id,
    );
    const json = (await response.json()) as {
      files: Array<{ relativePath: string; name: string }>;
    };

    expect(response.status).toBe(200);
    expect(json.files).toEqual([
      expect.objectContaining({
        name: "q1.pdf",
        relativePath: "Reports",
      }),
    ]);
  });

  it("deletes a folder subtree and associated file rows", async () => {
    const root = await seedUserWithRoot(db.prisma, USER_ID);
    const docs = await db.prisma.folder.create({
      data: { userId: USER_ID, parentId: root.id, name: "Docs" },
    });
    const nested = await db.prisma.folder.create({
      data: { userId: USER_ID, parentId: docs.id, name: "Nested" },
    });
    await db.prisma.file.createMany({
      data: [
        {
          userId: USER_ID,
          folderId: docs.id,
          name: "a.txt",
          mimeType: "text/plain",
          bytes: 1,
          cloudinaryPublicId: "a",
          resourceType: "raw",
          secureUrl: "https://cdn.example/a",
        },
        {
          userId: USER_ID,
          folderId: nested.id,
          name: "b.txt",
          mimeType: "text/plain",
          bytes: 1,
          cloudinaryPublicId: "b",
          resourceType: "raw",
          secureUrl: "https://cdn.example/b",
        },
      ],
    });

    const response = await folderByIdHandlers.handleDeleteFolder(
      new Request(`http://localhost/api/drive/folders/${docs.id}`, { method: "DELETE" }),
      docs.id,
    );
    const json = (await response.json()) as {
      deletedNestedFolderCount: number;
      deletedFileCount: number;
    };

    expect(response.status).toBe(200);
    expect(json.deletedNestedFolderCount).toBe(1);
    expect(json.deletedFileCount).toBe(2);

    const remainingFolders = await db.prisma.folder.findMany({
      where: { id: { in: [docs.id, nested.id] } },
    });
    const remainingFiles = await db.prisma.file.findMany({
      where: { cloudinaryPublicId: { in: ["a", "b"] } },
    });
    expect(remainingFolders).toHaveLength(0);
    expect(remainingFiles).toHaveLength(0);
  });

  it("returns CLOUDINARY_DELETE_FAILED and keeps DB rows when cloud delete fails", async () => {
    const root = await seedUserWithRoot(db.prisma, USER_ID);
    const docs = await db.prisma.folder.create({
      data: { userId: USER_ID, parentId: root.id, name: "Docs" },
    });
    await db.prisma.file.create({
      data: {
        userId: USER_ID,
        folderId: docs.id,
        name: "a.txt",
        mimeType: "text/plain",
        bytes: 1,
        cloudinaryPublicId: "a",
        resourceType: "raw",
        secureUrl: "https://cdn.example/a",
      },
    });

    (
      cloudinaryModule.destroyCloudinaryAsset as unknown as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce(new Error("cloud failed"));

    const response = await folderByIdHandlers.handleDeleteFolder(
      new Request(`http://localhost/api/drive/folders/${docs.id}`, { method: "DELETE" }),
      docs.id,
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "CLOUDINARY_DELETE_FAILED" },
    });
    const stillThere = await db.prisma.folder.findUnique({ where: { id: docs.id } });
    expect(stillThere).not.toBeNull();
  });
});
