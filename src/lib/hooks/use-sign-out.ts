import { authClient } from "#/lib/auth-client";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export function useSignOut() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    try {
      const { error } = await authClient.signOut();
      if (error) {
        toast.error(error.message ?? "Could not sign out.");
        return;
      }

      await router.invalidate();
      await router.navigate({ to: "/sign-in", search: { redirect: undefined }, replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return { isSigningOut, signOut };
}
