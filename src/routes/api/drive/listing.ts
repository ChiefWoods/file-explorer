import { createFileRoute } from "@tanstack/react-router";

import { errorResponse, HttpError } from "#/lib/api/http";
import { getOptionalAuthSession } from "#/lib/api/session";
import { ensureUserRootFolder, getFolderBreadcrumbs } from "#/lib/drive-repository";
import { readDriveViewModeFromCookie } from "#/lib/drive-view-mode";
import { prisma } from "#/lib/db";
import type { DriveFolderListingResponse } from "#/lib/drive-listing.types";

type HandlerArgs = { request: Request };

export const Route = createFileRoute("/api/drive/listing")({
  server: {
    handlers: {
      GET: ({ request }: HandlerArgs) => handleGetDriveListing(request),
    },
  },
});

async function handleGetDriveListing(request: Request): Promise<Response> {
  try {
    const session = await getOptionalAuthSession(request);
    const { searchParams } = new URL(request.url);
    const folderIdParam = searchParams.get("folderId")?.trim();
    const folderId = await resolveFolderId(folderIdParam, session?.user.id);

    if (!folderId) {
      throw new HttpError(400, "INVALID_FOLDER_ID", "folderId is required.");
    }

    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      select: { id: true, userId: true },
    });

    if (!folder) {
      throw new HttpError(404, "FOLDER_NOT_FOUND", "Folder not found.");
    }

    const isOwner = session?.user?.id === folder.userId;
    if (!isOwner) {
      const hasActiveShare = await prisma.shareLink.findFirst({
        where: {
          folderId: folder.id,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { id: true },
      });

      if (!hasActiveShare) {
        throw new HttpError(403, "SHARE_UNAVAILABLE", "This shared folder is unavailable.");
      }
    }

    const [breadcrumbs, folders, files, storage] = await Promise.all([
      getFolderBreadcrumbs(folder.userId, folder.id),
      prisma.folder.findMany({
        where: {
          userId: folder.userId,
          parentId: folder.id,
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          updatedAt: true,
        },
      }),
      prisma.file.findMany({
        where: {
          userId: folder.userId,
          folderId: folder.id,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          createdAt: true,
          bytes: true,
          mimeType: true,
        },
      }),
      prisma.file.aggregate({
        where: { userId: folder.userId },
        _sum: { bytes: true },
      }),
    ]);

    const payload: DriveFolderListingResponse = {
      folderId: folder.id,
      isOwner,
      viewMode: readDriveViewModeFromCookie(request.headers.get("cookie")),
      breadcrumbs,
      folders: folders.map((childFolder) => ({
        id: childFolder.id,
        name: childFolder.name,
        modifiedAt: childFolder.updatedAt.toISOString(),
      })),
      files: files.map((file) => ({
        id: file.id,
        name: file.name,
        modifiedAt: file.createdAt.toISOString(),
        bytes: file.bytes,
        mimeType: file.mimeType,
      })),
      storageUsedBytes: storage._sum.bytes ?? 0,
    };

    return Response.json(payload);
  } catch (error) {
    return errorResponse(error);
  }
}

async function resolveFolderId(
  folderIdParam: string | undefined,
  viewerUserId: string | undefined,
): Promise<string | undefined> {
  if (folderIdParam !== "root") {
    return folderIdParam;
  }

  if (!viewerUserId) {
    throw new HttpError(401, "AUTH_REQUIRED", "Authentication required.");
  }

  return (await ensureUserRootFolder(viewerUserId)).id;
}
