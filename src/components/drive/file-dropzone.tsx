import {
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type FileDropzoneProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
};

export function FileDropzone({ files, onFilesChange, disabled = false }: FileDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const input = fileInputRef.current;
    if (!input) {
      return;
    }

    const dataTransfer = new DataTransfer();
    for (const file of files) {
      dataTransfer.items.add(file);
    }
    input.files = dataTransfer.files;
  }, [files]);

  return (
    <div className="min-w-0 space-y-2">
      <div
        className={`min-w-0 cursor-pointer overflow-hidden rounded-xl border border-dashed p-6 text-center outline-none ${
          isDragActive ? "border-[var(--primary)] bg-[var(--surface)]" : "border-border bg-card"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) {
            fileInputRef.current?.click();
          }
        }}
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          if (disabled) {
            return;
          }
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={(event) => {
          if (disabled) {
            return;
          }
          event.preventDefault();
          setIsDragActive(false);
          const droppedFiles = Array.from(event.dataTransfer.files);
          if (droppedFiles.length > 0) {
            onFilesChange(droppedFiles);
          }
        }}
      >
        {files.length > 0 ? (
          <ul className="bg-card max-h-28 space-y-1 overflow-auto rounded-md p-2 text-left">
            {files.map((file, index) => {
              const ItemIcon = getFileTypeIcon(file);
              return (
                <li
                  key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                  className="flex min-w-0 items-center gap-2"
                >
                  <ItemIcon className="size-3.5 shrink-0 text-[var(--primary)]" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--sea-ink)]">
                    {file.name}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <>
            <p className="m-0 text-sm font-medium text-[var(--sea-ink)]">
              Drag and drop files here
            </p>
            <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">or click to choose files</p>
          </>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={(event) => onFilesChange(Array.from(event.target.files ?? []))}
      />
      <p className="text-xs text-[var(--sea-ink-soft)]">
        {files.length === 0
          ? "No files selected."
          : `${files.length} file${files.length > 1 ? "s" : ""} selected.`}
      </p>
    </div>
  );
}

function getFileTypeIcon(file: File): LucideIcon {
  const mimeType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  if (mimeType.startsWith("image/")) {
    return FileImage;
  }

  if (mimeType.startsWith("video/")) {
    return FileVideo;
  }

  if (mimeType.startsWith("audio/")) {
    return FileAudio;
  }

  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("csv") ||
    fileName.endsWith(".csv")
  ) {
    return FileSpreadsheet;
  }

  if (mimeType.startsWith("text/") || mimeType === "application/pdf") {
    return FileText;
  }

  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("7z") ||
    mimeType.includes("tar")
  ) {
    return FileArchive;
  }

  return File;
}
