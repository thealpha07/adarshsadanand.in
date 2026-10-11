import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@site/data";

/**
 * Sign-in has two locks, matching the database rule is_admin() = admin AND aal2:
 *   1. email + password          → session at assurance level aal1
 *   2. 6-digit authenticator code → session upgraded to aal2
 * Until step 2 passes, the database refuses every read and write.
 */
type Stage =
  | { kind: "checking" }
  | { kind: "signed-out" }
  | { kind: "enroll" }
  | { kind: "verify"; factorId: string }
  | { kind: "ready"; session: Session };

export function AuthGate({ children }: { children: (session: Session, signOut: () => void) => ReactNode }) {
  const [stage, setStage] = useState<Stage>({ kind: "checking" });

  async function evaluate() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return setStage({ kind: "signed-out" });
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal2") return setStage({ kind: "ready", session });
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp.find((f) => f.status === "verified");
    setStage(totp ? { kind: "verify", factorId: totp.id } : { kind: "enroll" });
  }

  useEffect(() => {
    evaluate();
    const { data } = supabase.auth.onAuthStateChange(() => { evaluate(); });
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = () => { supabase.auth.signOut(); };

  if (stage.kind === "checking") return <Shell><p className="mono muted" role="status">Checking your session…</p></Shell>;
  if (stage.kind === "signed-out") return <Shell><PasswordStep /></Shell>;
  if (stage.kind === "enroll") return <Shell><EnrollStep onDone={evaluate} onCancel={signOut} /></Shell>;
  if (stage.kind === "verify") return <Shell><CodeStep factorId={stage.factorId} onDone={evaluate} onCancel={signOut} /></Shell>;
  return <>{children(stage.session, signOut)}</>;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="signin-screen on-dark">
      <div className="signin-grid" aria-hidden="true" />
      <p aria-hidden="true" className="grot signin-ghost">Vault</p>
      <header className="wrap signin-header">
        <span className="site-mark">Vault<sup>®</sup></span>
      </header>
      <main id="main" className="signin-main">
        <div className="signin-card">{children}</div>
      </main>
    </div>
  );
}

function PasswordStep() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    // One message for every failure, so the form never reveals which emails exist.
    if (error) setError("That email and password don't match.");
  }

  return (
    <form onSubmit={submit} className="stack-20" noValidate>
      <h1 className="grot" style={{ fontSize: 36, lineHeight: "38px" }}>Sign in</h1>
      <p className="small body-2">Private file vault and site console. Only the owner can sign in.</p>
      <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="field"><label htmlFor="pw">Password</label><input id="pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="btn btn-dark" type="submit" disabled={busy || !email || !password}>{busy ? "Checking…" : "Continue"}</button>
      <span className="mono muted">Step 1 of 2</span>
    </form>
  );
}

function CodeStep({ factorId, onDone, onCancel }: { factorId: string; onDone: () => void; onCancel: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (error) return setError("That code didn't work. Codes change every 30 seconds, so try the current one.");
    onDone();
  }

  return (
    <form onSubmit={submit} className="stack-20">
      <h1 className="grot" style={{ fontSize: 36, lineHeight: "38px" }}>Enter code</h1>
      <div className="field">
        <label htmlFor="code">6-digit code from your authenticator app</label>
        <input id="code" className="code-input" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="btn btn-dark" type="submit" disabled={busy || code.length !== 6}>{busy ? "Verifying…" : "Verify and open vault"}</button>
      <button className="btn btn-line" type="button" onClick={onCancel}>Use a different account</button>
      <span className="mono muted">Step 2 of 2</span>
    </form>
  );
}

/** First sign-in only: pair an authenticator app (Google Authenticator, 1Password, Aegis…). */
function EnrollStep({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [factor, setFactor] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Clear half-finished enrolments so a refresh never blocks a new one.
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Vault" });
      if (error) return setError(error.message);
      setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!factor) return;
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (error) return setError("That code didn't match. Check the app shows 'Vault' and try the current code.");
    onDone();
  }

  return (
    <form onSubmit={submit} className="stack-20">
      <h1 className="grot" style={{ fontSize: 32, lineHeight: "34px" }}>Set up 2-step sign-in</h1>
      <p className="small body-2">Scan this with an authenticator app. You'll be asked for a code from it every time you sign in.</p>
      {factor ? (
        <>
          <img src={factor.qr} alt="QR code for your authenticator app" width={180} height={180} style={{ background: "#fff", padding: 8 }} />
          <p className="small body-2">Can't scan? Enter this key instead: <code className="mono" style={{ wordBreak: "break-all" }}>{factor.secret}</code></p>
        </>
      ) : (
        !error && <p className="mono muted" role="status">Preparing…</p>
      )}
      <div className="field">
        <label htmlFor="code">6-digit code</label>
        <input id="code" className="code-input" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="btn btn-dark" type="submit" disabled={!factor || code.length !== 6}>Turn on and continue</button>
      <button className="btn btn-line" type="button" onClick={onCancel}>Sign out</button>
    </form>
  );
}
