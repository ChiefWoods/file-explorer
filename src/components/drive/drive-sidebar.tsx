import type { DriveSidebarFolderNode } from "#/lib/drive-listing.types";

import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Progress } from "#/components/ui/progress";
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
import { formatBytes } from "#/lib/format-bytes";
import { cn } from "#/lib/utils";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  ChevronsUpDown,
  ChevronRight,
  Cloud,
  FolderOpen,
  LogOut,
  Share2,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

import ThemeToggle from "../ThemeToggle";

type DriveSection = "my-drive" | "shared";
type SidebarUser = {
  name?: string | null;
  email?: string | null;
};

type DriveSidebarProps = {
  user: SidebarUser;
  storageUsed: number;
  storagePct: number;
  isSigningOut: boolean;
  onSignOut: () => void;
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

export function DriveSidebar({
  user,
  storageUsed,
  storagePct,
  isSigningOut,
  onSignOut,
  currentFolderId,
  nestedFolders = [],
}: DriveSidebarProps) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const isDriveRootRoute = location.pathname === "/drive" || location.pathname === "/drive/";
  const activeSection: DriveSection = location.pathname.startsWith("/shared")
    ? "shared"
    : "my-drive";
  const [isMyDriveOpen, setIsMyDriveOpen] = useState(true);
  const userName = user.name?.trim() || "User";
  const userEmail = user.email?.trim() || "No email";

  useEffect(() => {
    if (activeSection === "my-drive") {
      setIsMyDriveOpen(true);
    }
  }, [activeSection]);

  return (
    <Sidebar className="w-[264px] border-border bg-(--sidebar) p-2">
      <SidebarHeader className="flex flex-row items-center gap-2.5">
        <Cloud className="size-6 text-(--primary)" aria-hidden />
        <p className="m-0 text-[17px] font-bold text-(--sea-ink)">File Uploader</p>
      </SidebarHeader>

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
                            className={`size-[18px] ${isActive ? "text-(--primary)" : "text-(--sea-ink-soft)"}`}
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
                            onSelect={(folderPath) =>
                              void navigate({
                                to: "/drive/$",
                                params: { _splat: folderPath },
                              })
                            }
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
                    onClick={() =>
                      void navigate({ to: item.key === "my-drive" ? "/drive" : "/shared" })
                    }
                  >
                    <Icon
                      className={`size-[18px] ${isActive ? "text-(--primary)" : "text-(--sea-ink-soft)"}`}
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
            {formatBytes(storageUsed, { empty: "—" })} of{" "}
            {formatBytes(USER_STORAGE_LIMIT_BYTES, { empty: "—" })} used
          </p>
          <Progress className="mt-2" value={storagePct} />
        </div>
      </SidebarContent>

      <ThemeToggle />

      <SidebarFooter className="mt-4 flex flex-col gap-2.5 p-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />} className="h-12">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-muted text-muted-foreground">
                    <User className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <p className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{userName}</span>
                  <span className="truncate text-xs">{userEmail}</span>
                </p>
                <ChevronsUpDown className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuGroup className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-muted text-muted-foreground">
                      <User className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <p className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{userName}</span>
                    <span className="truncate text-xs">{userEmail}</span>
                  </p>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={onSignOut} disabled={isSigningOut}>
                    <LogOut />
                    {isSigningOut ? "Logging out…" : "Log out"}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function DriveSidebarFolderTree({
  folders,
  currentFolderId,
  onSelect,
}: {
  folders: DriveSidebarFolderNode[];
  currentFolderId?: string;
  onSelect: (folderPath: string) => void;
}) {
  return (
    <SidebarMenuSub>
      {folders.map((folder) => (
        <DriveSidebarFolderTreeItem
          key={folder.id}
          folder={folder}
          currentFolderId={currentFolderId}
          onSelect={onSelect}
        />
      ))}
    </SidebarMenuSub>
  );
}

function DriveSidebarFolderTreeItem({
  folder,
  currentFolderId,
  onSelect,
}: {
  folder: DriveSidebarFolderNode;
  currentFolderId?: string;
  onSelect: (folderPath: string) => void;
}) {
  const isCurrent = folder.id === currentFolderId;
  const hasChildren = folder.children.length > 0;
  const isInActiveBranch =
    !!currentFolderId && folder.children.some((child) => containsFolderId(child, currentFolderId));
  const [isOpen, setIsOpen] = useState(isInActiveBranch || isCurrent);

  useEffect(() => {
    if (isInActiveBranch || isCurrent) {
      setIsOpen(true);
    }
  }, [isCurrent, isInActiveBranch]);

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
            className={cn("size-4", isCurrent ? "text-(--primary)" : "text-(--sea-ink-soft)")}
            aria-hidden
          />
          {folder.name}
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  return (
    <SidebarMenuSubItem>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/collapsible">
        <div className="relative">
          <SidebarMenuSubButton
            render={<button type="button" />}
            isActive={isCurrent}
            className="w-full justify-start pr-8"
            onClick={() => onSelect(folder.path)}
          >
            <FolderOpen
              className={cn("size-4", isCurrent ? "text-(--primary)" : "text-(--sea-ink-soft)")}
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
