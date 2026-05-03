import { errorResponse, HttpError, parseJsonBody } from "#/lib/api/http";
import { requireAuthSession } from "#/lib/api/session";
import {
  buildCloudinaryDownloadUrl,
  destroyCloudinaryAsset,
  toCloudinaryResourceType,
} from "#/lib/cloudinary";
import { prisma } from "#/lib/db";
import {
  assertNoFolderCycle,
  requireMutableOwnedFolder,
  requireOwnedFolder,
} from "#/lib/drive-repository";
import { folderNameSchema } from "#/lib/upload-policy";
import { isPrismaErrorCode } from "#/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const updateFolderBodySchema = z
  .object({
    name: z.string().optional(),
    parentId: z.string().trim().min(1).nullable().optional(),
  })
  .refine(
    (value) => {
      return typeof value.name !== "undefined" || typeof value.parentId !== "undefined";
    },
    {
      message: "Provide at least one field to update.",
    },
  );

type HandlerArgs = { request: Request; params?: { folderId?: string } };

export const Route = createFileRoute("/api/drive/folders/$folderId")({
  server: {
    handlers: {
      GET: ({ request, params }: HandlerArgs) => handleGetFolderDownload(request, params?.folderId),
      PATCH: ({ request, params }: HandlerArgs) => handleUpdateFolder(request, params?.folderId),
      DELETE: ({ request, params }: HandlerArgs) => handleDeleteFolder(request, params?.folderId),
    },
  },
});

export async function handleGetFolderDownload(
  request: Request,
  folderIdRaw: string | undefined,
): Promise<Response> {
  try {
    const session = await requireAuthSession(request);
    const folderId = parseFolderId(folderIdRaw);
    await requireOwnedFolder(session.user.id, folderId);

    const folderIds = await collectDescendantFolderIds(session.user.id, folderId);
    const [folders, files] = await Promise.all([
      prisma.folder.findMany({
        where: {
          userId: session.user.id,
          id: { in: folderIds },
        },
        select: {
          id: true,
          name: true,
          parentId: true,
        },
      }),
      prisma.file.findMany({
        where: {
          userId: session.user.id,
          folderId: { in: folderIds },
        },
        orderBy: [{ folderId: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          folderId: true,
          secureUrl: true,
        },
      }),
    ]);

    const foldersById = new Map(folders.map((folder) => [folder.id, folder]));

    return Response.json({
      folderId,
      files: files.map((file) => ({
        id: file.id,
        name: file.name,
        relativePath: buildRelativeFolderPath(folderId, file.folderId, foldersById),
        downloadUrl: buildCloudinaryDownloadUrl(file.secureUrl, file.name),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleUpdateFolder(
  request: Request,
  folderIdRaw: string | undefined,
): Promise<Response> {
  try {
    const session = await requireAuthSession(request);
    const folderId = parseFolderId(folderIdRaw);

    await requireMutableOwnedFolder(session.user.id, folderId);
    const body = await parseJsonBody(request, updateFolderBodySchema);

    const updateData: { name?: string; parentId?: string | null } = {};

    if (typeof body.name !== "undefined") {
      updateData.name = folderNameSchema.parse(body.name);
    }

    if (typeof body.parentId !== "undefined") {
      if (body.parentId) {
        await requireOwnedFolder(session.user.id, body.parentId);
      }
      await assertNoFolderCycle(session.user.id, folderId, body.parentId ?? null);
      updateData.parentId = body.parentId ?? null;
    }

    try {
      const updated = await prisma.folder.update({
        where: { id: folderId },
        data: updateData,
        select: {
          id: true,
          name: true,
          parentId: true,
          updatedAt: true,
        },
      });

      return Response.json(updated);
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

export async function handleDeleteFolder(
  request: Request,
  folderIdRaw: string | undefined,
): Promise<Response> {
  try {
    const session = await requireAuthSession(request);
    const folderId = parseFolderId(folderIdRaw);
    await requireMutableOwnedFolder(session.user.id, folderId);

    const folderIdsToDelete = await collectDescendantFolderIds(session.user.id, folderId);
    const filesToDelete = await prisma.file.findMany({
      where: {
        userId: session.user.id,
        folderId: { in: folderIdsToDelete },
      },
      select: {
        id: true,
        cloudinaryPublicId: true,
        resourceType: true,
      },
    });

    if (filesToDelete.length > 0) {
      const cloudinaryResults = await Promise.allSettled(
        filesToDelete.map((file) =>
          destroyCloudinaryAsset(
            file.cloudinaryPublicId,
            toCloudinaryResourceType(file.resourceType),
          ),
        ),
      );

      const failedDeletes = cloudinaryResults.filter((result) => result.status === "rejected");
      if (failedDeletes.length > 0) {
        throw new HttpError(
          502,
          "CLOUDINARY_DELETE_FAILED",
          `Unable to delete ${failedDeletes.length} file asset${failedDeletes.length > 1 ? "s" : ""} from cloud storage.`,
        );
      }
    }

    await prisma.folder.delete({
      where: { id: folderId },
    });

    return Response.json({
      deletedFolderId: folderId,
      deletedNestedFolderCount: Math.max(folderIdsToDelete.length - 1, 0),
      deletedFileCount: filesToDelete.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export function parseFolderId(folderId: string | undefined): string {
  if (!folderId) {
    throw new HttpError(400, "INVALID_FOLDER_ID", "Missing folderId.");
  }
  return folderId;
}

export async function collectDescendantFolderIds(
  userId: string,
  folderId: string,
): Promise<string[]> {
  const allFolderIds = [folderId];
  let currentLevelIds = [folderId];

  while (currentLevelIds.length > 0) {
    const children = await prisma.folder.findMany({
      where: {
        userId,
        parentId: { in: currentLevelIds },
      },
      select: { id: true },
    });

    currentLevelIds = children.map((folder) => folder.id);
    allFolderIds.push(...currentLevelIds);
  }

  return allFolderIds;
}

export function buildRelativeFolderPath(
  rootFolderId: string,
  fileFolderId: string,
  foldersById: Map<string, { id: string; name: string; parentId: string | null }>,
): string {
  if (fileFolderId === rootFolderId) {
    return "";
  }

  const segments: string[] = [];
  let cursor = foldersById.get(fileFolderId);

  while (cursor && cursor.id !== rootFolderId) {
    segments.unshift(cursor.name);
    if (!cursor.parentId) {
      break;
    }
    cursor = foldersById.get(cursor.parentId);
  }

  return segments.join("/");
}
