import { z } from "zod";
import { InfraiAuthClient } from "./infrai_auth.ts";
import type { Session } from "./domain.ts";

export const inventoryRequestSchema = z.object({
  user_id: z.string().min(1),
  current_session_id: z.string().min(1)
});

export type InventoryRequest = z.infer<typeof inventoryRequestSchema>;

export async function signOutOtherSessions(input: unknown, auth: InfraiAuthClient): Promise<{ kept: Session; revoked: string[] }> {
  const request = inventoryRequestSchema.parse(input);
  const sessions = await auth.listActiveSessions(request.user_id);
  const current = sessions.find((session) => session.session_id === request.current_session_id);
  if (!current) throw new Error("Current session was not found");
  const otherSessions = sessions.filter((session) => session.session_id !== request.current_session_id);
  for (const session of otherSessions) await auth.revokeSession(session.session_id);
  return { kept: current, revoked: otherSessions.map((session) => session.session_id) };
}

async function main(): Promise<void> {
  const input = { user_id: process.env.PROPERTY_USER_ID ?? "tenant-42", current_session_id: process.env.CURRENT_SESSION_ID ?? "session-current" };
  const result = await signOutOtherSessions(input, new InfraiAuthClient());
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
