import { Cloud } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center border-b border-(--sidebar-border) bg-(--sidebar) px-4 sm:h-16 sm:px-7">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
        <Cloud
          className="size-[22px] shrink-0 text-(--primary) sm:size-[26px]"
          strokeWidth={2}
          aria-hidden
        />
        <span className="min-w-0 truncate text-[17px] font-bold tracking-tight text-(--sea-ink) sm:text-[19px]">
          File Explorer
        </span>
      </div>
    </header>
  );
}
