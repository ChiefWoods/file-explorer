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
    <section className="island-shell flex min-h-screen w-full min-w-0 flex-1 flex-col gap-4 overflow-hidden rounded-none bg-(--bg-base) px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
      <div className="flex flex-col gap-2">
        <div className="flex min-h-9 flex-wrap items-start gap-2 sm:items-center sm:justify-between sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <div className="min-w-0 px-1 text-base font-bold text-(--sea-ink) sm:px-2 sm:text-lg">
              {title}
            </div>
          </div>
          {actions && (
            <div className="flex min-h-9 w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-2.5">
              {actions}
            </div>
          )}
        </div>
        {topContent}
      </div>
      {children}
    </section>
  );
}
