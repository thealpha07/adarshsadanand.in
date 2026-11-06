import { useEffect, type ReactNode } from "react";
import type { ParamState } from "../domain/types";
import { STATE_LABEL } from "../domain/workflow";

export function usePageTitle(title: string) {
  useEffect(() => { document.title = `${title} · CCI demo`; }, [title]);
}

const DONE: ParamState[] = ["approved", "locked"];
const ATTENTION: ParamState[] = ["review", "returned"];

export function StateBadge({ state }: { state: ParamState }) {
  const tone = DONE.includes(state) ? "is-ok" : ATTENTION.includes(state) ? "is-wait" : "";
  return <span className={`app-badge ${tone}`}>{STATE_LABEL[state]}</span>;
}

export function Badge({ tone = "", children }: { tone?: "" | "is-ok" | "is-wait"; children: ReactNode }) {
  return <span className={`app-badge ${tone}`}>{children}</span>;
}

export function PageHead({ tag, title, side }: { tag: string; title: string; side?: ReactNode }) {
  return (
    <div className="app-head">
      <div className="app-stack-sm">
        <span className="tag">{tag}</span>
        <h1 className="grot app-h1">{title}</h1>
      </div>
      {side}
    </div>
  );
}

/** Wide tables scroll inside this box, so the page itself never scrolls sideways on a phone. */
export function TableBox({ label, children }: { label: string; children: ReactNode }) {
  return <div className="app-scroll" role="region" aria-label={label} tabIndex={0}>{children}</div>;
}

export function Bar({ percent }: { percent: number }) {
  return <div className="app-bar" aria-hidden="true"><span style={{ width: `${Math.min(percent, 100)}%` }} /></div>;
}

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
