import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { CYCLE, ORG } from "../data/catalog";
import type { Role } from "../domain/types";
import { ROLE_LABEL } from "../domain/workflow";
import { useCci } from "../state/store";

const ROLES: Role[] = ["team", "reviewer", "chief", "ciso", "md", "auditor"];

/** The frame on every tool screen: the sample-data notice, the role switcher, the demo menu and the nav. */
export function AppFrame() {
  const { state, setRole, notice } = useCci();
  const { pathname, search } = useLocation();
  const main = useRef<HTMLElement>(null);

  // A route change is silent to a screen reader, so move focus to the new page's content.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo(0, 0);
    main.current?.focus();
  }, [pathname, search]);

  return (
    <div className="app">
      <p className="app-demo">Sample data · OCR simulated · Not a SEBI filing</p>
      <header className="app-top on-dark">
        <Link to="/app" className="grot app-brand">CCI</Link>
        <span className="app-org">{ORG} · {CYCLE} · Qualified RE</span>
        <div className="app-role">
          <label htmlFor="role-switch">Viewing as</label>
          <select id="role-switch" value={state.role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </div>
        <DemoMenu />
      </header>
      <div className="app-shell">
        <nav className="app-nav" aria-label="Tool">
          <NavLink end to="/app">Overview</NavLink>
          <NavLink to="/app/parameters">Parameters</NavLink>
          <NavLink to="/app/bu/cso" className={() => (pathname.startsWith("/app/bu") ? "active" : "")}>BU sign-off</NavLink>
          <NavLink to="/app/report">Report</NavLink>
          <NavLink to="/app/audit">Audit trail</NavLink>
          <Link to="/" className="app-nav-about">About this project</Link>
        </nav>
        <main id="main" ref={main} tabIndex={-1} className="app-main">
          <Outlet />
        </main>
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">{notice}</p>
    </div>
  );
}

/** Presenter controls. They live apart from the tool, so nobody mistakes them for product features. */
function DemoMenu() {
  const { dispatch, reset, announce } = useCci();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const close = () => { setOpen(false); setConfirming(false); setMessage(""); };

  return (
    <div className="app-menu">
      <button className="btn btn-ghost-light app-btn" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>Demo menu</button>
      {open && (
        <div className="app-menu-panel">
          <p className="small body-2">Presenter controls. Fast-forward approves and signs every BU except Cyber Security Ops, and is logged in the audit trail.</p>
          <button
            className="btn btn-line app-btn"
            onClick={() => {
              const refused = dispatch({ type: "fastForward" });
              if (refused) setMessage(refused);
              else { announce("Other business units approved and signed."); close(); }
            }}
          >
            Fast-forward other BUs
          </button>
          {confirming ? (
            <div className="app-actions">
              <button className="btn btn-danger app-btn" onClick={() => { reset(); close(); }}>Yes, reset everything</button>
              <button className="btn btn-line app-btn" onClick={() => setConfirming(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-line app-btn" onClick={() => setConfirming(true)}>Reset demo</button>
          )}
          {message && <p className="error-text" role="alert">{message}</p>}
        </div>
      )}
    </div>
  );
}
