import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";

import { createFileRoute } from "@tanstack/react-router";

import { errorResponse, HttpError } from "#/lib/api/http";
import { requireAuthSession } from "#/lib/api/session";
import {
  buildCloudinaryDownloadUrl,
  destroyCloudinaryAsset,
  uploadBufferToCloudinary,
} from "#/lib/cloudinary";
import { USER_STORAGE_LIMIT_BYTES, USER_STORAGE_LIMIT_GB } from "#/lib/drive-constants";
import { ensureUserRootFolder, requireOwnedFolder } from "#/lib/drive-repository";
import { prisma } from "#/lib/db";
import { assertValidUploadFile, inferCloudinaryResourceType } from "#/lib/upload-policy";

type HandlerArgs = { request: Request };

type UploadedAsset = {
  folderId: string;
  name: string;
  mimeType: string;
  bytes: number;
  cloudinaryPublicId: string;
  resourceType: "image" | "raw" | "video";
  secureUrl: string;
};

const MAX_FILES_PER_UPLOAD = 20;

export const Route = createFileRoute("/api/drive/uploads")({
  server: {
    handlers: {
      POST: ({ request }: HandlerArgs) => handleUploadFiles(request),
    },
  },
});

async function handleUploadFiles(request: Request): Promise<Response> {
  const uploadedAssets: UploadedAsset[] = [];

  try {
    const session = await requireAuthSession(request);
    const formData = await request.formData();

    const folderId = await resolveUploadFolderId(
      session.user.id,
      parseFolderId(formData.get("folderId")),
    );

    const files = formData.getAll("files").filter(isFile);
    if (files.length === 0) {
      throw new HttpError(400, "NO_FILES", "No files were provided.");
    }
    if (files.length > MAX_FILES_PER_UPLOAD) {
      throw new HttpError(
        400,
        "TOO_MANY_FILES",
        `You can upload up to ${MAX_FILES_PER_UPLOAD} files at a time.`,
      );
    }

    const incomingBytes = files.reduce((total, file) => total + file.size, 0);
    const storage = await prisma.file.aggregate({
      where: { userId: session.user.id },
      _sum: { bytes: true },
    });
    const usedBytes = storage._sum.bytes ?? 0;
    if (usedBytes + incomingBytes > USER_STORAGE_LIMIT_BYTES) {
      throw new HttpError(
        413,
        "STORAGE_LIMIT_EXCEEDED",
        `Storage limit exceeded (${USER_STORAGE_LIMIT_GB}GB).`,
      );
    }

    for (const file of files) {
      let normalizedName: string;
      try {
        normalizedName = assertValidUploadFile(file);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid upload file.";
        throw new HttpError(400, "INVALID_UPLOAD_FILE", message);
      }

      const mimeType = file.type.toLowerCase();
      const resourceType = inferCloudinaryResourceType(mimeType);
      const publicId = `${session.user.id}/${folderId}/${Date.now()}-${randomUUID()}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const uploaded = await uploadBufferToCloudinary({
        buffer,
        publicId,
        resourceType,
        fileName: normalizedName,
      });

      uploadedAssets.push({
        folderId,
        name: normalizedName,
        mimeType,
        bytes: uploaded.bytes > 0 ? uploaded.bytes : file.size,
        cloudinaryPublicId: uploaded.publicId,
        resourceType: uploaded.resourceType,
        secureUrl: uploaded.secureUrl,
      });
    }

    const createdFiles = await prisma.$transaction(
      uploadedAssets.map((asset) =>
        prisma.file.create({
          data: {
            userId: session.user.id,
            folderId: asset.folderId,
            name: asset.name,
            mimeType: asset.mimeType,
            bytes: asset.bytes,
            cloudinaryPublicId: asset.cloudinaryPublicId,
            resourceType: asset.resourceType,
            secureUrl: asset.secureUrl,
          },
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
        }),
      ),
    );

    return Response.json(
      {
        files: createdFiles.map((file) => ({
          ...file,
          downloadUrl: buildCloudinaryDownloadUrl(file.secureUrl, file.name),
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    if (uploadedAssets.length > 0) {
      await Promise.allSettled(
        uploadedAssets.map((asset) =>
          destroyCloudinaryAsset(asset.cloudinaryPublicId, asset.resourceType),
        ),
      );
    }
    return errorResponse(error);
  }
}

function parseFolderId(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, "INVALID_FOLDER_ID", "folderId is required.");
  }
  return value.trim();
}

async function resolveUploadFolderId(userId: string, folderId: string): Promise<string> {
  if (folderId === "root") {
    const rootFolder = await ensureUserRootFolder(userId);
    return rootFolder.id;
  }

  await requireOwnedFolder(userId, folderId);
  return folderId;
}

function isFile(entry: FormDataEntryValue): entry is File {
  return entry instanceof File;
}
