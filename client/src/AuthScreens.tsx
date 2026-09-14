import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { ApiError } from "./api.js";
import { homeFor, navigate, useAuth } from "./AuthContext.js";

function PasswordToggle({ shown, toggle, target }: { shown: boolean; toggle(): void; target: string }) {
  return <button className="password-toggle" type="button" onClick={toggle} aria-controls={target}
    aria-label={`${shown ? "Hide" : "Show"} password`}>{shown ? "Hide" : "Show"}</button>;
}
function Field({ id, label, type = "text", value, setValue, error, autoComplete, shown, toggle }: {
  id: string; label: string; type?: string; value: string; setValue(value: string): void;
  error?: string; autoComplete?: string; shown?: boolean; toggle?(): void;
}) {
  const errorId = `${id}-error`;
  return <div className="auth-field">
    <label htmlFor={id}>{label} <span aria-hidden="true" className="required-marker">*</span></label>
    <div className={type === "password" ? "password-field" : undefined}>
      <input id={id} className={`zen-field ${error ? "zen-field--invalid" : ""}`}
        type={type === "password" && shown ? "text" : type} value={value} required
        autoComplete={autoComplete} aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined} onChange={event => setValue(event.target.value)} />
      {type === "password" && toggle && <PasswordToggle shown={Boolean(shown)} toggle={toggle} target={id} />}
    </div>
    {error && <p id={errorId} className="field-error">{error}</p>}
  </div>;
}

export function LoginScreen() {
  const { signIn, notice } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false); const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({}); const [failure, setFailure] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setFailure("");
    const next: Record<string, string> = {};
    const normalized = email.trim();
    if (!normalized) next.email = "Email is required.";
    else if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if ([...password].length > 128 || new TextEncoder().encode(password).length > 512) next.password = "Password is too long.";
    setErrors(next); if (Object.keys(next).length) return;
    setBusy(true);
    try { await signIn(normalized, password); }
    catch (error) {
      setPassword("");
      if (error instanceof ApiError && error.status === 400 && Object.keys(error.fieldErrors).length) setErrors(error.fieldErrors);
      else if (error instanceof ApiError && error.status === 429) setFailure(`Too many attempts. Try again in ${error.retryAfter || 1} seconds.`);
      else if (error instanceof ApiError && error.status === 401) setFailure("Unable to sign in. Check your credentials or contact your administrator.");
      else setFailure("We could not reach TokTickIT. Check your connection and retry.");
    } finally { setBusy(false); }
  }
  return <main className="auth-page" id="main-content">
    <section className="auth-card" aria-labelledby="login-title">
      <p className="eyebrow">IT Service Desk</p><h1>TokTickIT</h1>
      <h2 id="login-title">Sign in</h2>
      <p className="text-secondary">Use the account and initial password provided by your administrator.</p>
      {notice && <p className="notice" role="status">{notice}</p>}
      {failure && <div className="alert alert-danger" role="alert">{failure} <button type="button" className="btn btn-link" onClick={() => setFailure("")}>Retry</button></div>}
      {Object.keys(errors).length > 0 && <div className="error-summary" role="alert">Please correct the highlighted fields.</div>}
      <form noValidate onSubmit={submit} aria-busy={busy}>
        <Field id="login-email" label="Email" type="email" value={email} setValue={setEmail} error={errors.email} autoComplete="username" />
        <Field id="login-password" label="Password" type="password" value={password} setValue={setPassword} error={errors.password}
          autoComplete="current-password" shown={shown} toggle={() => setShown(value => !value)} />
        <button className="zen-button zen-button--primary auth-submit" type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
      </form>
    </section>
  </main>;
}

export function ChangePasswordScreen() {
  const { user, replacePassword, signOut } = useAuth();
  const mandatory = Boolean(user?.mustChangePassword);
  const [current, setCurrent] = useState(""); const [next, setNext] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [shown, setShown] = useState<Record<string, boolean>>({}); const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({}); const [failure, setFailure] = useState("");
  const [logoutBusy, setLogoutBusy] = useState(false); const [logoutFailure, setLogoutFailure] = useState("");
  useEffect(() => () => { setCurrent(""); setNext(""); setConfirmation(""); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setFailure(""); const found: Record<string, string> = {};
    if (!current) found.currentPassword = "Current password is required.";
    const points = [...next].length; const bytes = new TextEncoder().encode(next).length;
    if (points < 12 || points > 128 || bytes > 512 || !/\S/u.test(next)) found.newPassword = "Use 12-128 characters, at most 512 bytes, with non-whitespace text.";
    else if (next === current) found.newPassword = "Choose a password different from your current password.";
    if (confirmation !== next) found.confirmPassword = "Passwords do not match.";
    setErrors(found); if (Object.keys(found).length) return;
    setBusy(true);
    try { await replacePassword(current, next, confirmation); setCurrent(""); setNext(""); setConfirmation(""); }
    catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) setErrors(error.fieldErrors);
      else setFailure("We could not change your password. Your account remains protected; please retry.");
    } finally { setBusy(false); }
  }
  async function logoutFromMandatory() {
    setLogoutBusy(true); setLogoutFailure("");
    try { await signOut(); }
    catch { setLogoutFailure("Logout could not be completed. Your session may still be active."); }
    finally { setLogoutBusy(false); }
  }
  const toggle = (key: string) => setShown(value => ({ ...value, [key]: !value[key] }));
  return <main className="auth-page" id="main-content">
    <section className="auth-card" aria-labelledby="password-title">
      <p className="eyebrow">Signed in as {user?.displayName}</p>
      <h1 id="password-title">{mandatory ? "Create your new password" : "Change password"}</h1>
      {mandatory && <p className="warning-message">You must replace your initial password before using TokTickIT.</p>}
      <p className="text-secondary">Use 12-128 characters, no more than 512 UTF-8 bytes, and include non-whitespace text. Passwords are not trimmed.</p>
      {failure && <div className="alert alert-danger" role="alert">{failure}</div>}
      {logoutFailure && <div className="alert alert-danger" role="alert">{logoutFailure}</div>}
      {Object.keys(errors).length > 0 && <div className="error-summary" role="alert">Please correct the highlighted fields.</div>}
      <form noValidate onSubmit={submit} aria-busy={busy}>
        <Field id="current-password" label="Current password" type="password" value={current} setValue={setCurrent} error={errors.currentPassword}
          autoComplete="current-password" shown={shown.current} toggle={() => toggle("current")} />
        <Field id="new-password" label="New password" type="password" value={next} setValue={setNext} error={errors.newPassword}
          autoComplete="new-password" shown={shown.next} toggle={() => toggle("next")} />
        <Field id="confirm-password" label="Confirm new password" type="password" value={confirmation} setValue={setConfirmation} error={errors.confirmPassword}
          autoComplete="new-password" shown={shown.confirmation} toggle={() => toggle("confirmation")} />
        <div className="auth-actions">
          {mandatory && <button type="button" className="zen-button zen-button--secondary" disabled={busy || logoutBusy} onClick={() => void logoutFromMandatory()}>{logoutBusy ? "Signing out..." : "Logout"}</button>}
          {!mandatory && <button type="button" className="zen-button zen-button--secondary" disabled={busy} onClick={() => navigate(homeFor(user!.role))}>Cancel</button>}
          <button type="submit" className="zen-button zen-button--primary" disabled={busy || logoutBusy}>{busy ? "Saving..." : "Save new password"}</button>
        </div>
      </form>
    </section>
  </main>;
}

export function ApplicationShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth(); const [busy, setBusy] = useState(false); const [failure, setFailure] = useState("");
  const logoutButton = useRef<HTMLButtonElement>(null);
  async function submitLogout() {
    setBusy(true); setFailure("");
    try { await signOut(); }
    catch { setFailure("Logout could not be completed. Your session may still be active."); setBusy(false); logoutButton.current?.focus(); }
  }
  if (!user) return null;
  const role = user.role === "IT_STAFF" ? "IT Staff" : user.role === "ADMIN" ? "Administrator" : "Requester";
  return <>
    <header className="app-header">
      <div><strong>TokTickIT</strong><span> IT Service Desk</span></div>
      <div className="identity-panel"><span><strong>{user.displayName}</strong></span><span className="zen-badge">{role}</span>
        <button className="btn btn-sm btn-outline-success" onClick={() => navigate("/change-password")}>Change Password</button>
        <button ref={logoutButton} className="btn btn-sm btn-outline-danger" disabled={busy} aria-busy={busy} onClick={() => void submitLogout()}>{busy ? "Signing out..." : "Logout"}</button>
      </div>
    </header>
    {failure && <div className="shell-alert alert alert-danger" role="alert">{failure} <button className="btn btn-link" onClick={() => void submitLogout()}>Retry</button></div>}
    {children}
  </>;
}

export function SessionLoading() {
  return <main className="auth-page" id="main-content"><section className="auth-card" aria-live="polite" aria-busy="true">
    <p className="eyebrow">TokTickIT</p><h1>Checking your session</h1><p role="status">Loading your secure workspace...</p>
  </section></main>;
}
export function SessionFailure() {
  const { retry } = useAuth();
  return <main className="auth-page" id="main-content"><section className="auth-card">
    <p className="eyebrow">TokTickIT</p><h1>Unable to check your session</h1>
    <div className="alert alert-danger" role="alert">We could not reach TokTickIT. No private workspace has been displayed.</div>
    <button className="zen-button zen-button--primary" onClick={retry}>Retry</button>
  </section></main>;
}
