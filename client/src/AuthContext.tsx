import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "./api.js";

export const LEGACY_REQUESTER_KEY = "toktickit.developmentRequesterId";
type AuthState = "loading" | "anonymous" | "authenticated" | "error";
interface AuthContextValue {
  state: AuthState;
  user: api.CurrentUser | null;
  notice: string;
  signIn(email: string, password: string): Promise<void>;
  replacePassword(current: string, next: string, confirmation: string): Promise<void>;
  signOut(): Promise<void>;
  retry(): void;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function homeFor(role: api.UserRole) {
  return role === "REQUESTER" ? "/my-tickets" : role === "IT_STAFF" ? "/staff/tickets" : "/admin/users";
}
export function navigate(path: string, replace = false) {
  if (window.location.pathname !== path) window.history[replace ? "replaceState" : "pushState"]({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>("loading");
  const [user, setUser] = useState<api.CurrentUser | null>(null);
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    localStorage.removeItem(LEGACY_REQUESTER_KEY);
    setState("loading"); setNotice("");
    try {
      const current = await api.getCurrentUser();
      await api.getCsrf();
      setUser(current); setState("authenticated");
      if (current.mustChangePassword) navigate("/change-password", true);
      else if (window.location.pathname === "/" || window.location.pathname === "/login") navigate(homeFor(current.role), true);
    } catch (error) {
      setUser(null); api.clearAuthTransport();
      if (error instanceof api.ApiError && error.status === 401) {
        setState("anonymous");
        if (!["/", "/login"].includes(window.location.pathname)) setNotice("Your session has expired. Please sign in again.");
        navigate("/login", true);
      } else setState("error");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const expired = () => {
      setUser(null); api.clearAuthTransport(); setState("anonymous");
      setNotice("Your session has expired. Please sign in again."); navigate("/login", true);
    };
    const forced = () => navigate("/change-password", true);
    window.addEventListener("toktickit:session-expired", expired);
    window.addEventListener("toktickit:password-change-required", forced);
    return () => {
      window.removeEventListener("toktickit:session-expired", expired);
      window.removeEventListener("toktickit:password-change-required", forced);
    };
  }, []);
  const value = useMemo<AuthContextValue>(() => ({
    state, user, notice,
    async signIn(email, password) {
      const current = await api.login(email, password);
      setUser(current); setState("authenticated"); setNotice("");
      if (current.mustChangePassword) navigate("/change-password", true);
      else if (window.location.pathname === "/" || window.location.pathname === "/login") navigate(homeFor(current.role), true);
    },
    async replacePassword(current, next, confirmation) {
      const updated = await api.changePassword(current, next, confirmation);
      setUser(updated); setState("authenticated"); setNotice(""); navigate(homeFor(updated.role), true);
    },
    async signOut() {
      await api.logout(); setUser(null); setState("anonymous"); setNotice("You have signed out."); navigate("/login", true);
    },
    retry() { void load(); },
  }), [load, notice, state, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
