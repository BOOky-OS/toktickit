import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DevelopmentRequester, getDevelopmentRequesters } from "./api.js";

export const REQUESTER_STORAGE_KEY = "toktickit.developmentRequesterId";
type LoadState = "loading" | "ready" | "empty" | "error";

interface RequesterContextValue {
  requesters: DevelopmentRequester[];
  currentRequester: DevelopmentRequester | null;
  state: LoadState;
  selectRequester: (id: number) => void;
  changeRequester: () => void;
  retry: () => void;
}

const RequesterContext = createContext<RequesterContextValue | undefined>(undefined);

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [requesters, setRequesters] = useState<DevelopmentRequester[]>([]);
  const [currentRequester, setCurrentRequester] = useState<DevelopmentRequester | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const activeRequesters = await getDevelopmentRequesters();
      setRequesters(activeRequesters);
      const storedId = Number(localStorage.getItem(REQUESTER_STORAGE_KEY));
      const retained = activeRequesters.find((requester) => requester.id === storedId) ?? null;
      setCurrentRequester(retained);
      if (!retained) localStorage.removeItem(REQUESTER_STORAGE_KEY);
      setState(activeRequesters.length > 0 ? "ready" : "empty");
    } catch {
      setRequesters([]);
      setCurrentRequester(null);
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<RequesterContextValue>(() => ({
    requesters,
    currentRequester,
    state,
    selectRequester(id) {
      const requester = requesters.find((item) => item.id === id);
      if (!requester) return;
      localStorage.setItem(REQUESTER_STORAGE_KEY, String(requester.id));
      setCurrentRequester(requester);
    },
    changeRequester() {
      localStorage.removeItem(REQUESTER_STORAGE_KEY);
      setCurrentRequester(null);
      void load();
    },
    retry() {
      void load();
    },
  }), [currentRequester, load, requesters, state]);

  return <RequesterContext.Provider value={value}>{children}</RequesterContext.Provider>;
}

export function useRequester() {
  const context = useContext(RequesterContext);
  if (!context) throw new Error("useRequester must be used inside RequesterProvider");
  return context;
}
