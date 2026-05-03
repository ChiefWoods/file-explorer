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

type ListingHandlers = typeof import("#/routes/api/drive/listing");
type DbModule = typeof import("#/lib/db");
type SessionModule = typeof import("#/lib/api/session");

let db: DbModule;
let listingHandlers: ListingHandlers;
let sessionModule: SessionModule;

const OWNER_ID = "listing-owner";
const VIEWER_ID = "listing-viewer";

describe("drive listing API handler (db integration)", () => {
  beforeAll(async () => {
    db = await import("#/lib/db");
    listingHandlers = await import("#/routes/api/drive/listing");
    sessionModule = await import("#/lib/api/session");
  });

  beforeEach(async () => {
    await resetDb(db.prisma);
    (sessionModule.getOptionalAuthSession as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  afterAll(async () => {
    await db.prisma.$disconnect();
  });

  it("returns INVALID_FOLDER_ID when folderId query is missing", async () => {
    const getOptionalAuthSessionMock =
      sessionModule.getOptionalAuthSession as unknown as ReturnType<typeof vi.fn>;
    getOptionalAuthSessionMock.mockResolvedValue(null);

    const response = await listingHandlers.handleGetDriveListing(
      new Request("http://localhost/api/drive/listing"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_FOLDER_ID" },
    });
  });

  it("resolves root folder for authenticated users", async () => {
    await seedUser(db.prisma, OWNER_ID);
    const getOptionalAuthSessionMock =
      sessionModule.getOptionalAuthSession as unknown as ReturnType<typeof vi.fn>;
    getOptionalAuthSessionMock.mockResolvedValue({
      user: { id: OWNER_ID },
      session: { id: "session-1" },
    });

    const response = await listingHandlers.handleGetDriveListing(
      new Request("http://localhost/api/drive/listing?folderId=root"),
    );
    const json = (await response.json()) as { folderId: string; isOwner: boolean };

    expect(response.status).toBe(200);
    expect(json.isOwner).toBe(true);
    const root = await db.prisma.folder.findUnique({ where: { id: json.folderId } });
    expect(root?.userId).toBe(OWNER_ID);
  });

  it("returns AUTH_REQUIRED for unauthenticated private folder access", async () => {
    const ownerRoot = await seedUserWithRoot(db.prisma, OWNER_ID);
    const getOptionalAuthSessionMock =
      sessionModule.getOptionalAuthSession as unknown as ReturnType<typeof vi.fn>;
    getOptionalAuthSessionMock.mockResolvedValue(null);

    const response = await listingHandlers.handleGetDriveListing(
      new Request(`http://localhost/api/drive/listing?folderId=${ownerRoot.id}`),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTH_REQUIRED" },
    });
  });

  it("returns FORBIDDEN for authenticated non-owners without share access", async () => {
    const ownerRoot = await seedUserWithRoot(db.prisma, OWNER_ID);
    await seedUser(db.prisma, VIEWER_ID);

    const getOptionalAuthSessionMock =
      sessionModule.getOptionalAuthSession as unknown as ReturnType<typeof vi.fn>;
    getOptionalAuthSessionMock.mockResolvedValue({
      user: { id: VIEWER_ID },
      session: { id: "session-2" },
    });

    const response = await listingHandlers.handleGetDriveListing(
      new Request(`http://localhost/api/drive/listing?folderId=${ownerRoot.id}`),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FORBIDDEN" },
    });
  });

  it("allows non-owners when an active share exists in folder ancestry", async () => {
    const ownerRoot = await seedUserWithRoot(db.prisma, OWNER_ID);
    await seedUser(db.prisma, VIEWER_ID);
    const childFolder = await db.prisma.folder.create({
      data: {
        userId: OWNER_ID,
        parentId: ownerRoot.id,
        name: "Shared Child",
      },
    });
    await db.prisma.shareLink.create({
      data: {
        token: `folder:${ownerRoot.id}`,
        folderId: ownerRoot.id,
        createdByUserId: OWNER_ID,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    const getOptionalAuthSessionMock =
      sessionModule.getOptionalAuthSession as unknown as ReturnType<typeof vi.fn>;
    getOptionalAuthSessionMock.mockResolvedValue({
      user: { id: VIEWER_ID },
      session: { id: "session-2" },
    });

    const response = await listingHandlers.handleGetDriveListing(
      new Request(`http://localhost/api/drive/listing?folderId=${childFolder.id}`, {
        headers: { cookie: "drive_view_mode=grid" },
      }),
    );
    const json = (await response.json()) as {
      folderId: string;
      isOwner: boolean;
      viewMode: string;
    };

    expect(response.status).toBe(200);
    expect(json.folderId).toBe(childFolder.id);
    expect(json.isOwner).toBe(false);
    expect(json.viewMode).toBe("grid");
  });
});
