import { AlertTriangle, type LucideIcon } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/components/ui/empty";

type DriveErrorStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
};

export function DriveErrorState({
  title,
  description,
  icon: Icon = AlertTriangle,
}: DriveErrorStateProps) {
  return (
    <Empty className="min-h-0 flex-none border border-destructive/30 border-solid bg-destructive/5 p-8">
      <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive ring-destructive/20">
        <Icon className="size-5" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle className="text-sm font-semibold text-destructive">{title}</EmptyTitle>
        <EmptyDescription className="text-sm text-destructive/80">{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
