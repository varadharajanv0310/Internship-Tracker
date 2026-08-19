"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { RoleState, StateMap } from "@/lib/types";

const LOCAL_KEY = "internship-radar:state:v1";

type Mode = "loading" | "kv" | "local";

interface Ctx {
  state: StateMap;
  mode: Mode;
  toggleBookmark: (id: string) => void;
  toggleApplied: (id: string) => void;
}

const StateCtx = createContext<Ctx | null>(null);

function stamp(prev: RoleState, patch: Partial<RoleState>): RoleState {
  const next: RoleState = { ...prev, ...patch };
  if (patch.applied === true && !prev.applied) {
    next.appliedAt = new Date().toISOString().slice(0, 10);
  }
  if (patch.applied === false) next.appliedAt = null;
  return next;
}

export function StateProvider({
  seed,
  children,
}: {
  seed: StateMap;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<StateMap>(seed);
  const [mode, setMode] = useState<Mode>("loading");

  // Resolve where state lives: KV if the server has it configured, else
  // this browser's localStorage seeded from the committed snapshot.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        const data = (await res.json()) as { kv: boolean; state: StateMap };
        if (cancelled) return;
        if (data.kv) {
          setState(data.state ?? {});
          setMode("kv");
          return;
        }
      } catch {
        // fall through to local
      }
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        setState(raw ? { ...seed, ...(JSON.parse(raw) as StateMap) } : seed);
      } catch {
        setState(seed);
      }
      setMode("local");
    })();
    return () => {
      cancelled = true;
    };
    // `seed` is server-rendered and stable for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(
    (id: string, patch: Partial<RoleState>, next: StateMap) => {
      if (mode === "kv") {
        void fetch("/api/state", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, patch }),
        }).catch(() => {});
        return;
      }
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      } catch {
        // Private mode / quota — the in-memory state still works this session.
      }
    },
    [mode],
  );

  const apply = useCallback(
    (id: string, patch: Partial<RoleState>) => {
      setState((prev) => {
        const entry = stamp(prev[id] ?? {}, patch);
        const next = { ...prev, [id]: entry };
        if (!entry.applied && !entry.bookmarked) delete next[id];
        persist(id, patch, next);
        return next;
      });
    },
    [persist],
  );

  const value = useMemo<Ctx>(
    () => ({
      state,
      mode,
      toggleBookmark: (id) => apply(id, { bookmarked: !state[id]?.bookmarked }),
      toggleApplied: (id) => apply(id, { applied: !state[id]?.applied }),
    }),
    [state, mode, apply],
  );

  return <StateCtx.Provider value={value}>{children}</StateCtx.Provider>;
}

export function useRoleState(): Ctx {
  const ctx = useContext(StateCtx);
  if (!ctx) throw new Error("useRoleState must be used inside <StateProvider>");
  return ctx;
}
