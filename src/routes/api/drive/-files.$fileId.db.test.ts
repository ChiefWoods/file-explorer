import {
  assertDatabaseUrlConfigured,
  resetDb,
  seedUser,
  seedUserWithRoot,
} from "#/test/db-test-utils";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

assertDatabaseUrlConfigured();

vi.mock("#/lib/api/session", () => ({
  getOptionalAuthSession: vi.fn(),
  requireAuthSession: vi.fn(),
}));

vi.mock("#/lib/cloudinary", () => ({
  buildCloudinaryDownloadUrl: vi.fn(
    (secureUrl: string, name?: string) => `dl:${secureUrl}:${name ?? ""}`,
  ),
  destroyCloudinaryAsset: vi.fn(),
  toCloudinaryResourceType: vi.fn((resourceType: string) => resourceType),
  uploadBufferToCloudinary: vi.fn(),
}));

type FileHandlers = typeof import("#/routes/api/drive/files/$fileId");
type DbModule = typeof import("#/lib/db");
type SessionModule = typeof import("#/lib/api/session");
type CloudinaryModule = typeof import("#/lib/cloudinary");

let db: DbModule;
let fileHandlers: FileHandlers;
let sessionModule: SessionModule;
let cloudinaryModule: CloudinaryModule;

const OWNER_ID = "file-owner";
const VIEWER_ID = "file-viewer";

describe("file API handlers (db integration)", () => {
  beforeAll(async () => {
    db = await import("#/lib/db");
    fileHandlers = await import("#/routes/api/drive/files/$fileId");
    sessionModule = await import("#/lib/api/session");
    cloudinaryModule = await import("#/lib/cloudinary");
  });

  beforeEach(async () => {
    await resetDb(db.prisma);
    (sessionModule.getOptionalAuthSession as unknown as ReturnType<typeof vi.fn>).mockReset();
    (sessionModule.requireAuthSession as unknown as ReturnType<typeof vi.fn>).mockReset();
    (cloudinaryModule.destroyCloudinaryAsset as unknown as ReturnType<typeof vi.fn>).mockReset();
    (
      cloudinaryModule.destroyCloudinaryAsset as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      result: "ok",
    });
  });

  afterAll(async () => {
    await db.prisma.$disconnect();
  });

  async function seedOwnedFile() {
    const root = await seedUserWithRoot(db.prisma, OWNER_ID);
    const file = await db.prisma.file.create({
      data: {
        userId: OWNER_ID,
        folderId: root.id,
        name: "doc.txt",
        mimeType: "text/plain",
        bytes: 42,
        cloudinaryPublicId: "doc-1",
        resourceType: "raw",
        secureUrl: "https://cdn.example/doc-1",
      },
    });
    return { root, file };
  }

  it("returns owner payload for GET when requester owns file", async () => {
    const { file } = await seedOwnedFile();
    const getOptionalAuthSessionMock =
      sessionModule.getOptionalAuthSession as unknown as ReturnType<typeof vi.fn>;
    getOptionalAuthSessionMock.mockResolvedValue({
      user: { id: OWNER_ID },
      session: { id: "session-1" },
    });

    const response = await fileHandlers.handleGetFile(
      new Request(`http://localhost/api/drive/files/${file.id}`),
      file.id,
    );
    const json = (await response.json()) as {
      id: string;
      cloudinaryPublicId: string;
      downloadUrl: string;
    };

    expect(response.status).toBe(200);
    expect(json.id).toBe(file.id);
    expect(json.cloudinaryPublicId).toBe("doc-1");
    expect(json.downloadUrl).toBe("dl:https://cdn.example/doc-1:doc.txt");
  });

  it("returns AUTH_REQUIRED for unauthenticated non-owners without share", async () => {
    const { file } = await seedOwnedFile();
    const getOptionalAuthSessionMock =
      sessionModule.getOptionalAuthSession as unknown as ReturnType<typeof vi.fn>;
    getOptionalAuthSessionMock.mockResolvedValue(null);

    const response = await fileHandlers.handleGetFile(
      new Request(`http://localhost/api/drive/files/${file.id}`),
      file.id,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTH_REQUIRED" },
    });
  });

  it("returns limited payload for shared non-owner GET access", async () => {
    const { root, file } = await seedOwnedFile();
    await seedUser(db.prisma, VIEWER_ID);
    await db.prisma.shareLink.create({
      data: {
        token: `folder:${root.id}`,
        folderId: root.id,
        createdByUserId: OWNER_ID,
        expiresAt: null,
      },
    });

    const getOptionalAuthSessionMock =
      sessionModule.getOptionalAuthSession as unknown as ReturnType<typeof vi.fn>;
    getOptionalAuthSessionMock.mockResolvedValue({
      user: { id: VIEWER_ID },
      session: { id: "session-2" },
    });

    const response = await fileHandlers.handleGetFile(
      new Request(`http://localhost/api/drive/files/${file.id}`),
      file.id,
    );
    const json = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(json.id).toBe(file.id);
    expect("cloudinaryPublicId" in json).toBe(false);
    expect(json.downloadUrl).toBe("dl:https://cdn.example/doc-1:doc.txt");
  });

  it("updates file name and target folder", async () => {
    const { root, file } = await seedOwnedFile();
    const otherFolder = await db.prisma.folder.create({
      data: {
        userId: OWNER_ID,
        parentId: root.id,
        name: "Other",
      },
    });
    const requireAuthSessionMock = sessionModule.requireAuthSession as unknown as ReturnType<
      typeof vi.fn
    >;
    requireAuthSessionMock.mockResolvedValue({
      user: { id: OWNER_ID },
      session: { id: "session-1" },
    });

    const response = await fileHandlers.handleUpdateFile(
      new Request(`http://localhost/api/drive/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "renamed.txt", folderId: otherFolder.id }),
      }),
      file.id,
    );

    expect(response.status).toBe(200);
    const updated = await db.prisma.file.findUnique({ where: { id: file.id } });
    expect(updated?.name).toBe("renamed.txt");
    expect(updated?.folderId).toBe(otherFolder.id);
  });

  it("returns CLOUDINARY_DELETE_FAILED and keeps row when cloud delete fails", async () => {
    const { file } = await seedOwnedFile();
    const requireAuthSessionMock = sessionModule.requireAuthSession as unknown as ReturnType<
      typeof vi.fn
    >;
    requireAuthSessionMock.mockResolvedValue({
      user: { id: OWNER_ID },
      session: { id: "session-1" },
    });
    (
      cloudinaryModule.destroyCloudinaryAsset as unknown as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce(new Error("cloud failed"));

    const response = await fileHandlers.handleDeleteFile(
      new Request(`http://localhost/api/drive/files/${file.id}`, { method: "DELETE" }),
      file.id,
    );

    expect(response.status).toBe(502);
    const stillThere = await db.prisma.file.findUnique({ where: { id: file.id } });
    expect(stillThere).not.toBeNull();
  });

  it("deletes file row after successful cloud delete", async () => {
    const { file } = await seedOwnedFile();
    const requireAuthSessionMock = sessionModule.requireAuthSession as unknown as ReturnType<
      typeof vi.fn
    >;
    requireAuthSessionMock.mockResolvedValue({
      user: { id: OWNER_ID },
      session: { id: "session-1" },
    });

    const response = await fileHandlers.handleDeleteFile(
      new Request(`http://localhost/api/drive/files/${file.id}`, { method: "DELETE" }),
      file.id,
    );

    expect(response.status).toBe(200);
    const deleted = await db.prisma.file.findUnique({ where: { id: file.id } });
    expect(deleted).toBeNull();
  });
});
