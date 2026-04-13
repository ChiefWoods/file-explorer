import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { errorResponse, HttpError, parseJsonBody } from "#/lib/api/http";
import { requireAuthSession } from "#/lib/api/session";
import { assertNoFolderCycle, requireOwnedFolder } from "#/lib/drive-repository";
import { prisma } from "#/lib/db";
import { isPrismaErrorCode } from "#/lib/prisma-errors";
import { folderNameSchema } from "#/lib/upload-policy";

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

    await requireOwnedFolder(session.user.id, folderId);
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
    await requireOwnedFolder(session.user.id, folderId);

    const [childFolderCount, fileCount] = await Promise.all([
      prisma.folder.count({
        where: {
          userId: session.user.id,
          parentId: folderId,
        },
      }),
      prisma.file.count({
        where: {
          userId: session.user.id,
          folderId,
        },
      }),
    ]);

    if (childFolderCount > 0 || fileCount > 0) {
      return Response.json(
        {
          error: {
            code: "FOLDER_NOT_EMPTY",
            message: "Folder is not empty.",
            details: {
              childFolderCount,
              fileCount,
            },
          },
        },
        { status: 409 },
      );
    }

    await prisma.folder.delete({
      where: { id: folderId },
    });

    return Response.json({
      deletedFolderId: folderId,
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
