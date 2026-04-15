import { buttonVariants } from "#/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/components/ui/empty";
import { cn } from "#/lib/utils";
import { AlertTriangle } from "lucide-react";

type ErrorPageProps = {
  code?: number;
  title?: string;
  description?: string;
  compact?: boolean;
};

export function ErrorPage({
  code = 404,
  title = "Page not found",
  description = "The page you requested could not be found.",
  compact = false,
}: ErrorPageProps) {
  return (
    <main
      className={cn(
        "page-wrap flex min-h-screen items-center justify-center px-4 pt-10 pb-16",
        compact && "min-h-0 px-0 py-0",
      )}
    >
      <Empty
        className={cn(
          "w-full max-w-2xl border border-solid border-destructive/30 bg-destructive/5 p-8",
          compact && "max-w-none",
        )}
      >
        <EmptyMedia
          variant="icon"
          className="bg-destructive/10 text-destructive ring-destructive/20"
        >
          <AlertTriangle className="size-5" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle className="text-destructive text-base font-semibold">
            {code} · {title}
          </EmptyTitle>
          <EmptyDescription className="text-destructive/85 text-sm">{description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <a href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Back to Home
          </a>
        </EmptyContent>
      </Empty>
    </main>
  );
}
