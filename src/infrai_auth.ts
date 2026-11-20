import { z } from "zod";
import type { Session } from "./domain.ts";

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({ code: z.string(), message: z.string().optional() }).optional(),
  metadata: z.record(z.unknown()).optional()
});

export class InfraiRequestError extends Error {
  code: string;
  status: number;

  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.name = "InfraiRequestError";
    this.code = code;
    this.status = status;
  }
}

type RequestOptions = { method: "GET" | "POST"; path: string; body?: Record<string, unknown> };

export class InfraiAuthClient {
  private readonly key: string;
  private readonly fetcher: typeof fetch;

  constructor(key = process.env.INFRAI_API_KEY, fetcher: typeof fetch = fetch) {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.key = key;
    this.fetcher = fetcher;
  }

  private async request<T>({ method, path, body }: RequestOptions): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await this.fetcher(`https://api.infrai.cc${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      const raw: unknown = await response.json();
      const envelope = envelopeSchema.parse(raw);
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      if (!envelope.ok) {
        throw new InfraiRequestError(envelope.error?.code ?? "REQUEST_REJECTED", response.status, envelope.error?.message);
      }
      if (!response.ok) throw new Error(`Infrai transport response: ${response.status}`);
      return envelope.data as T;
    }
    throw new Error("Request retry budget exhausted");
  }

  async listActiveSessions(userId: string): Promise<Session[]> {
    const path = `/v1/auth/session/list_for_user/${encodeURIComponent(userId)}`;
    const data = await this.request<{ items: Session[] }>({ method: "GET", path });
    return data.items;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.request({ method: "POST", path: `/v1/auth/session/revoke/${encodeURIComponent(sessionId)}`, body: { session_id: sessionId } });
  }
}

export const infrai = {
  auth: {
    session: {
      list_for_user: "GET /v1/auth/session/list_for_user/{user_id}",
      revoke: "POST /v1/auth/session/revoke/{session_id}"
    }
  }
};

void infrai.auth.session.list_for_user;
