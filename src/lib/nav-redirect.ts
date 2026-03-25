export function safeInternalPath(candidate: string | undefined, fallback: string): string {
  if (!candidate) {
    return fallback;
  }
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("://")) {
    return fallback;
  }
  return candidate;
}
