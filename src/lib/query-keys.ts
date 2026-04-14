export const queryKeys = {
  drive: {
    listing: (folderId: string | null) => ["drive", "listing", folderId ?? "root"] as const,
    item: (itemId: string) => ["drive", "item", itemId] as const,
    storage: () => ["drive", "storage"] as const,
  },
  share: {
    links: (folderId: string | null = null) => ["share", "links", folderId ?? "all"] as const,
    publicByToken: (token: string) => ["share", "public", token] as const,
  },
} as const;
