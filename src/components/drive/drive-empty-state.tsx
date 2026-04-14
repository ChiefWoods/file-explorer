import type { LucideIcon } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/components/ui/empty";

type DriveEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function DriveEmptyState({ icon: Icon, title, description }: DriveEmptyStateProps) {
  return (
    <Empty className="min-h-0 flex-none border border-border border-solid bg-card p-8">
      <EmptyMedia variant="icon">
        <Icon className="size-5" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle className="text-sm font-semibold text-[var(--sea-ink)]">{title}</EmptyTitle>
        <EmptyDescription className="text-sm text-[var(--sea-ink-soft)]">
          {description}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
