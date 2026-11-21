import type { Chapter } from "../utils/html";
import type { Constraints } from "./constraints";
import type { Transcript } from "./transcript";

export interface GenerationSession {
  id: string;
  transcript: Transcript;
  article: string;
  constraints: Constraints;
  chapters: Chapter[];
  createdAt: number;
}

const memorySessions = new Map<string, GenerationSession>();

const sessionKey = (id: string): string => `article:${id}`;

/** Persist a generation context in KV when bound, otherwise in this isolate. */
export const saveSession = async (
  kv: KVNamespace | undefined,
  session: GenerationSession,
): Promise<void> => {
  if (kv) {
    await kv.put(sessionKey(session.id), JSON.stringify(session));
    return;
  }
  memorySessions.set(session.id, session);
};

/** Read a generation context; the client never sends the article back. */
export const getSession = async (
  kv: KVNamespace | undefined,
  id: string,
): Promise<GenerationSession | null> => {
  if (kv) {
    const raw = await kv.get(sessionKey(id));
    return raw ? (JSON.parse(raw) as GenerationSession) : null;
  }
  return memorySessions.get(id) ?? null;
};

/** Test-only cleanup for the in-memory fallback. */
export const clearSessions = (): void => memorySessions.clear();
