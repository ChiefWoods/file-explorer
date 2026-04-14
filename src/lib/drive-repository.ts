import { prisma } from "#/lib/db";
import { HttpError } from "#/lib/api/http";

type FolderSummary = {
  id: string;
  name: string;
  parentId: string | null;
};

export async function requireOwnedFolder(userId: string, folderId: string): Promise<FolderSummary> {
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId },
    select: {
      id: true,
      name: true,
      parentId: true,
    },
  });

  if (!folder) {
    throw new HttpError(404, "FOLDER_NOT_FOUND", "Folder not found.");
  }

  return folder;
}

export async function requireOwnedFile(userId: string, fileId: string) {
  const file = await prisma.file.findFirst({
    where: { id: fileId, userId },
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

  return file;
}

export async function getFolderBreadcrumbs(userId: string, folderId: string | null) {
  const breadcrumbs: FolderSummary[] = [];
  let cursor = folderId;

  while (cursor) {
    const folder = await prisma.folder.findFirst({
      where: { id: cursor, userId },
      select: {
        id: true,
        name: true,
        parentId: true,
      },
    });

    if (!folder) {
      throw new HttpError(404, "FOLDER_NOT_FOUND", "Folder not found.");
    }

    breadcrumbs.push(folder);
    cursor = folder.parentId;
  }

  return breadcrumbs.reverse().map((folder) => ({ id: folder.id, name: folder.name }));
}

export async function assertNoFolderCycle(
  userId: string,
  folderId: string,
  nextParentId: string | null,
) {
  if (!nextParentId) {
    return;
  }

  if (nextParentId === folderId) {
    throw new HttpError(400, "INVALID_PARENT", "Folder cannot be moved into itself.");
  }

  let cursor: string | null = nextParentId;
  while (cursor) {
    if (cursor === folderId) {
      throw new HttpError(
        400,
        "INVALID_PARENT",
        "Folder cannot be moved into one of its descendants.",
      );
    }

    const parentFolder: { id: string; parentId: string | null } | null =
      await prisma.folder.findFirst({
        where: { id: cursor, userId },
        select: { id: true, parentId: true },
      });

    if (!parentFolder) {
      throw new HttpError(404, "PARENT_FOLDER_NOT_FOUND", "Target parent folder not found.");
    }

    cursor = parentFolder.parentId;
  }
}
