import type { DriveSidebarFolderNode } from "#/lib/drive-listing.types";

import { Avatar, AvatarFallback } from "#/components/ui/avatar";
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
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronsUpDown, Cloud, FolderOpen, LogOut, Share2, User } from "lucide-react";

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
  const userName = user.name?.trim() || "User";
  const userEmail = user.email?.trim() || "No email";

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
                  {item.key === "my-drive" && nestedFolders.length > 0 && (
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
        <SidebarMenuSubItem key={folder.id}>
          <SidebarMenuSubButton
            render={<button type="button" />}
            isActive={folder.id === currentFolderId}
            className="w-full justify-start"
            onClick={() => onSelect(folder.path)}
          >
            {folder.name}
          </SidebarMenuSubButton>
          {folder.children.length > 0 && (
            <DriveSidebarFolderTree
              folders={folder.children}
              currentFolderId={currentFolderId}
              onSelect={onSelect}
            />
          )}
        </SidebarMenuSubItem>
      ))}
    </SidebarMenuSub>
  );
}
