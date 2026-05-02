import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";

type DriveShellProps = {
  title: React.ReactNode;
  actions?: React.ReactNode;
  topContent?: React.ReactNode;
  children: React.ReactNode;
};

export function DriveShell({ title, actions, topContent, children }: DriveShellProps) {
  return (
    <section className="island-shell flex min-h-screen w-full min-w-0 flex-1 flex-col gap-4 overflow-hidden rounded-none bg-(--bg-base) px-6 py-4">
      <div className="flex flex-col gap-2">
        <div className="flex min-h-9 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" />
            <div className="min-w-0 px-2 text-lg font-bold text-(--sea-ink)">{title}</div>
          </div>
          <div className="flex min-h-9 items-center gap-2.5">{actions}</div>
        </div>
        {topContent}
      </div>
      {children}
    </section>
  );
}
