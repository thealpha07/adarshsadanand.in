import { useState, type ReactNode } from "react";

/** Small form building blocks shared by every editor in the console. */

export function Text({ id, label, value, onChange, hint, required, type = "text" }: {
  id: string; label: string; value: string; onChange: (v: string) => void; hint?: string; required?: boolean; type?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}{required && " *"}</label>
      <input id={id} type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint && <span id={`${id}-hint`} className="hint">{hint}</span>}
    </div>
  );
}

export function Area({ id, label, value, onChange, hint, rows = 6 }: {
  id: string; label: string; value: string; onChange: (v: string) => void; hint?: string; rows?: number;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint && <span id={`${id}-hint`} className="hint">{hint}</span>}
    </div>
  );
}

export function Select<T extends string>({ id, label, value, options, onChange }: {
  id: string; label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Check({ id, label, checked, onChange, hint }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="check">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{label}{hint && <span className="hint"> {hint}</span>}</label>
    </div>
  );
}

/** Two-step delete: the first click asks, the second acts. No modal to trap focus in. */
export function ConfirmButton({ label, confirmLabel, onConfirm }: { label: string; confirmLabel: string; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <button className="btn btn-line btn-small danger-text" type="button" onClick={() => setAsking(true)}>{label}</button>;
  return (
    <span className="confirm" role="group" aria-label={confirmLabel}>
      <span className="small">{confirmLabel}</span>
      <button className="btn btn-danger btn-small" type="button" onClick={() => { setAsking(false); onConfirm(); }}>Yes, delete</button>
      <button className="btn btn-line btn-small" type="button" onClick={() => setAsking(false)} autoFocus>Keep</button>
    </span>
  );
}

export function FormActions({ children, error, saved }: { children: ReactNode; error: string | null; saved: boolean }) {
  return (
    <div className="form-actions">
      {children}
      <span aria-live="polite">
        {error && <span className="error-text">{error}</span>}
        {saved && !error && <span className="small" style={{ color: "#2e6b3f" }}>✓ Saved</span>}
      </span>
    </div>
  );
}

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

export const listToText = (l: string[]) => l.join(", ");
export const textToList = (t: string) => t.split(",").map((x) => x.trim()).filter(Boolean);
