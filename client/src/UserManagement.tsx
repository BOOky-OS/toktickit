import { FormEvent, useEffect, useRef, useState } from "react";
import { AdminUser, ApiError, createUser, editUser, getAdminUser, getUsers, resetInitialPassword, UserRole } from "./api.js";
import "./user-management.css";
const empty = { displayName: "", email: "", role: "REQUESTER" as UserRole, isActive: true };
const roleLabel = (role: string) => role === "IT_STAFF" ? "IT Staff" : role === "ADMIN" ? "Admin" : "Requester";
const safety: Record<string, string> = {
  SELF_DEACTIVATION: "You cannot deactivate your own account.", LAST_ACTIVE_ADMIN: "Keep at least one active Administrator.",
  ACTIVE_ASSIGNMENTS: "Reassign this user's nonterminal Tickets before deactivation or removal of staff responsibility.",
  DUPLICATE_EMAIL: "That email is already in use, including inactive accounts.",
};
export function UserManagement({ actorId }: { actorId: number }) {
  const [users, setUsers] = useState<AdminUser[]>([]), [loading, setLoading] = useState(true), [listError, setListError] = useState(false);
  const [search, setSearch] = useState(""), [role, setRole] = useState("");
  const [query, setQuery] = useState({ search: "", role: "" }), [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<AdminUser | null>(null), [mode, setMode] = useState<"none" | "create" | "edit">("none");
  const [draft, setDraft] = useState(empty), [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false), [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dialog = useRef<HTMLDialogElement>(null), resetButton = useRef<HTMLButtonElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const lastAdmin = selected?.role === "ADMIN" && selected.isActive && users.filter(u => u.role === "ADMIN" && u.isActive).length === 1 && !query.role && !query.search;
  useEffect(() => {
    let live = true; setLoading(true); setListError(false);
    void getUsers(query.search.trim() || undefined, query.role as UserRole || undefined)
      .then(result => { if (live) setUsers(result.items); }).catch(() => { if (live) setListError(true); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [query, retry]);
  useEffect(() => { if (mode !== "none") nameInput.current?.focus(); }, [mode, selected?.id]);
  function open(user: AdminUser | null) {
    setSelected(user); setMode(user ? "edit" : "create");
    setDraft(user ? { displayName: user.displayName, email: user.email, role: user.role, isActive: user.isActive } : empty);
    setPassword(""); setErrors({}); setMessage(""); setBlocked(false);
  }
  function expireIfSelf(user: AdminUser, reset: boolean) {
    if (selected?.id === actorId && (reset || user.email !== selected.email || user.role !== selected.role || user.isActive !== selected.isActive)) {
      window.dispatchEvent(new Event("toktickit:session-expired")); return true;
    }
    return false;
  }
  async function save(reset = false) {
    if (busy || blocked) return;
    const fields: Record<string, string> = {};
    if (!reset) {
      if (draft.displayName.trim().length < 2 || draft.displayName.trim().length > 120) fields.displayName = "Use 2–120 characters.";
      if (!/^[^\s@]+@[^\s@.][^\s@]*\.[^\s@.]+$/.test(draft.email.trim()) || draft.email.trim().length > 254) fields.email = "Enter a valid email address.";
    }
    if ((reset || mode === "create") && ([...password].length < 12 || [...password].length > 128 || new TextEncoder().encode(password).length > 512 || !/\S/u.test(password))) fields.initialPassword = "Use 12–128 Unicode characters and non-whitespace text.";
    setErrors(fields); if (Object.keys(fields).length) { dialog.current?.close(); setMessage("Check the highlighted fields."); return; }
    setBusy(true); setMessage("");
    try {
      const user = reset && selected ? await resetInitialPassword(selected.id, selected.version, password)
        : selected ? await editUser(selected.id, { ...draft, version: selected.version }) : await createUser({ ...draft, initialPassword: password });
      setPassword(""); dialog.current?.close();
      if (expireIfSelf(user, reset)) return;
      setSelected(user); setMode("edit"); setDraft({ displayName: user.displayName, email: user.email, role: user.role, isActive: user.isActive });
      setMessage(reset ? "Initial password replaced. The user must change it at next login." : "User saved."); setRetry(v => v + 1);
    } catch (error) {
      setPassword(""); dialog.current?.close();
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        if (error.code === "STALE_VERSION") { setBlocked(true); setMessage("User changed. Your non-password draft is retained. Reload and review before saving."); }
        else if (safety[error.code]) setMessage(safety[error.code]);
        else if (error.status < 500) setMessage(error.status === 403 ? "Your account cannot manage users." : error.status === 404 ? "User is unavailable." : "Check the highlighted fields and enter the initial password again if needed.");
        else { setBlocked(true); setMessage("The operation may have completed. Reload and review before retrying. Password input was cleared."); }
      } else { setBlocked(true); setMessage("The operation may have completed. Reload and review before retrying. Password input was cleared."); }
    } finally { setBusy(false); }
  }
  async function reload() {
    setBusy(true);
    try {
      if (selected) setSelected(await getAdminUser(selected.id));
      else { const result = await getUsers(draft.email.trim() || undefined); setUsers(result.items); }
      setBlocked(false); setPassword(""); setRetry(v => v + 1); setMessage("Latest data loaded. Review existing users and your retained draft before saving.");
    } catch { setMessage("Unable to reload. Your non-password draft is retained."); }
    finally { setBusy(false); }
  }
  function apply(e: FormEvent) { e.preventDefault(); setQuery({ search, role }); }
  return <main className="page-content" id="main-content"><section className="ticket-card">
    <h1>User Management</h1><p>Manage user access and initial passwords.</p>
    <form className="filter-card" onSubmit={apply}><div className="filter-grid">
      <div><label htmlFor="users-search">Search name or email</label><input className="zen-field" id="users-search" maxLength={120} value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div><label htmlFor="users-role">Filter by role</label><select className="zen-field" id="users-role" value={role} onChange={e => setRole(e.target.value)}><option value="">All roles</option>{["REQUESTER", "IT_STAFF", "ADMIN"].map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}</select></div>
    </div><button className="zen-button zen-button--primary">Apply filters</button><button type="button" className="zen-button zen-button--secondary" onClick={() => { setSearch(""); setRole(""); setQuery({ search: "", role: "" }); }}>Clear filters</button></form>
    <button className="zen-button zen-button--primary" disabled={busy} onClick={() => open(null)}>Create user</button>
    <div className="users-workspace"><section aria-label="User list">
      {loading ? <p role="status">Loading users...</p> : listError ? <p role="alert">Unable to load users. <button onClick={() => setRetry(v => v + 1)}>Retry users</button></p>
        : !users.length ? <p>{query.search || query.role ? "No matching users." : "No users yet."}</p> : <ul className="users-list">{users.map(user => <li key={user.id}>
          <dl><div><dt>Name</dt><dd>{user.displayName}</dd></div><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Role</dt><dd>{roleLabel(user.role)}</dd></div><div><dt>Status</dt><dd>{user.isActive ? "Active" : "Inactive"}</dd></div><div><dt>Password change</dt><dd>{user.mustChangePassword ? "Required at next login" : "Completed"}</dd></div></dl>
          <button className="zen-button zen-button--secondary" disabled={busy} onClick={() => open(user)} aria-label={`Edit ${user.displayName}`}>Edit</button>
        </li>)}</ul>}
    </section>
    {mode !== "none" && <section aria-labelledby="user-editor-heading"><h2 id="user-editor-heading">{mode === "create" ? "Create user" : `Edit ${selected?.displayName}`}</h2>
      {message && <p role="status">{message}</p>}
      {blocked && <button disabled={busy} onClick={() => void reload()}>Reload users</button>}
      {selected && <p>Current account: {selected.email}, {roleLabel(selected.role)}, {selected.isActive ? "Active" : "Inactive"}.</p>}
      <form noValidate onSubmit={e => { e.preventDefault(); void save(); }}><fieldset disabled={busy || blocked} aria-busy={busy}>
        <label htmlFor="user-name">Display name *</label><input ref={nameInput} id="user-name" className="zen-field" value={draft.displayName} onChange={e => setDraft(v => ({ ...v, displayName: e.target.value }))} maxLength={120} required aria-invalid={!!errors.displayName} />{errors.displayName && <p role="alert">{errors.displayName}</p>}
        <label htmlFor="user-email">Email *</label><input id="user-email" className="zen-field" type="email" value={draft.email} onChange={e => setDraft(v => ({ ...v, email: e.target.value }))} maxLength={254} required aria-invalid={!!errors.email} />{errors.email && <p role="alert">{errors.email}</p>}
        <label htmlFor="user-role">Role *</label><select id="user-role" className="zen-field" value={draft.role} onChange={e => setDraft(v => ({ ...v, role: e.target.value as UserRole }))} disabled={!!lastAdmin}>{["REQUESTER", "IT_STAFF", "ADMIN"].map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}</select>
        <label><input type="checkbox" checked={draft.isActive} onChange={e => setDraft(v => ({ ...v, isActive: e.target.checked }))} disabled={selected?.id === actorId || !!lastAdmin} /> Active account</label>
        {selected?.id === actorId && <p>You cannot deactivate your own account. Changing your email, role or initial password will require signing in again.</p>}
        {lastAdmin && <p>At least one active Administrator must remain.</p>}
        {mode === "create" && <><label htmlFor="user-password">Initial password *</label><input id="user-password" required type="password" className="zen-field" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy || blocked} aria-invalid={!!errors.initialPassword} />
      <p>12–128 Unicode characters. The user must change this password at next login. Share it through the agreed local handoff.</p>{errors.initialPassword && <p role="alert">{errors.initialPassword}</p>}</>}
        <button className="zen-button zen-button--primary">{busy ? "Saving..." : mode === "create" ? "Save new user" : "Save user changes"}</button>
      </fieldset></form>
      {mode === "edit" && <><label htmlFor="user-password">New initial password</label><input id="user-password" type="password" className="zen-field" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy || blocked} aria-invalid={!!errors.initialPassword} />
      <p>12–128 Unicode characters. The user must change this password at next login. Share it through the agreed local handoff.</p>{errors.initialPassword && <p role="alert">{errors.initialPassword}</p>}</>}
      {selected && <button ref={resetButton} className="zen-button zen-button--secondary" disabled={busy || blocked} onClick={() => dialog.current?.showModal()}>Set new initial password</button>}
      <button className="zen-button zen-button--secondary" disabled={busy} onClick={() => { setMode("none"); setPassword(""); }}>Cancel editing</button>
      <dialog ref={dialog} aria-labelledby="password-confirm-title" onCancel={e => { if (busy) e.preventDefault(); }} style={{ maxWidth: "min(32rem,90vw)", borderRadius: "1rem" }}>
        <h2 id="password-confirm-title">Confirm initial password reset</h2><p>Replace the initial password for {selected?.displayName}? Existing sessions will be revoked and a password change will be required at next login.</p>
        <button disabled={busy} onClick={() => { dialog.current?.close(); resetButton.current?.focus(); }}>Cancel</button><button disabled={busy} onClick={() => void save(true)}>{busy ? "Saving..." : "Confirm reset"}</button>
      </dialog>
    </section>}
    </div>
  </section></main>;
}
