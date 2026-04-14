import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

import { HttpError } from "#/lib/api/http";
import { USER_STORAGE_LIMIT_BYTES, USER_STORAGE_LIMIT_GB } from "#/lib/drive-constants";

type AppPrismaClient = ReturnType<typeof createPrismaClient>;
const globalForPrisma = globalThis as unknown as { prisma?: AppPrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const adapter = new PrismaPg({ connectionString });
  const baseClient = new PrismaClient({ adapter });
  const client = baseClient.$extends({
    query: {
      file: {
        async create({ args, query }) {
          const data = args.data as { userId?: unknown; bytes?: unknown } | undefined;
          const userId = typeof data?.userId === "string" ? data.userId : null;
          const bytes = typeof data?.bytes === "number" ? data.bytes : null;
          if (userId && typeof bytes === "number") {
            const total = await getTotalBytes(baseClient, userId);
            if (total + bytes > USER_STORAGE_LIMIT_BYTES) {
              throwStorageExceeded();
            }
          }
          return query(args);
        },

        async createMany({ args, query }) {
          const data = args.data as
            | Array<{ userId?: unknown; bytes?: unknown }>
            | { userId?: unknown; bytes?: unknown }
            | undefined;
          const rows = Array.isArray(data) ? data : data ? [data] : [];

          const additionsByUser = new Map<string, number>();
          for (const row of rows) {
            const userId = typeof row.userId === "string" ? row.userId : null;
            const bytes = typeof row.bytes === "number" ? row.bytes : null;
            if (!userId || typeof bytes !== "number") continue;
            additionsByUser.set(userId, (additionsByUser.get(userId) ?? 0) + bytes);
          }

          for (const [userId, addedBytes] of additionsByUser) {
            const total = await getTotalBytes(baseClient, userId);
            if (total + addedBytes > USER_STORAGE_LIMIT_BYTES) {
              throwStorageExceeded();
            }
          }
          return query(args);
        },

        async update({ args, query }) {
          const existing = await baseClient.file.findUnique({
            where: args.where,
            select: { id: true, userId: true, bytes: true },
          });

          if (!existing) {
            return query(args);
          }

          const data = args.data as { userId?: unknown; bytes?: unknown } | undefined;
          const targetUserId = typeof data?.userId === "string" ? data.userId : existing.userId;
          const nextBytes = typeof data?.bytes === "number" ? data.bytes : existing.bytes;

          const total =
            targetUserId === existing.userId
              ? await getTotalBytes(baseClient, targetUserId, existing.id)
              : await getTotalBytes(baseClient, targetUserId);

          if (total + nextBytes > USER_STORAGE_LIMIT_BYTES) {
            throwStorageExceeded();
          }
          return query(args);
        },

        async upsert({ args, query }) {
          const existing = await baseClient.file.findUnique({
            where: args.where,
            select: { id: true, userId: true, bytes: true },
          });

          if (existing) {
            const data = args.update as { userId?: unknown; bytes?: unknown } | undefined;
            const targetUserId = typeof data?.userId === "string" ? data.userId : existing.userId;
            const nextBytes = typeof data?.bytes === "number" ? data.bytes : existing.bytes;
            const total =
              targetUserId === existing.userId
                ? await getTotalBytes(baseClient, targetUserId, existing.id)
                : await getTotalBytes(baseClient, targetUserId);

            if (total + nextBytes > USER_STORAGE_LIMIT_BYTES) {
              throwStorageExceeded();
            }
            return query(args);
          }

          const createData = args.create as { userId?: unknown; bytes?: unknown } | undefined;
          const userId = typeof createData?.userId === "string" ? createData.userId : null;
          const bytes = typeof createData?.bytes === "number" ? createData.bytes : null;
          if (userId && typeof bytes === "number") {
            const total = await getTotalBytes(baseClient, userId);
            if (total + bytes > USER_STORAGE_LIMIT_BYTES) {
              throwStorageExceeded();
            }
          }

          return query(args);
        },
      },
    },
  });

  return client;
}

function throwStorageExceeded() {
  throw new HttpError(
    413,
    "STORAGE_LIMIT_EXCEEDED",
    `Storage limit exceeded (${USER_STORAGE_LIMIT_GB}GB).`,
  );
}

async function getTotalBytes(client: PrismaClient, userId: string, excludeFileId?: string) {
  const aggregate = await client.file.aggregate({
    where: {
      userId,
      ...(excludeFileId ? { id: { not: excludeFileId } } : {}),
    },
    _sum: { bytes: true },
  });
  return aggregate._sum.bytes ?? 0;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
