import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { catalog } from "../data/catalog";
import { seedCycle } from "../data/seed";
import { browserStore } from "../data/storage";
import { scoreCycle, type CycleScore } from "../domain/scoring";
import type { CycleData, Role } from "../domain/types";
import { applyAction, type Action } from "../domain/workflow";

interface CciStore {
  state: CycleData;
  score: CycleScore;
  /** Returns why the action was refused, or null when it was applied. */
  dispatch: (action: Action) => string | null;
  setRole: (role: Role) => void;
  reset: () => void;
  notice: string;
  announce: (message: string) => void;
}

const Context = createContext<CciStore | null>(null);
const store = browserStore();

export function CciProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CycleData>(() => store.load() ?? seedCycle(new Date().toISOString()));
  const [notice, announce] = useState("");
  // The latest state, so two actions in one click (save, then attach) build on each other.
  const latest = useRef(state);

  const commit = useCallback((next: CycleData) => {
    latest.current = next;
    store.save(next);
    setState(next);
  }, []);

  const dispatch = useCallback((action: Action) => {
    const result = applyAction(latest.current, action, catalog, new Date().toISOString());
    if (!result.ok) return result.reason;
    commit(result.state);
    return null;
  }, [commit]);

  const setRole = useCallback((role: Role) => commit({ ...latest.current, role }), [commit]);

  const reset = useCallback(() => {
    store.clear();
    commit(seedCycle(new Date().toISOString()));
    announce("Demo reset to its starting state.");
  }, [commit]);

  const value = useMemo(
    () => ({ state, score: scoreCycle(catalog.defs, state.params, state.config), dispatch, setRole, reset, notice, announce }),
    [state, dispatch, setRole, reset, notice],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCci() {
  const value = useContext(Context);
  if (!value) throw new Error("useCci must be used inside CciProvider");
  return value;
}
