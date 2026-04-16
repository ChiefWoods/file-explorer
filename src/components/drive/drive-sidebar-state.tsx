import { createContext, useContext, useMemo, useState } from "react";

type DriveSidebarStateContextValue = {
  isMyDriveOpen: boolean;
  setIsMyDriveOpen: (next: boolean) => void;
  isFolderOpen: (folderId: string) => boolean;
  setFolderOpen: (folderId: string, isOpen: boolean) => void;
};

const DriveSidebarStateContext = createContext<DriveSidebarStateContextValue | null>(null);

export function DriveSidebarStateProvider({ children }: { children: React.ReactNode }) {
  const [isMyDriveOpen, setIsMyDriveOpen] = useState(true);
  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(new Set());

  const value = useMemo<DriveSidebarStateContextValue>(
    () => ({
      isMyDriveOpen,
      setIsMyDriveOpen,
      isFolderOpen: (folderId: string) => openFolderIds.has(folderId),
      setFolderOpen: (folderId: string, isOpen: boolean) => {
        setOpenFolderIds((prev) => {
          const alreadyOpen = prev.has(folderId);
          if (alreadyOpen === isOpen) {
            return prev;
          }

          const next = new Set(prev);
          if (isOpen) {
            next.add(folderId);
          } else {
            next.delete(folderId);
          }
          return next;
        });
      },
    }),
    [isMyDriveOpen, openFolderIds],
  );

  return (
    <DriveSidebarStateContext.Provider value={value}>{children}</DriveSidebarStateContext.Provider>
  );
}

export function useDriveSidebarState() {
  const ctx = useContext(DriveSidebarStateContext);
  if (!ctx) {
    throw new Error("useDriveSidebarState must be used within DriveSidebarStateProvider.");
  }
  return ctx;
}
