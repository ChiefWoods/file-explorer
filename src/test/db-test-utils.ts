export function assertDatabaseUrlConfigured() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Run via `bun test` so .env.test is auto-loaded.");
  }
}

export async function resetDb(prisma: any) {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "share_link",
      "file",
      "folder",
      "session",
      "account",
      "verification",
      "user"
    RESTART IDENTITY CASCADE;
  `);
}

export async function seedUser(prisma: any, userId: string) {
  await prisma.user.create({
    data: {
      id: userId,
      name: `${userId}-name`,
      email: `${userId}@example.com`,
      emailVerified: true,
    },
  });
}

export async function seedUserWithRoot(prisma: any, userId: string, rootName = "Root") {
  await seedUser(prisma, userId);
  return prisma.folder.create({
    data: {
      userId,
      name: rootName,
      parentId: null,
    },
  });
}
