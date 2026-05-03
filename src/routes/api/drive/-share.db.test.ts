import { assertDatabaseUrlConfigured, resetDb, seedUserWithRoot } from "#/test/db-test-utils";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

assertDatabaseUrlConfigured();

vi.mock("#/lib/api/session", () => ({
  requireAuthSession: vi.fn(),
  getOptionalAuthSession: vi.fn(),
}));

type ShareHandlers = typeof import("#/routes/api/drive/share");
type ShareIdHandlers = typeof import("#/routes/api/drive/share/$shareId");
type DbModule = typeof import("#/lib/db");
type SessionModule = typeof import("#/lib/api/session");

let db: DbModule;
let shareHandlers: ShareHandlers;
let shareIdHandlers: ShareIdHandlers;
let sessionModule: SessionModule;

const TEST_USER_ID = "user-test-1";
const OTHER_USER_ID = "user-test-2";

describe("share API handlers (db integration)", () => {
  beforeAll(async () => {
    db = await import("#/lib/db");
    shareHandlers = await import("#/routes/api/drive/share");
    shareIdHandlers = await import("#/routes/api/drive/share/$shareId");
    sessionModule = await import("#/lib/api/session");
  });

  beforeEach(async () => {
    await resetDb(db.prisma);
    (sessionModule.requireAuthSession as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  afterAll(async () => {
    await db.prisma.$disconnect();
  });

  it("creates and upserts a share link for a folder", async () => {
    const root = await seedUserWithRoot(db.prisma, TEST_USER_ID);
    const requireAuthSessionMock = sessionModule.requireAuthSession as unknown as ReturnType<
      typeof vi.fn
    >;
    requireAuthSessionMock.mockResolvedValue({
      user: { id: TEST_USER_ID },
      session: { id: "session-1" },
    });

    const createRequest = new Request("http://localhost/api/drive/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folderId: root.id,
        duration: "7d",
      }),
    });

    const firstResponse = await shareHandlers.handleCreateShareLink(createRequest);
    expect(firstResponse.status).toBe(201);

    const firstShare = await db.prisma.shareLink.findMany({
      where: { folderId: root.id, createdByUserId: TEST_USER_ID },
    });
    expect(firstShare).toHaveLength(1);
    expect(firstShare[0].token).toBe(`folder:${root.id}`);
    expect(firstShare[0].expiresAt).not.toBeNull();

    const updateRequest = new Request("http://localhost/api/drive/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folderId: root.id,
        duration: "never",
      }),
    });

    const secondResponse = await shareHandlers.handleCreateShareLink(updateRequest);
    expect(secondResponse.status).toBe(201);

    const secondShare = await db.prisma.shareLink.findMany({
      where: { folderId: root.id, createdByUserId: TEST_USER_ID },
    });
    expect(secondShare).toHaveLength(1);
    expect(secondShare[0].expiresAt).toBeNull();
  });

  it("lists active shares and filters expired links by default", async () => {
    const root = await seedUserWithRoot(db.prisma, TEST_USER_ID);
    const requireAuthSessionMock = sessionModule.requireAuthSession as unknown as ReturnType<
      typeof vi.fn
    >;
    requireAuthSessionMock.mockResolvedValue({
      user: { id: TEST_USER_ID },
      session: { id: "session-1" },
    });

    await db.prisma.shareLink.createMany({
      data: [
        {
          token: `folder:${root.id}`,
          folderId: root.id,
          createdByUserId: TEST_USER_ID,
          expiresAt: null,
        },
        {
          token: "expired-token",
          folderId: root.id,
          createdByUserId: TEST_USER_ID,
          expiresAt: new Date(Date.now() - 60_000),
        },
      ],
    });

    const activeOnlyResponse = await shareHandlers.handleListShares(
      new Request(`http://localhost/api/drive/share?folderId=${root.id}&includeExpired=false`),
    );
    const activeOnlyJson = (await activeOnlyResponse.json()) as { links: Array<{ id: string }> };
    expect(activeOnlyResponse.status).toBe(200);
    expect(activeOnlyJson.links).toHaveLength(1);

    const includeExpiredResponse = await shareHandlers.handleListShares(
      new Request(`http://localhost/api/drive/share?folderId=${root.id}&includeExpired=true`),
    );
    const includeExpiredJson = (await includeExpiredResponse.json()) as {
      links: Array<{ id: string }>;
    };
    expect(includeExpiredResponse.status).toBe(200);
    expect(includeExpiredJson.links).toHaveLength(2);
  });

  it("deletes only links owned by the current user", async () => {
    const ownerRoot = await seedUserWithRoot(db.prisma, TEST_USER_ID);
    await seedUserWithRoot(db.prisma, OTHER_USER_ID);

    const ownerLink = await db.prisma.shareLink.create({
      data: {
        token: "owner-link",
        folderId: ownerRoot.id,
        createdByUserId: TEST_USER_ID,
        expiresAt: null,
      },
    });

    const otherOwnedLink = await db.prisma.shareLink.create({
      data: {
        token: "other-link",
        folderId: ownerRoot.id,
        createdByUserId: OTHER_USER_ID,
        expiresAt: null,
      },
    });

    const requireAuthSessionMock = sessionModule.requireAuthSession as unknown as ReturnType<
      typeof vi.fn
    >;
    requireAuthSessionMock.mockResolvedValue({
      user: { id: TEST_USER_ID },
      session: { id: "session-1" },
    });

    const deleteOwnerResponse = await shareIdHandlers.handleDeleteShareLink(
      new Request(`http://localhost/api/drive/share/${ownerLink.id}`, { method: "DELETE" }),
      ownerLink.id,
    );
    expect(deleteOwnerResponse.status).toBe(200);
    const deleted = await db.prisma.shareLink.findUnique({ where: { id: ownerLink.id } });
    expect(deleted).toBeNull();

    const deleteOtherResponse = await shareIdHandlers.handleDeleteShareLink(
      new Request(`http://localhost/api/drive/share/${otherOwnedLink.id}`, { method: "DELETE" }),
      otherOwnedLink.id,
    );
    expect(deleteOtherResponse.status).toBe(404);
  });
});
