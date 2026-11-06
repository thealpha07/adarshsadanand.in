import { useEffect } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { PageBand, SiteFooter, siteUrl } from "@site/ui";
import { credit, intro, plan, timeline, type Stage } from "./content";
import { Audit } from "./screens/Audit";
import { AppFrame } from "./screens/AppFrame";
import { Overview } from "./screens/Overview";
import { Parameters } from "./screens/Parameters";
import { Report } from "./screens/Report";
import { Signoff } from "./screens/Signoff";
import { Workspace } from "./screens/Workspace";
import { CciProvider } from "./state/store";
import "./cci.css";
import "./app.css";

/**
 * cci.adarshsadanand.in. "/" stays the project's holding page; "/app" is the tool's demo.
 * See docs/adr/0009-cci-mvp-in-the-browser.md.
 */
export function App() {
  return (
    <BrowserRouter>
      <div style={{ ["--site" as string]: "var(--amber)", ["--site-light" as string]: "#e0a84a" }}>
        <Routes>
          <Route path="/app" element={<CciProvider><AppFrame /></CciProvider>}>
            <Route index element={<Overview />} />
            <Route path="parameters" element={<Parameters />} />
            <Route path="parameters/:id" element={<Workspace />} />
            <Route path="bu" element={<Navigate to="cso" replace />} />
            <Route path="bu/:id" element={<Signoff />} />
            <Route path="report" element={<Report />} />
            <Route path="audit" element={<Audit />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>
          <Route path="*" element={<About />} />
        </Routes>
        <SiteFooter>
          <span className="mono">{credit}</span>
        </SiteFooter>
      </div>
    </BrowserRouter>
  );
}

const stageLabel: Record<Stage, string> = { done: "Done", now: "In progress", next: "Next" };

function About() {
  useEffect(() => { document.title = "Cyber Capability Index · Adarsh Sadanand"; }, []);
  return (
    <>
      <PageBand
        site="cci"
        tag="cci.adarshsadanand.in"
        title={intro.title}
        softTitle={intro.soft}
        ghost="CCI"
        longTitle
        intro={<p style={{ margin: 0 }}>{intro.line}</p>}
        actions={
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link className="btn btn-light" to="/app">Open the demo</Link>
            <a className="btn btn-ghost-light" href={siteUrl("home", "/#contact")}>Ask me about it</a>
          </div>
        }
      />
      <main id="main" className="wrap cci">
        <section className="cci-section" aria-labelledby="plan-h">
          <span className="tag">What it will do</span>
          <ol className="cci-plan">
            {plan.map((p, i) => (
              <li key={p.title} className="cci-step">
                <span className="mono muted">{String(i + 1).padStart(2, "0")}</span>
                <h2 id={i === 0 ? "plan-h" : undefined} className="grot cci-step-title">{p.title}</h2>
                <p className="body-2">{p.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="cci-section" aria-labelledby="status-h">
          <span className="tag">Where it stands</span>
          <h2 id="status-h" className="grot cci-h">Being built <span className="soft">in the open</span></h2>
          <ol className="cci-timeline">
            {timeline.map((t) => (
              <li key={t.when} className={`cci-stage is-${t.stage}`}>
                <span className="mono cci-when">{t.when}</span>
                <div className="stack">
                  <span className="cci-badge">{stageLabel[t.stage]}</span>
                  <h3 className="grot cci-stage-title">{t.title}</h3>
                  <p className="body-2">{t.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  );
}
