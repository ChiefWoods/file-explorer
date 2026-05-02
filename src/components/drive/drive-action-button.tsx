import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "#/components/ui/button";

type DriveActionButtonProps = Omit<ComponentProps<typeof Button>, "size"> & {
  icon: LucideIcon;
};

export function DriveActionButton({ icon: Icon, children, ...props }: DriveActionButtonProps) {
  return (
    <Button size="sm" {...props}>
      <Icon data-icon="inline-start" />
      {children}
    </Button>
  );
}
