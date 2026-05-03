import { assertDatabaseUrlConfigured, resetDb, seedUser } from "#/test/db-test-utils";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

assertDatabaseUrlConfigured();

type DbModule = typeof import("#/lib/db");
type RepositoryModule = typeof import("#/lib/drive-repository");

let db: DbModule;
let repository: RepositoryModule;

const USER_ID = "repo-user-1";
const OTHER_USER_ID = "repo-user-2";

describe("drive-repository (db integration)", () => {
  beforeAll(async () => {
    db = await import("#/lib/db");
    repository = await import("#/lib/drive-repository");
  });

  beforeEach(async () => {
    await resetDb(db.prisma);
  });

  afterAll(async () => {
    await db.prisma.$disconnect();
  });

  it("ensures one root folder per user", async () => {
    await seedUser(db.prisma, USER_ID);

    const first = await repository.ensureUserRootFolder(USER_ID);
    const second = await repository.ensureUserRootFolder(USER_ID);

    expect(first.id).toBe(second.id);
    const roots = await db.prisma.folder.findMany({
      where: {
        userId: USER_ID,
        parentId: null,
        name: "Root",
      },
    });
    expect(roots).toHaveLength(1);
  });

  it("rejects non-owned folder access", async () => {
    await seedUser(db.prisma, USER_ID);
    await seedUser(db.prisma, OTHER_USER_ID);

    const ownerRoot = await repository.ensureUserRootFolder(USER_ID);

    await expect(repository.requireOwnedFolder(OTHER_USER_ID, ownerRoot.id)).rejects.toMatchObject({
      status: 404,
      code: "FOLDER_NOT_FOUND",
    });
  });

  it("prevents mutating root folder", async () => {
    await seedUser(db.prisma, USER_ID);
    const root = await repository.ensureUserRootFolder(USER_ID);

    await expect(repository.requireMutableOwnedFolder(USER_ID, root.id)).rejects.toMatchObject({
      status: 403,
      code: "ROOT_FOLDER_IMMUTABLE",
    });
  });

  it("builds nested sidebar nodes and paths", async () => {
    await seedUser(db.prisma, USER_ID);
    const root = await repository.ensureUserRootFolder(USER_ID);
    const folderA = await db.prisma.folder.create({
      data: { userId: USER_ID, parentId: root.id, name: "A" },
    });
    await db.prisma.folder.create({
      data: { userId: USER_ID, parentId: folderA.id, name: "B" },
    });
    await db.prisma.folder.create({
      data: { userId: USER_ID, parentId: root.id, name: "C" },
    });

    const tree = await repository.getDriveSidebarFolders(USER_ID);
    expect(tree).toEqual([
      {
        id: folderA.id,
        name: "A",
        path: folderA.id,
        children: [
          {
            id: expect.any(String),
            name: "B",
            path: expect.stringContaining(`${folderA.id}/`),
            children: [],
          },
        ],
      },
      {
        id: expect.any(String),
        name: "C",
        path: expect.any(String),
        children: [],
      },
    ]);
  });

  it("rejects parent updates that introduce a cycle", async () => {
    await seedUser(db.prisma, USER_ID);
    const root = await repository.ensureUserRootFolder(USER_ID);
    const parent = await db.prisma.folder.create({
      data: { userId: USER_ID, parentId: root.id, name: "Parent" },
    });
    const child = await db.prisma.folder.create({
      data: { userId: USER_ID, parentId: parent.id, name: "Child" },
    });

    await expect(
      repository.assertNoFolderCycle(USER_ID, parent.id, child.id),
    ).rejects.toMatchObject({
      status: 400,
      code: "INVALID_PARENT",
    });
  });
});
