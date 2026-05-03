import { USER_STORAGE_LIMIT_BYTES } from "#/lib/drive-constants";
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
  uploadBufferToCloudinary: vi.fn(),
  toCloudinaryResourceType: vi.fn((resourceType: string) => resourceType),
}));

type UploadHandlers = typeof import("#/routes/api/drive/uploads");
type DbModule = typeof import("#/lib/db");
type SessionModule = typeof import("#/lib/api/session");
type CloudinaryModule = typeof import("#/lib/cloudinary");

let db: DbModule;
let uploadHandlers: UploadHandlers;
let sessionModule: SessionModule;
let cloudinaryModule: CloudinaryModule;

const USER_ID = "uploads-owner";

describe("uploads API handler (db integration)", () => {
  beforeAll(async () => {
    db = await import("#/lib/db");
    uploadHandlers = await import("#/routes/api/drive/uploads");
    sessionModule = await import("#/lib/api/session");
    cloudinaryModule = await import("#/lib/cloudinary");
  });

  beforeEach(async () => {
    await resetDb(db.prisma);
    (sessionModule.requireAuthSession as unknown as ReturnType<typeof vi.fn>).mockReset();
    (cloudinaryModule.uploadBufferToCloudinary as unknown as ReturnType<typeof vi.fn>).mockReset();
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

  it("uploads files and persists DB records", async () => {
    const root = await seedUserWithRoot(db.prisma, USER_ID);
    (
      cloudinaryModule.uploadBufferToCloudinary as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      publicId: "pub-1",
      secureUrl: "https://cdn.example/doc",
      bytes: 11,
      resourceType: "image",
    });

    const formData = new FormData();
    formData.append("folderId", root.id);
    formData.append("files", new File(["hello world"], "doc.png", { type: "image/png" }));

    const response = await uploadHandlers.handleUploadFiles(
      new Request("http://localhost/api/drive/uploads", {
        method: "POST",
        body: formData,
      }),
    );
    const json = (await response.json()) as {
      files: Array<{ name: string; folderId: string; downloadUrl: string }>;
    };

    expect(response.status).toBe(201);
    expect(json.files).toHaveLength(1);
    expect(json.files[0]).toMatchObject({
      name: "doc.png",
      folderId: root.id,
      downloadUrl: "dl:https://cdn.example/doc:doc.png",
    });

    const persisted = await db.prisma.file.findMany({
      where: { userId: USER_ID, folderId: root.id },
    });
    expect(persisted).toHaveLength(1);
    expect(persisted[0].cloudinaryPublicId).toBe("pub-1");
  });

  it("returns STORAGE_LIMIT_EXCEEDED when incoming bytes exceed available storage", async () => {
    const root = await seedUserWithRoot(db.prisma, USER_ID);
    await db.prisma.file.create({
      data: {
        userId: USER_ID,
        folderId: root.id,
        name: "existing.txt",
        mimeType: "text/plain",
        bytes: USER_STORAGE_LIMIT_BYTES,
        cloudinaryPublicId: "existing",
        resourceType: "raw",
        secureUrl: "https://cdn.example/existing",
      },
    });

    const formData = new FormData();
    formData.append("folderId", root.id);
    formData.append("files", new File(["small"], "new.txt", { type: "text/plain" }));

    const response = await uploadHandlers.handleUploadFiles(
      new Request("http://localhost/api/drive/uploads", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "STORAGE_LIMIT_EXCEEDED" },
    });
    expect(cloudinaryModule.uploadBufferToCloudinary).not.toHaveBeenCalled();
  });

  it("cleans up uploaded assets when later file validation fails", async () => {
    const root = await seedUserWithRoot(db.prisma, USER_ID);
    (
      cloudinaryModule.uploadBufferToCloudinary as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      publicId: "pub-1",
      secureUrl: "https://cdn.example/ok",
      bytes: 3,
      resourceType: "image",
    });

    const formData = new FormData();
    formData.append("folderId", root.id);
    formData.append("files", new File(["ok"], "ok.png", { type: "image/png" }));
    formData.append("files", new File(["bad"], "bad.exe", { type: "application/x-msdownload" }));

    const response = await uploadHandlers.handleUploadFiles(
      new Request("http://localhost/api/drive/uploads", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_UPLOAD_FILE" },
    });
    expect(cloudinaryModule.destroyCloudinaryAsset).toHaveBeenCalledOnce();

    const persisted = await db.prisma.file.findMany({ where: { userId: USER_ID } });
    expect(persisted).toHaveLength(0);
  });
});
