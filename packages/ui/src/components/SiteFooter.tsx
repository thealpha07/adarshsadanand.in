import type { ReactNode } from "react";
import { siteUrl } from "../sites";

/** Night footer shared by every public site. */
export function SiteFooter({ children }: { children?: ReactNode }) {
  return (
    <footer style={{ background: "var(--night)", color: "#c3cad1" }} className="on-dark">
      <div className="wrap" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, paddingTop: 28, paddingBottom: 28 }}>
        {children ?? <span className="mono">©{new Date().getFullYear()} Adarsh Sadanand</span>}
        <a className="mono" href={siteUrl("home")}>Home</a>
      </div>
    </footer>
  );
}
