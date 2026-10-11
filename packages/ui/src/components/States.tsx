import type { ReactNode } from "react";

/** Every list has three states besides "full": loading, empty and failed. */

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <p className="mono muted" role="status" aria-live="polite" style={{ padding: "48px 0" }}>
      {label}…
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="card" style={{ alignItems: "flex-start", padding: 32 }}>
      <p className="body-2">{children}</p>
    </div>
  );
}

export function Failed({ message }: { message: string }) {
  return (
    <div className="card" role="alert" style={{ borderColor: "var(--danger)", padding: 32 }}>
      <p className="error-text">Something went wrong loading this page: {message}</p>
      <p className="small muted">Refresh to try again. If it keeps happening, the database may be waking up.</p>
    </div>
  );
}
