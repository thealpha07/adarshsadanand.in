import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import type { SiteKey } from "../sites";

interface Props {
  site: SiteKey;
  /** Small mono label above the title, usually the subdomain. */
  tag: string;
  title: string;
  /** Optional second phrase of the title, shown in the softer tone. */
  softTitle?: string;
  intro?: ReactNode;
  /** Huge decorative word behind the title. Hidden from screen readers. */
  ghost?: string;
  actions?: ReactNode;
  /** Content above the title, such as a back link. */
  before?: ReactNode;
}

/** The midnight band that opens every subpage: header, ghost word, title. */
export function PageBand({ site, tag, title, softTitle, intro, ghost, actions, before }: Props) {
  return (
    <section className="band on-dark">
      <div className="band-grid" aria-hidden="true" />
      <SiteHeader current={site} />
      <div className="wrap" style={{ position: "relative", paddingTop: 40, paddingBottom: 56, display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 32 }}>
        {ghost && <p aria-hidden="true" className="grot ghost">{ghost}</p>}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 20, maxWidth: "62ch" }}>
          {before}
          <span className="tag">{tag}</span>
          <h1 className="grot" style={{ fontSize: "clamp(56px, 9vw, 128px)", lineHeight: 0.88, color: "#fff" }}>
            {title}
            {softTitle && <> <span className="soft">{softTitle}</span></>}
          </h1>
          {intro && <div className="body-lg" style={{ color: "var(--on-hero-soft)" }}>{intro}</div>}
        </div>
        {actions && <div style={{ position: "relative" }}>{actions}</div>}
      </div>
    </section>
  );
}
