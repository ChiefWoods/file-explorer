type DriveShellProps = {
  title: React.ReactNode;
  actions?: React.ReactNode;
  topContent?: React.ReactNode;
  children: React.ReactNode;
};

export function DriveShell({ title, actions, topContent, children }: DriveShellProps) {
  return (
    <section className="island-shell flex min-h-screen w-full overflow-hidden rounded-none min-w-0 flex-1 flex-col gap-4 bg-(--bg-base) p-6">
      <div className="flex flex-col gap-2">
        <div className="flex min-h-9 items-center justify-between gap-3">
          <div className="min-w-0 text-lg font-bold text-(--sea-ink)">{title}</div>
          <div className="flex min-h-9 items-center gap-2.5">{actions}</div>
        </div>
        {topContent}
      </div>
      {children}
    </section>
  );
}
