import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";

import { requestDriveListing } from "#/lib/drive-listing.fetch";
import type { DriveFolderListingResponse } from "#/lib/drive-listing.types";

export const loadDriveListing = createServerFn({ method: "GET" })
  .inputValidator(z.object({ folderId: z.string().trim().min(1) }))
  .handler(async ({ data }): Promise<DriveFolderListingResponse> => {
    const headers = getRequestHeaders();
    const origin = headers.get("origin") ?? "http://localhost:3000";
    return requestDriveListing(
      `${origin}/api/drive/listing?folderId=${encodeURIComponent(data.folderId)}`,
      {
        headers: {
          cookie: headers.get("cookie") ?? "",
        },
      },
    );
  });
