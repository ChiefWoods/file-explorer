import { errorResponse, HttpError } from "#/lib/api/http";
import { getOptionalAuthSession } from "#/lib/api/session";
import { buildCloudinaryDownloadUrl } from "#/lib/cloudinary";
import { prisma } from "#/lib/db";
import { isShareExpired } from "#/lib/share-link";
import { createFileRoute } from "@tanstack/react-router";

type HandlerArgs = { request: Request; params?: { token?: string } };

export const Route = createFileRoute("/api/share/$token")({
  server: {
    handlers: {
      GET: ({ request, params }: HandlerArgs) => handlePublicShare(request, params?.token),
    },
  },
});

async function handlePublicShare(
  request: Request,
  tokenFromParams: string | undefined,
): Promise<Response> {
  try {
    const token = tokenFromParams ?? getTokenFromPath(request);
    if (!token) {
      throw new HttpError(400, "INVALID_TOKEN", "Missing share token.");
    }

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        folderId: true,
        expiresAt: true,
        createdAt: true,
        folder: {
          select: {
            id: true,
            name: true,
            parentId: true,
          },
        },
      },
    });

    if (!shareLink || isShareExpired(shareLink.expiresAt)) {
      return Response.json(
        {
          error: {
            code: "SHARE_NOT_FOUND",
            message: "Share link is invalid or expired.",
          },
        },
        { status: 404 },
      );
    }

    const [folders, files, viewerSession] = await Promise.all([
      prisma.folder.findMany({
        where: {
          parentId: shareLink.folderId,
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          parentId: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
      prisma.file.findMany({
        where: {
          folderId: shareLink.folderId,
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          mimeType: true,
          bytes: true,
          secureUrl: true,
          createdAt: true,
        },
      }),
      getOptionalAuthSession(request),
    ]);

    return Response.json({
      share: {
        id: shareLink.id,
        token: shareLink.token,
        folderId: shareLink.folderId,
        expiresAt: shareLink.expiresAt,
      },
      folder: shareLink.folder,
      folders,
      files: files.map((file) => ({
        ...file,
        downloadUrl: buildCloudinaryDownloadUrl(file.secureUrl, file.name),
      })),
      viewer: {
        isSignedIn: Boolean(viewerSession?.session),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function getTokenFromPath(request: Request): string | undefined {
  const pathname = new URL(request.url).pathname;
  const token = pathname.split("/").at(-1);
  return token || undefined;
}
