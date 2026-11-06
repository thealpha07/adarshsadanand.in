import type { CycleData } from "../domain/types";
import { DATA_VERSION } from "./seed";

/**
 * The storage port. Today it is the browser; later a backend adapter takes its place and
 * nothing above this interface has to change. Like a travel plug: same laptop, different socket.
 */
export interface CycleStore {
  load(): CycleData | null;
  save(state: CycleData): void;
  clear(): void;
}

const KEY = "cci-mvp-cycle";

/** Browser storage, falling back to memory when it is blocked, so a demo never breaks on it. */
export function browserStore(): CycleStore {
  let memory: CycleData | null = null;
  return {
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as CycleData;
          if (parsed.version === DATA_VERSION) return parsed;
        }
      } catch { /* blocked or corrupt: start from memory or the seed */ }
      return memory;
    },
    save(state) {
      memory = state;
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* memory still holds it */ }
    },
    clear() {
      memory = null;
      try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }
    },
  };
}
