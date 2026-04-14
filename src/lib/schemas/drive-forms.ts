import { z } from "zod";

export const uploadFilesFormSchema = z.object({
  folderId: z.string().trim().min(1, "Select a destination folder."),
  files: z
    .array(
      z.custom<File>((value) => value instanceof File, {
        message: "Invalid file selected.",
      }),
    )
    .min(1, "Select at least one file."),
});

export type UploadFilesFormValues = z.infer<typeof uploadFilesFormSchema>;
