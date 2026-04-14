import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { errorResponse, HttpError, parseJsonBody } from "#/lib/api/http";
import { requireAuthSession } from "#/lib/api/session";
import { buildCloudinaryDownloadUrl } from "#/lib/cloudinary";
import { USER_STORAGE_LIMIT_BYTES } from "#/lib/drive-constants";
import { getFolderBreadcrumbs, requireOwnedFolder } from "#/lib/drive-repository";
import { prisma } from "#/lib/db";
import { isPrismaErrorCode } from "#/lib/prisma-errors";
import { folderNameSchema } from "#/lib/upload-policy";

const listFoldersSearchSchema = z.object({
  folderId: z.string().trim().min(1).optional(),
  fileType: z.string().trim().min(1).optional(),
  modifiedAfter: z.string().trim().optional(),
  modifiedBefore: z.string().trim().optional(),
  sortBy: z.enum(["name", "modified", "size"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const createFolderBodySchema = z.object({
  name: z.string(),
  parentId: z.string().trim().min(1).nullable().optional(),
});

type HandlerArgs = { request: Request };

export const Route = createFileRoute("/api/drive/folders")({
  server: {
    handlers: {
      GET: ({ request }: HandlerArgs) => handleListFolders(request),
      POST: ({ request }: HandlerArgs) => handleCreateFolder(request),
    },
  },
});

async function handleListFolders(request: Request): Promise<Response> {
  try {
    const session = await requireAuthSession(request);
    const search = parseListSearch(new URL(request.url));

    const folderId = search.folderId ?? null;
    const sortBy = search.sortBy ?? "modified";
    const sortOrder = search.sortOrder ?? "desc";

    const modifiedAfter = parseOptionalDate(search.modifiedAfter, "modifiedAfter");
    const modifiedBefore = parseOptionalDate(search.modifiedBefore, "modifiedBefore");

    const currentFolder = folderId ? await requireOwnedFolder(session.user.id, folderId) : null;
    const breadcrumbs = await getFolderBreadcrumbs(session.user.id, folderId);

    const foldersPromise = prisma.folder.findMany({
      where: {
        userId: session.user.id,
        parentId: folderId,
      },
      orderBy: sortBy === "name" ? { name: sortOrder } : { updatedAt: sortOrder },
      select: {
        id: true,
        name: true,
        parentId: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    const fileMimeFilter = resolveMimeFilter(search.fileType);

    const filesPromise = folderId
      ? prisma.file.findMany({
          where: {
            userId: session.user.id,
            folderId,
            ...(fileMimeFilter ? { mimeType: fileMimeFilter } : {}),
            ...(modifiedAfter || modifiedBefore
              ? {
                  createdAt: {
                    ...(modifiedAfter ? { gte: modifiedAfter } : {}),
                    ...(modifiedBefore ? { lte: modifiedBefore } : {}),
                  },
                }
              : {}),
          },
          orderBy:
            sortBy === "name"
              ? { name: sortOrder }
              : sortBy === "size"
                ? { bytes: sortOrder }
                : { createdAt: sortOrder },
          select: {
            id: true,
            name: true,
            bytes: true,
            mimeType: true,
            secureUrl: true,
            createdAt: true,
            folderId: true,
          },
        })
      : Promise.resolve([]);

    const storagePromise = prisma.file.aggregate({
      where: { userId: session.user.id },
      _sum: { bytes: true },
    });

    const [folders, files, storage] = await Promise.all([
      foldersPromise,
      filesPromise,
      storagePromise,
    ]);

    return Response.json({
      currentFolder,
      breadcrumbs,
      folders: folders.map((folder) => ({
        ...folder,
        type: "folder" as const,
        modifiedAt: folder.updatedAt.toISOString(),
      })),
      files: files.map((file) => ({
        ...file,
        type: "file" as const,
        modifiedAt: file.createdAt.toISOString(),
        downloadUrl: buildCloudinaryDownloadUrl(file.secureUrl, file.name),
      })),
      storage: {
        usedBytes: storage._sum.bytes ?? 0,
        totalBytes: USER_STORAGE_LIMIT_BYTES,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function handleCreateFolder(request: Request): Promise<Response> {
  try {
    const session = await requireAuthSession(request);
    const body = await parseJsonBody(request, createFolderBodySchema);

    const parentId = body.parentId ?? null;
    if (parentId) {
      await requireOwnedFolder(session.user.id, parentId);
    }

    const name = folderNameSchema.parse(body.name);

    try {
      const created = await prisma.folder.create({
        data: {
          name,
          userId: session.user.id,
          parentId,
        },
        select: {
          id: true,
          name: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return Response.json(created, { status: 201 });
    } catch (error) {
      if (isPrismaErrorCode(error, "P2002")) {
        return Response.json(
          {
            error: {
              code: "FOLDER_ALREADY_EXISTS",
              message: "A folder with the same name already exists in this location.",
            },
          },
          { status: 409 },
        );
      }
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}

function parseListSearch(url: URL) {
  return listFoldersSearchSchema.parse({
    folderId: url.searchParams.get("folderId") ?? undefined,
    fileType: url.searchParams.get("fileType") ?? undefined,
    modifiedAfter: url.searchParams.get("modifiedAfter") ?? undefined,
    modifiedBefore: url.searchParams.get("modifiedBefore") ?? undefined,
    sortBy: url.searchParams.get("sortBy") ?? undefined,
    sortOrder: url.searchParams.get("sortOrder") ?? undefined,
  });
}

function parseOptionalDate(input: string | undefined, fieldName: string): Date | undefined {
  if (!input) {
    return undefined;
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "INVALID_DATE_FILTER", `${fieldName} must be a valid date.`);
  }
  return parsed;
}

function resolveMimeFilter(
  fileType: string | undefined,
): { equals: string } | { startsWith: string } | undefined {
  if (!fileType) {
    return undefined;
  }

  const normalized = fileType.toLowerCase();
  if (normalized.includes("/")) {
    return { equals: normalized };
  }

  if (normalized === "image") {
    return { startsWith: "image/" };
  }
  if (normalized === "text") {
    return { startsWith: "text/" };
  }
  if (normalized === "pdf") {
    return { equals: "application/pdf" };
  }
  if (normalized === "spreadsheet") {
    return { startsWith: "application/vnd." };
  }

  return { startsWith: `${normalized}/` };
}
