import { SocialSignIn } from "#/components/auth/social-sign-in";
import Header from "#/components/Header";
import { Button } from "#/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { authClient } from "#/lib/auth-client";
import { formatFieldErrors } from "#/lib/field-errors";
import { safeInternalPath } from "#/lib/nav-redirect";
import { signinFormSchema, signupFormSchema } from "#/lib/schemas/auth-forms";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

type AuthMode = "sign-in" | "sign-up";

function toFieldErrors(messages: string[]) {
  return messages.map((message) => ({ message }));
}

function getToastErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string") {
    const trimmed = error.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (error && typeof error === "object" && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") {
      const trimmed = maybeMessage.trim();
      return trimmed.length > 0 ? trimmed : fallback;
    }
  }

  return fallback;
}

export const Route = createFileRoute("/sign-in")({
  validateSearch: (raw: Record<string, unknown>): { redirect: string | undefined } => ({
    redirect: typeof raw.redirect === "string" ? raw.redirect : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const callbackURL = safeInternalPath(redirectTo, "/drive");

  const signInForm = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: signinFormSchema },
    onSubmit: async ({ value }) => {
      try {
        const { error } = await authClient.signIn.email({
          email: value.email,
          password: value.password,
        });
        if (error) {
          toast.error(getToastErrorMessage(error, "Could not sign in."));
          return;
        }

        await router.invalidate();
        await navigate({
          to: callbackURL,
          replace: true,
        } as Parameters<typeof navigate>[0]);
      } catch (error) {
        toast.error(getToastErrorMessage(error, "Could not sign in."));
      }
    },
  });

  const signUpForm = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validators: { onSubmit: signupFormSchema },
    onSubmit: async ({ value }) => {
      try {
        const { error } = await authClient.signUp.email({
          name: value.name,
          email: value.email,
          password: value.password,
        });
        if (error) {
          toast.error(getToastErrorMessage(error, "Could not create account."));
          return;
        }

        await router.invalidate();
        await navigate({
          to: callbackURL,
          replace: true,
        } as Parameters<typeof navigate>[0]);
      } catch (error) {
        toast.error(getToastErrorMessage(error, "Could not create account."));
      }
    },
  });

  function onModeChange(next: unknown) {
    if (next === "sign-in" || next === "sign-up") {
      setMode(next);
    }
  }

  return (
    <>
      <Header />
      <main className="page-wrap px-4 pt-10 pb-16">
        <div className="island-shell mx-auto w-full max-w-md rounded-2xl p-6 sm:p-8">
          <Tabs value={mode} onValueChange={onModeChange} className="mb-0 gap-0">
            <TabsList aria-label="sign-in and sign-up" className="mb-6" variant="line">
              <TabsTrigger value="sign-in">Sign In</TabsTrigger>
              <TabsTrigger value="sign-up">Sign Up</TabsTrigger>
            </TabsList>

            <SocialSignIn callbackURL={callbackURL} onError={(message) => toast.error(message)} />

            <TabsContent value="sign-in">
              <form
                className="flex flex-col gap-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void signInForm.handleSubmit();
                }}
                noValidate
              >
                <FieldGroup className="mt-3 gap-4">
                  <signInForm.Field
                    name="email"
                    children={(field) => {
                      const errs = formatFieldErrors(field.state.meta.errors);
                      const errId = `${field.name}-error`;
                      return (
                        <Field data-invalid={errs.length > 0 || undefined}>
                          <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            aria-invalid={errs.length > 0}
                            aria-describedby={errs.length ? errId : undefined}
                          />
                          <FieldError id={errId} errors={toFieldErrors(errs)} />
                        </Field>
                      );
                    }}
                  />

                  <signInForm.Field
                    name="password"
                    children={(field) => {
                      const errs = formatFieldErrors(field.state.meta.errors);
                      const errId = `${field.name}-error`;
                      return (
                        <Field data-invalid={errs.length > 0 || undefined}>
                          <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            type="password"
                            autoComplete="current-password"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            aria-invalid={errs.length > 0}
                            aria-describedby={errs.length ? errId : undefined}
                          />
                          <FieldError id={errId} errors={toFieldErrors(errs)} />
                        </Field>
                      );
                    }}
                  />
                </FieldGroup>

                <signInForm.Subscribe
                  selector={(s) => [s.canSubmit, s.isSubmitting] as const}
                  children={([canSubmit, isSubmitting]) => (
                    <Button type="submit" className="w-full" disabled={!canSubmit || isSubmitting}>
                      {isSubmitting ? "Signing in…" : "Sign in"}
                    </Button>
                  )}
                />
              </form>
            </TabsContent>

            <TabsContent value="sign-up">
              <form
                className="flex flex-col gap-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void signUpForm.handleSubmit();
                }}
                noValidate
              >
                <FieldGroup className="mt-3 gap-4">
                  <signUpForm.Field
                    name="name"
                    children={(field) => {
                      const errs = formatFieldErrors(field.state.meta.errors);
                      const errId = `${field.name}-error`;
                      return (
                        <Field data-invalid={errs.length > 0 || undefined}>
                          <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            autoComplete="name"
                            spellCheck={false}
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            aria-invalid={errs.length > 0}
                            aria-describedby={errs.length ? errId : undefined}
                          />
                          <FieldError id={errId} errors={toFieldErrors(errs)} />
                        </Field>
                      );
                    }}
                  />

                  <signUpForm.Field
                    name="email"
                    children={(field) => {
                      const errs = formatFieldErrors(field.state.meta.errors);
                      const errId = `${field.name}-error`;
                      return (
                        <Field data-invalid={errs.length > 0 || undefined}>
                          <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            aria-invalid={errs.length > 0}
                            aria-describedby={errs.length ? errId : undefined}
                          />
                          <FieldError id={errId} errors={toFieldErrors(errs)} />
                        </Field>
                      );
                    }}
                  />

                  <signUpForm.Field
                    name="password"
                    children={(field) => {
                      const errs = formatFieldErrors(field.state.meta.errors);
                      const errId = `${field.name}-error`;
                      return (
                        <Field data-invalid={errs.length > 0 || undefined}>
                          <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            type="password"
                            autoComplete="new-password"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            aria-invalid={errs.length > 0}
                            aria-describedby={errs.length ? errId : undefined}
                          />
                          <FieldError id={errId} errors={toFieldErrors(errs)} />
                        </Field>
                      );
                    }}
                  />

                  <signUpForm.Field
                    name="confirmPassword"
                    children={(field) => {
                      const errs = formatFieldErrors(field.state.meta.errors);
                      const errId = `${field.name}-error`;
                      return (
                        <Field data-invalid={errs.length > 0 || undefined}>
                          <FieldLabel htmlFor={field.name}>Confirm password</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            type="password"
                            autoComplete="new-password"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            aria-invalid={errs.length > 0}
                            aria-describedby={errs.length ? errId : undefined}
                          />
                          <FieldError id={errId} errors={toFieldErrors(errs)} />
                        </Field>
                      );
                    }}
                  />
                </FieldGroup>

                <signUpForm.Subscribe
                  selector={(s) => [s.canSubmit, s.isSubmitting] as const}
                  children={([canSubmit, isSubmitting]) => (
                    <Button type="submit" className="w-full" disabled={!canSubmit || isSubmitting}>
                      {isSubmitting ? "Creating account…" : "Create account"}
                    </Button>
                  )}
                />
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}
