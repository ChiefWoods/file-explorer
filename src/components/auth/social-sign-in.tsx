import { SocialSignInButton } from "#/components/auth/social-sign-in-button";
import { authClient } from "#/lib/auth-client";
import { cn } from "#/lib/utils";
import { useState } from "react";

const googleIcons = {
  light: "/icons/google/light.svg",
  dark: "/icons/google/dark.svg",
} as const;

const githubIcons = {
  light: "/icons/github/light.svg",
  dark: "/icons/github/dark.svg",
} as const;

const socialLogins: {
  provider: SocialProvider;
  iconSrc: { light: string; dark: string };
  ariaLabel: string;
}[] = [
  { provider: "google", iconSrc: googleIcons, ariaLabel: "Continue with Google" },
  { provider: "github", iconSrc: githubIcons, ariaLabel: "Continue with GitHub" },
];

export type SocialProvider = "google" | "github";

export type SocialSignInProps = {
  callbackURL: string;
  onError: (message: string) => void;
  className?: string;
};

export function SocialSignIn({ callbackURL, onError, className }: SocialSignInProps) {
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const oauthBusy = pending !== null;

  async function startOAuth(provider: SocialProvider) {
    setPending(provider);
    try {
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL,
      });
      if (error) {
        onError(normalizeSocialErrorMessage(error.message));
      }
    } catch (err) {
      onError(normalizeSocialErrorMessage(err instanceof Error ? err.message : null));
      setPending(null);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {socialLogins.map((login) => (
        <SocialSignInButton
          key={login.provider}
          iconSrc={login.iconSrc}
          ariaLabel={login.ariaLabel}
          isPending={pending === login.provider}
          oauthBusy={oauthBusy}
          onClick={() => void startOAuth(login.provider)}
        >
          {login.ariaLabel}
        </SocialSignInButton>
      ))}
    </div>
  );
}

function normalizeSocialErrorMessage(message: string | null | undefined): string {
  const normalized = message?.trim();
  return normalized ? normalized : "Could not start sign-in.";
}
