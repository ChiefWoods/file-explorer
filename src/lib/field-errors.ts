type FieldErrorLike = { message?: unknown } | string | number | null | undefined;

function toErrorMessage(error: FieldErrorLike): string | null {
  if (typeof error === "string") {
    const trimmed = error.trim();
    return trimmed.length ? trimmed : null;
  }

  if (typeof error === "number") {
    return String(error);
  }

  if (error && typeof error === "object" && "message" in error) {
    const maybeMessage = error.message;
    if (typeof maybeMessage === "string") {
      const trimmed = maybeMessage.trim();
      return trimmed.length ? trimmed : null;
    }
    if (typeof maybeMessage === "number") {
      return String(maybeMessage);
    }
  }

  return null;
}

export function formatFieldErrors(errors: readonly unknown[] | null | undefined): string[] {
  if (!errors?.length) {
    return [];
  }

  const seen = new Set<string>();
  const messages: string[] = [];

  for (const error of errors) {
    const message = toErrorMessage(error as FieldErrorLike);
    if (!message || seen.has(message)) {
      continue;
    }
    seen.add(message);
    messages.push(message);
  }

  return messages;
}
