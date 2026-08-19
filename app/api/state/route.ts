import { NextResponse } from "next/server";
import type { RoleState, StateMap } from "@/lib/types";
import { isKvConfigured, mergeState, readKvState, writeKvState } from "@/lib/state";

export const dynamic = "force-dynamic";

/**
 * GET  -> { kv, state }  ... kv=false tells the client to use localStorage.
 * POST -> { id, patch }  ... merged server-side so appliedAt is stamped once.
 */
export async function GET() {
  if (!isKvConfigured()) {
    return NextResponse.json({ kv: false, state: {} as StateMap });
  }
  try {
    const state = (await readKvState()) ?? {};
    return NextResponse.json({ kv: true, state });
  } catch (err) {
    return NextResponse.json(
      { kv: false, state: {} as StateMap, error: err instanceof Error ? err.message : "KV read failed" },
      { status: 200 },
    );
  }
}

export async function POST(request: Request) {
  if (!isKvConfigured()) {
    return NextResponse.json(
      { ok: false, kv: false, message: "No KV store configured; state stays in the browser." },
      { status: 200 },
    );
  }

  let body: { id?: string; patch?: Partial<RoleState> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const { id, patch } = body;
  if (!id || typeof id !== "string" || !patch || typeof patch !== "object") {
    return NextResponse.json({ ok: false, message: "Expected { id, patch }" }, { status: 400 });
  }

  try {
    const current = (await readKvState()) ?? {};
    const next = mergeState(current, id, patch);
    await writeKvState(next);
    return NextResponse.json({ ok: true, kv: true, state: next });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "KV write failed" },
      { status: 500 },
    );
  }
}
