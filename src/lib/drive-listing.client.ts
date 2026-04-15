import type { DriveFolderListingResponse } from "#/lib/drive-listing.types";
import { requestDriveListing } from "#/lib/drive-listing.fetch";

export async function fetchDriveListing(folderId: string): Promise<DriveFolderListingResponse> {
  return requestDriveListing(`/api/drive/listing?folderId=${encodeURIComponent(folderId)}`);
}
