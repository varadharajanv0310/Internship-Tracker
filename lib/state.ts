import { Redis } from "@upstash/redis";
import type { StateMap } from "./types";

export const STATE_KEY = "internship-radar:state:v1";

/**
 * Accepts either Vercel KV or plain Upstash env var names, so the app works
 * whether the store was created through the Vercel Marketplace or directly.
 */
export function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function isKvConfigured(): boolean {
  return getRedis() !== null;
}

export async function readKvState(): Promise<StateMap | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get<StateMap>(STATE_KEY);
  return raw ?? {};
}

export async function writeKvState(state: StateMap): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  await redis.set(STATE_KEY, state);
  return true;
}

/** Merge a patch into the stored map, auto-stamping the applied date. */
export function mergeState(current: StateMap, id: string, patch: Partial<StateMap[string]>): StateMap {
  const prev = current[id] ?? {};
  const next = { ...prev, ...patch };

  if (patch.applied === true && !prev.applied) {
    next.appliedAt = new Date().toISOString().slice(0, 10);
  }
  if (patch.applied === false) {
    next.appliedAt = null;
  }

  // Drop entries that carry no signal, so the store stays small.
  if (!next.applied && !next.bookmarked) {
    const { [id]: _removed, ...rest } = current;
    return rest;
  }
  return { ...current, [id]: next };
}
