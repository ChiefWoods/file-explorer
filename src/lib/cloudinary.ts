import { v2 as cloudinary } from "cloudinary";

export type CloudinaryResourceType = "image" | "raw" | "video";
const CLOUDINARY_UPLOAD_FOLDER = "file-uploader";

type UploadBufferParams = {
  buffer: Buffer;
  publicId: string;
  resourceType: CloudinaryResourceType;
  fileName?: string;
};

type UploadBufferResult = {
  publicId: string;
  secureUrl: string;
  bytes: number;
  resourceType: CloudinaryResourceType;
};

let configured = false;

function ensureCloudinaryConfigured() {
  if (configured) {
    return;
  }

  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (cloudinaryUrl) {
    cloudinary.config(cloudinaryUrl);
    configured = true;
    return;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET.",
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  configured = true;
}

export async function uploadBufferToCloudinary(
  input: UploadBufferParams,
): Promise<UploadBufferResult> {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: input.publicId,
        folder: CLOUDINARY_UPLOAD_FOLDER,
        resource_type: input.resourceType,
        overwrite: false,
        use_filename: false,
        filename_override: input.fileName,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.public_id || !result.secure_url) {
          reject(new Error("Cloudinary upload did not return a valid payload."));
          return;
        }

        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          bytes: typeof result.bytes === "number" ? result.bytes : 0,
          resourceType: (result.resource_type as CloudinaryResourceType) ?? input.resourceType,
        });
      },
    );

    stream.end(input.buffer);
  });
}

export async function destroyCloudinaryAsset(
  publicId: string,
  resourceType: CloudinaryResourceType,
) {
  ensureCloudinaryConfigured();
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
}

export function toCloudinaryResourceType(resourceType: string): CloudinaryResourceType {
  if (resourceType === "image" || resourceType === "video") {
    return resourceType;
  }
  return "raw";
}

export function buildCloudinaryDownloadUrl(secureUrl: string): string {
  if (!secureUrl.includes("/upload/")) {
    return secureUrl;
  }

  return secureUrl.replace("/upload/", "/upload/fl_attachment/");
}
