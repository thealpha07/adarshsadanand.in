import { useEffect, useState } from "react";
import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@site/data";
import { AuthGate } from "./auth";
import { FilesPage } from "./files";
import { PostsPage } from "./posts";
import { BooksPage } from "./books";
import { PeoplePage } from "./people";
import "./vault.css";

export function App() {
  return (
    <BrowserRouter>
      <AuthGate>{(session, signOut) => <Console session={session} signOut={signOut} />}</AuthGate>
    </BrowserRouter>
  );
}

const sections = [
  { to: "/files", label: "Files" },
  { to: "/thoughts", label: "Thoughts" },
  { to: "/library", label: "Library" },
  { to: "/people", label: "People" },
];

function Console({ session, signOut }: { session: Session; signOut: () => void }) {
  // The database is the authority on admin rights; this only explains a refusal early.
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.rpc("is_admin").then(({ data }) => setIsAdmin(Boolean(data)));
  }, []);

  return (
    <>
      <section className="band on-dark">
        <div className="band-grid" aria-hidden="true" />
        <header className="wrap console-header">
          <span style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
            <span className="site-mark">Vault<sup>®</sup></span>
            <span className="mono" style={{ color: "var(--on-hero-soft)" }}>files.adarshsadanand.in</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span className="small" style={{ color: "var(--on-hero-soft)" }}>Signed in as {session.user.email}</span>
            <button className="btn btn-ghost-light" type="button" onClick={signOut}>Sign out</button>
          </span>
        </header>
        <nav aria-label="Console" className="wrap console-nav">
          {sections.map((s) => (
            <NavLink key={s.to} to={s.to} className="console-tab">{s.label}</NavLink>
          ))}
        </nav>
      </section>
      <main id="main" className="wrap" style={{ paddingTop: 48, paddingBottom: 96 }}>
        {isAdmin === false ? (
          <div className="card" role="alert" style={{ borderColor: "var(--danger)" }}>
            <p className="error-text">This account isn't listed as an admin, so the database will refuse every change.</p>
            <p className="small body-2">Add its user id to the <code>admins</code> table in Supabase (see docs/setup.md, step 4), then sign in again.</p>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/files" replace />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="/thoughts/*" element={<PostsPage />} />
            <Route path="/library/*" element={<BooksPage />} />
            <Route path="/people/*" element={<PeoplePage />} />
          </Routes>
        )}
      </main>
    </>
  );
}
