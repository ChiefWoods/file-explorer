import JSZip from "jszip";

export type DriveDownloadFile = {
  name: string;
  downloadUrl: string;
  relativePath?: string;
};

function sanitizePathSegment(segment: string): string {
  const cleaned = segment.trim().replace(/[\\/:*?"<>|]+/g, "_");
  return cleaned.length > 0 ? cleaned : "untitled";
}

function formatDateTimeForZip(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function buildDefaultZipFileName(): string {
  return `file-uploader-${formatDateTimeForZip(new Date())}.zip`;
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

async function fetchDownloadBlob(file: DriveDownloadFile): Promise<Blob> {
  const response = await fetch(file.downloadUrl);
  if (!response.ok) {
    throw new Error(`Could not fetch ${file.name} for download.`);
  }

  return response.blob();
}

function buildZipEntryPath(file: DriveDownloadFile): string {
  const normalizedName = sanitizePathSegment(file.name);
  const relativePath = file.relativePath
    ? file.relativePath.split("/").filter(Boolean).map(sanitizePathSegment).join("/")
    : "";

  return relativePath ? `${relativePath}/${normalizedName}` : normalizedName;
}

export async function downloadMultipleFiles(files: DriveDownloadFile[]): Promise<void> {
  if (files.length === 0) {
    return;
  }

  if (files.length === 1) {
    window.location.assign(files[0].downloadUrl);
    return;
  }

  const fetchedFiles = await Promise.all(
    files.map(async (file) => ({
      path: buildZipEntryPath(file),
      blob: await fetchDownloadBlob(file),
    })),
  );

  const zip = new JSZip();
  for (const entry of fetchedFiles) {
    zip.file(entry.path, entry.blob);
  }

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  triggerBlobDownload(zipBlob, buildDefaultZipFileName());
}
