import { errorResponse, HttpError, parseJsonBody } from "#/lib/api/http";
import { getOptionalAuthSession, requireAuthSession } from "#/lib/api/session";
import {
  buildCloudinaryDownloadUrl,
  destroyCloudinaryAsset,
  toCloudinaryResourceType,
} from "#/lib/cloudinary";
import { prisma } from "#/lib/db";
import { getFolderIdPath, requireOwnedFile, requireOwnedFolder } from "#/lib/drive-repository";
import { fileNameSchema } from "#/lib/upload-policy";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const updateFileBodySchema = z
  .object({
    name: z.string().optional(),
    folderId: z.string().trim().min(1).optional(),
  })
  .refine(
    (value) => {
      return typeof value.name !== "undefined" || typeof value.folderId !== "undefined";
    },
    {
      message: "Provide at least one field to update.",
    },
  );

type HandlerArgs = { request: Request; params?: { fileId?: string } };

export const Route = createFileRoute("/api/drive/files/$fileId")({
  server: {
    handlers: {
      GET: ({ request, params }: HandlerArgs) => handleGetFile(request, params?.fileId),
      PATCH: ({ request, params }: HandlerArgs) => handleUpdateFile(request, params?.fileId),
      DELETE: ({ request, params }: HandlerArgs) => handleDeleteFile(request, params?.fileId),
    },
  },
});

async function handleGetFile(request: Request, fileIdRaw: string | undefined): Promise<Response> {
  try {
    const fileId = parseFileId(fileIdRaw);
    const session = await getOptionalAuthSession(request);
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        userId: true,
        folderId: true,
        name: true,
        mimeType: true,
        bytes: true,
        cloudinaryPublicId: true,
        resourceType: true,
        secureUrl: true,
        createdAt: true,
      },
    });

    if (!file) {
      throw new HttpError(404, "FILE_NOT_FOUND", "File not found.");
    }

    const isOwner = session?.user?.id === file.userId;
    if (!isOwner) {
      const folderPathIds = await getFolderIdPath(file.userId, file.folderId);
      const hasActiveShare = await prisma.shareLink.findFirst({
        where: {
          folderId: { in: folderPathIds },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { id: true },
      });

      if (!hasActiveShare) {
        if (!session?.user?.id) {
          throw new HttpError(401, "AUTH_REQUIRED", "Unauthorized.");
        }
        throw new HttpError(403, "FORBIDDEN", "Forbidden.");
      }
    }

    // For shared/unauthenticated viewers, only expose what the UI needs for downloading.
    if (!isOwner) {
      return Response.json({
        id: file.id,
        folderId: file.folderId,
        name: file.name,
        mimeType: file.mimeType,
        bytes: file.bytes,
        createdAt: file.createdAt,
        downloadUrl: buildCloudinaryDownloadUrl(file.secureUrl, file.name),
      });
    }

    return Response.json({
      ...file,
      downloadUrl: buildCloudinaryDownloadUrl(file.secureUrl, file.name),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function handleUpdateFile(
  request: Request,
  fileIdRaw: string | undefined,
): Promise<Response> {
  try {
    const session = await requireAuthSession(request);
    const fileId = parseFileId(fileIdRaw);
    await requireOwnedFile(session.user.id, fileId);

    const body = await parseJsonBody(request, updateFileBodySchema);
    const updateData: { name?: string; folderId?: string } = {};

    if (typeof body.name !== "undefined") {
      updateData.name = fileNameSchema.parse(body.name);
    }

    if (typeof body.folderId !== "undefined") {
      await requireOwnedFolder(session.user.id, body.folderId);
      updateData.folderId = body.folderId;
    }

    const updated = await prisma.file.update({
      where: { id: fileId },
      data: updateData,
      select: {
        id: true,
        folderId: true,
        name: true,
        mimeType: true,
        bytes: true,
        cloudinaryPublicId: true,
        resourceType: true,
        secureUrl: true,
        createdAt: true,
      },
    });

    return Response.json({
      ...updated,
      downloadUrl: buildCloudinaryDownloadUrl(updated.secureUrl, updated.name),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function handleDeleteFile(
  request: Request,
  fileIdRaw: string | undefined,
): Promise<Response> {
  try {
    const session = await requireAuthSession(request);
    const fileId = parseFileId(fileIdRaw);
    const file = await requireOwnedFile(session.user.id, fileId);

    try {
      await destroyCloudinaryAsset(
        file.cloudinaryPublicId,
        toCloudinaryResourceType(file.resourceType),
      );
    } catch {
      throw new HttpError(
        502,
        "CLOUDINARY_DELETE_FAILED",
        "Unable to delete file from cloud storage.",
      );
    }

    await prisma.file.delete({
      where: { id: file.id },
    });

    return Response.json({
      deletedFileId: file.id,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function parseFileId(fileId: string | undefined): string {
  if (!fileId) {
    throw new HttpError(400, "INVALID_FILE_ID", "Missing fileId.");
  }
  return fileId;
}
