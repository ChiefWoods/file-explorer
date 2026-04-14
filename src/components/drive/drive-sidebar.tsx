import { ChevronsUpDown, Cloud, FolderOpen, LogOut, Share2, User } from "lucide-react";
import { useLocation, useNavigate } from "@tanstack/react-router";

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
  useSidebar,
} from "#/components/ui/sidebar";
import { USER_STORAGE_LIMIT_BYTES } from "#/lib/drive-constants";
import ThemeToggle from "../ThemeToggle";

type DriveSection = "my-drive" | "shared";
type SidebarUser = {
  name?: string | null;
  email?: string | null;
};

function formatBytes(bytes?: number) {
  if (typeof bytes !== "number") return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

type DriveSidebarProps = {
  user: SidebarUser;
  storageUsed: number;
  storagePct: number;
  isSigningOut: boolean;
  onSignOut: () => void;
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
}: DriveSidebarProps) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const activeSection: DriveSection = location.pathname.startsWith("/shared")
    ? "shared"
    : "my-drive";
  const userName = user.name?.trim() || "User";
  const userEmail = user.email?.trim() || "No email";

  return (
    <Sidebar className="w-[264px] border-border bg-[var(--sidebar)] p-2">
      <SidebarHeader className="flex flex-row items-center gap-2.5">
        <Cloud className="size-6 text-[var(--primary)]" aria-hidden />
        <p className="m-0 text-[17px] font-bold text-[var(--sea-ink)]">File Uploader</p>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="p-0">
          <SidebarMenu>
            {DRIVE_SECTION_ITEMS.map((item) => {
              const isActive = activeSection === item.key;
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
                      className={`size-[18px] ${isActive ? "text-[var(--primary)]" : "text-[var(--sea-ink-soft)]"}`}
                      aria-hidden
                    />
                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
        <div className="rounded-xl border border-border bg-[var(--surface)] p-3.5">
          <p className="m-0 text-xs font-semibold text-[var(--sea-ink)]">Storage</p>
          <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">
            {formatBytes(storageUsed)} of {formatBytes(USER_STORAGE_LIMIT_BYTES)} used
          </p>
          <Progress className="mt-2" value={storagePct} />
        </div>
      </SidebarContent>

      <ThemeToggle />

      <SidebarFooter className="flex flex-col gap-2.5 p-0 mt-4">
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
