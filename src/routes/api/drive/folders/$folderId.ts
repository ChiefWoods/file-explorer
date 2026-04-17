import { errorResponse, HttpError, parseJsonBody } from "#/lib/api/http";
import { requireAuthSession } from "#/lib/api/session";
import { destroyCloudinaryAsset, toCloudinaryResourceType } from "#/lib/cloudinary";
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
      PATCH: ({ request, params }: HandlerArgs) => handleUpdateFolder(request, params?.folderId),
      DELETE: ({ request, params }: HandlerArgs) => handleDeleteFolder(request, params?.folderId),
    },
  },
});

async function handleUpdateFolder(
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

async function handleDeleteFolder(
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

function parseFolderId(folderId: string | undefined): string {
  if (!folderId) {
    throw new HttpError(400, "INVALID_FOLDER_ID", "Missing folderId.");
  }
  return folderId;
}

async function collectDescendantFolderIds(userId: string, folderId: string): Promise<string[]> {
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
