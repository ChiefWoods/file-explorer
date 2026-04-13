import { auth } from "#/lib/auth";
import { HttpError } from "#/lib/api/http";

type SessionPayload = Awaited<ReturnType<typeof auth.api.getSession>>;

export type AuthSession = NonNullable<SessionPayload>;

export async function requireAuthSession(request: Request): Promise<AuthSession> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || !session.session) {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication required.");
  }
  return session;
}

export async function getOptionalAuthSession(request: Request): Promise<AuthSession | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user || !session.session) {
    return null;
  }
  return session;
}
