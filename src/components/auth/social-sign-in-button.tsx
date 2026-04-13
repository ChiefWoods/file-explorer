import type { ReactNode } from "react";

import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

const outlineFullWidthClassName = "w-full gap-2";

export type SocialSignInButtonProps = {
  /** URLs for light UI vs dark UI (`html.dark`). */
  iconSrc: { light: string; dark: string };
  /** Shown next to the icon when not pending (e.g. "Continue with Google"). */
  children: ReactNode;
  /** Accessible name when the visible label might be insufficient. */
  ariaLabel: string;
  isPending: boolean;
  /** True while any provider OAuth flow is in progress (disables all social buttons). */
  oauthBusy: boolean;
  onClick: () => void;
  className?: string;
};

export function SocialSignInButton({
  iconSrc,
  children,
  ariaLabel,
  isPending,
  oauthBusy,
  onClick,
  className,
}: SocialSignInButtonProps) {
  const imgClass = "size-5 shrink-0";
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(outlineFullWidthClassName, className)}
      size="lg"
      disabled={oauthBusy}
      aria-busy={isPending}
      aria-label={ariaLabel}
      onClick={() => onClick()}
    >
      <img
        src={iconSrc.light}
        alt=""
        width={20}
        height={20}
        className={cn(imgClass, "dark:hidden")}
        decoding="async"
      />
      <img
        src={iconSrc.dark}
        alt=""
        width={20}
        height={20}
        className={cn(imgClass, "hidden dark:block")}
        decoding="async"
      />
      {isPending ? "Redirecting…" : children}
    </Button>
  );
}
