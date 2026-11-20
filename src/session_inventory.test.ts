import test from "node:test";
import assert from "node:assert/strict";
import { signOutOtherSessions } from "./session_inventory.ts";
import type { Session } from "./domain.ts";

test("keeps the current device and signs out every other active session", async () => {
  const sessions: Session[] = [
    { session_id: "session-current", user_id: "tenant-42", device_label: "office", last_seen_at: "2026-10-31T08:00:00Z" },
    { session_id: "session-phone", user_id: "tenant-42", device_label: "phone", last_seen_at: "2026-10-31T07:00:00Z" },
    { session_id: "session-tablet", user_id: "tenant-42", device_label: "tablet", last_seen_at: "2026-10-31T06:00:00Z" }
  ];
  const revoked: string[] = [];
  const auth = {
    listActiveSessions: async () => sessions,
    revokeSession: async (sessionId: string) => { revoked.push(sessionId); }
  } as never;
  const result = await signOutOtherSessions({ user_id: "tenant-42", current_session_id: "session-current" }, auth);
  assert.equal(result.kept.session_id, "session-current");
  assert.deepEqual(result.revoked, ["session-phone", "session-tablet"]);
  assert.deepEqual(revoked, ["session-phone", "session-tablet"]);
});
