import { Cloud } from "lucide-react";

import ThemeToggle from "#/components/ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center border-b border-(--sidebar-border) bg-(--sidebar) px-7">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Cloud className="size-[26px] shrink-0 text-(--primary)" strokeWidth={2} aria-hidden />
        <span className="min-w-0 truncate text-[19px] font-bold tracking-tight text-(--sea-ink)">
          File Explorer
        </span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
