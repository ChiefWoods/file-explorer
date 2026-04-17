import type { DriveSidebarFolderNode } from "#/lib/drive-listing.types";

import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Progress, ProgressIndicator } from "#/components/ui/progress";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "#/components/ui/sidebar";
import { USER_STORAGE_LIMIT_BYTES } from "#/lib/drive-constants";
import { useSignOut } from "#/lib/hooks/use-sign-out";
import { safeInternalPath } from "#/lib/nav-redirect";
import { formatBytes } from "#/lib/utils";
import { cn } from "#/lib/utils";
import { Route as RootRoute } from "#/routes/__root";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  ChevronsUpDown,
  ChevronRight,
  Cloud,
  FolderOpen,
  LogIn,
  LogOut,
  Share2,
  User,
} from "lucide-react";
import { useState } from "react";

import ThemeToggle from "../ThemeToggle";

type DriveSection = "my-drive" | "shared";

type DriveSidebarProps = {
  storageUsed: number;
  storagePct: number;
  currentFolderId?: string;
  nestedFolders?: DriveSidebarFolderNode[];
};

const DRIVE_SECTION_ITEMS: Array<{
  key: DriveSection;
  label: string;
  icon: typeof FolderOpen;
}> = [
  { key: "my-drive", label: "My Drive", icon: FolderOpen },
  { key: "shared", label: "Shared", icon: Share2 },
];

function UserMetadata({ name, email }: { name: string; email: string }) {
  return (
    <>
      <Avatar className="size-8 rounded-lg">
        <AvatarFallback className="rounded-lg bg-muted text-muted-foreground">
          <User className="size-4" />
        </AvatarFallback>
      </Avatar>
      <p className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-xs">{email}</span>
      </p>
    </>
  );
}

export function DriveSidebar({
  storageUsed,
  storagePct,
  currentFolderId,
  nestedFolders = [],
}: DriveSidebarProps) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSigningOut, signOut } = useSignOut();
  const { session, user } = RootRoute.useRouteContext();
  const isAuthenticated = Boolean(session);
  const isPublicSharedView = !isAuthenticated && location.pathname.startsWith("/drive/");
  const isDriveRootRoute = location.pathname === "/drive" || location.pathname === "/drive/";
  const activeSection: DriveSection = location.pathname.startsWith("/drive/shared")
    ? "shared"
    : "my-drive";
  const [isMyDriveOpen, setIsMyDriveOpen] = useState(true);
  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(new Set());
  const userName = user?.name?.trim() || "User";
  const userEmail = user?.email?.trim() || "No email";
  const storageProgressClassName =
    storagePct >= 95 ? "bg-red-500" : storagePct >= 75 ? "bg-amber-500" : "bg-primary";

  function isFolderOpen(folderId: string): boolean {
    return openFolderIds.has(folderId);
  }

  function setFolderOpen(folderId: string, isOpen: boolean) {
    setOpenFolderIds((prev) => {
      const next = new Set(prev);
      if (isOpen) {
        next.add(folderId);
      } else {
        next.delete(folderId);
      }
      return next;
    });
  }

  return (
    <Sidebar className="w-[264px] border-border bg-sidebar p-2">
      <SidebarHeader className="flex flex-row items-center gap-2.5">
        <Cloud className="size-6 text-primary" aria-hidden />
        <p className="m-0 text-[17px] font-bold text-(--sea-ink)">File Uploader</p>
      </SidebarHeader>

      {!isPublicSharedView && (
        <SidebarContent>
          <SidebarGroup className="p-0">
            <SidebarMenu>
              {DRIVE_SECTION_ITEMS.map((item) => {
                const isActive =
                  item.key === "my-drive" ? isDriveRootRoute : activeSection === item.key;
                const Icon = item.icon;

                if (item.key === "my-drive") {
                  return (
                    <SidebarMenuItem key={item.key}>
                      <Collapsible
                        open={isMyDriveOpen}
                        onOpenChange={setIsMyDriveOpen}
                        className="group/collapsible"
                      >
                        <div className="relative">
                          <SidebarMenuButton
                            type="button"
                            isActive={isActive}
                            className="pr-8"
                            onClick={() => void navigate({ to: "/drive" })}
                          >
                            <Icon
                              className={`size-[18px] ${isActive ? "text-primary" : "text-(--sea-ink-soft)"}`}
                              aria-hidden
                            />
                            {item.label}
                          </SidebarMenuButton>
                          {nestedFolders.length > 0 && (
                            <CollapsibleTrigger
                              render={
                                <button
                                  type="button"
                                  aria-label="Toggle My Drive folders"
                                  className="absolute top-0 right-0 inline-flex size-8 items-center justify-center rounded-md text-(--sea-ink-soft) hover:bg-sidebar-accent"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                  }}
                                />
                              }
                            >
                              <ChevronRight
                                className={cn(
                                  "size-4 transition-transform",
                                  isMyDriveOpen && "rotate-90",
                                )}
                                aria-hidden
                              />
                            </CollapsibleTrigger>
                          )}
                        </div>
                        <CollapsibleContent>
                          {nestedFolders.length > 0 && (
                            <DriveSidebarFolderTree
                              folders={nestedFolders}
                              currentFolderId={currentFolderId}
                              onSelect={(folderPath) => {
                                void navigate({
                                  to: "/drive/$",
                                  params: { _splat: folderPath },
                                });
                              }}
                              isFolderOpen={isFolderOpen}
                              setFolderOpen={setFolderOpen}
                            />
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      type="button"
                      isActive={isActive}
                      onClick={() => void navigate({ to: "/drive/shared" })}
                    >
                      <Icon
                        className={`size-[18px] ${isActive ? "text-primary" : "text-(--sea-ink-soft)"}`}
                        aria-hidden
                      />
                      {item.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
          <div className="rounded-xl border border-border bg-(--surface) p-3.5">
            <p className="m-0 text-xs font-semibold text-(--sea-ink)">Storage</p>
            <p className="mt-1 text-xs text-(--sea-ink-soft)">
              {formatBytes(storageUsed, { empty: "—" })} of {formatBytes(USER_STORAGE_LIMIT_BYTES)}{" "}
              used
            </p>
            <Progress className="mt-2" value={storagePct}>
              <ProgressIndicator className={storageProgressClassName} />
            </Progress>
          </div>
        </SidebarContent>
      )}

      <div className="mt-auto flex flex-col gap-2.5 pt-2">
        <ThemeToggle />

        <SidebarFooter className="flex flex-col gap-2.5 p-0">
          <SidebarMenu>
            <SidebarMenuItem>
              {isPublicSharedView ? (
                <SidebarMenuButton
                  size="lg"
                  className="h-12"
                  type="button"
                  onClick={() => {
                    const href = `${location.pathname}${location.searchStr ?? ""}`;
                    void navigate({
                      to: "/sign-in",
                      search: { redirect: safeInternalPath(href, "/drive") },
                    });
                  }}
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-muted text-muted-foreground">
                      <LogIn className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <p className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Log In</span>
                    <span className="truncate text-xs text-(--sea-ink-soft)">
                      Sign in to manage files
                    </span>
                  </p>
                </SidebarMenuButton>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />} className="h-12">
                    <UserMetadata name={userName} email={userEmail} />
                    <ChevronsUpDown className="ml-auto size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="min-w-56 rounded-lg"
                    side={isMobile ? "bottom" : "right"}
                    align="end"
                    sideOffset={4}
                  >
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={signOut} disabled={isSigningOut}>
                        <LogOut />
                        {isSigningOut ? "Logging out…" : "Log out"}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}

function DriveSidebarFolderTree({
  folders,
  currentFolderId,
  onSelect,
  isFolderOpen,
  setFolderOpen,
}: {
  folders: DriveSidebarFolderNode[];
  currentFolderId?: string;
  onSelect: (folderPath: string) => void;
  isFolderOpen: (folderId: string) => boolean;
  setFolderOpen: (folderId: string, isOpen: boolean) => void;
}) {
  return (
    <SidebarMenuSub>
      {folders.map((folder) => (
        <DriveSidebarFolderTreeItem
          key={folder.id}
          folder={folder}
          currentFolderId={currentFolderId}
          onSelect={onSelect}
          isFolderOpen={isFolderOpen}
          setFolderOpen={setFolderOpen}
        />
      ))}
    </SidebarMenuSub>
  );
}

function DriveSidebarFolderTreeItem({
  folder,
  currentFolderId,
  onSelect,
  isFolderOpen,
  setFolderOpen,
}: {
  folder: DriveSidebarFolderNode;
  currentFolderId?: string;
  onSelect: (folderPath: string) => void;
  isFolderOpen: (folderId: string) => boolean;
  setFolderOpen: (folderId: string, isOpen: boolean) => void;
}) {
  const isCurrent = folder.id === currentFolderId;
  const hasChildren = folder.children.length > 0;
  const isInActiveBranch =
    !!currentFolderId && folder.children.some((child) => containsFolderId(child, currentFolderId));
  const isOpen = isFolderOpen(folder.id) || isInActiveBranch || isCurrent;

  if (!hasChildren) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          render={<button type="button" />}
          isActive={isCurrent}
          className="w-full justify-start"
          onClick={() => onSelect(folder.path)}
        >
          <FolderOpen
            className={cn("size-4", isCurrent ? "text-primary" : "text-(--sea-ink-soft)")}
            aria-hidden
          />
          {folder.name}
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  return (
    <SidebarMenuSubItem>
      <Collapsible
        open={isOpen}
        onOpenChange={(nextOpen) => setFolderOpen(folder.id, nextOpen)}
        className="group/collapsible"
      >
        <div className="relative">
          <SidebarMenuSubButton
            render={<button type="button" />}
            isActive={isCurrent}
            className="w-full justify-start pr-8"
            onClick={() => onSelect(folder.path)}
          >
            <FolderOpen
              className={cn("size-4", isCurrent ? "text-primary" : "text-(--sea-ink-soft)")}
              aria-hidden
            />
            {folder.name}
          </SidebarMenuSubButton>
          <CollapsibleTrigger
            render={
              <button
                type="button"
                aria-label={`Toggle ${folder.name}`}
                className="absolute top-0 right-0 inline-flex size-7 items-center justify-center rounded-md text-(--sea-ink-soft) hover:bg-sidebar-accent"
                onClick={(event) => {
                  event.stopPropagation();
                }}
              />
            }
          >
            <ChevronRight
              className={cn("size-4 transition-transform", isOpen && "rotate-90")}
              aria-hidden
            />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <DriveSidebarFolderTree
            folders={folder.children}
            currentFolderId={currentFolderId}
            onSelect={onSelect}
            isFolderOpen={isFolderOpen}
            setFolderOpen={setFolderOpen}
          />
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuSubItem>
  );
}

function containsFolderId(folder: DriveSidebarFolderNode, folderId: string): boolean {
  if (folder.id === folderId) {
    return true;
  }

  return folder.children.some((child) => containsFolderId(child, folderId));
}
