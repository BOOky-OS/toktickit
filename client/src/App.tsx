import { FormEvent, useState } from "react";
import { checkSystem, Category } from "./api.js";
import { RequesterProvider, useRequester } from "./RequesterContext.js";
import "./theme.css";

type UiState = "idle" | "loading" | "success" | "error";

function RequesterSelection() {
  const { requesters, state, selectRequester, retry } = useRequester();
  const [selectedId, setSelectedId] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (selectedId) selectRequester(Number(selectedId));
  }

  return (
    <main className="requester-page">
      <section className="requester-card" aria-labelledby="requester-title">
        <p className="eyebrow">TokTickIT development environment</p>
        <h1 id="requester-title">Choose a Development Requester</h1>
        <p className="text-secondary">
          This selection is for testing only. It is not a login screen and does not authenticate you.
        </p>

        {state === "loading" && (
          <p className="notice" role="status">Loading development requesters...</p>
        )}
        {state === "empty" && (
          <div className="notice" role="status">
            <p>No active development requesters are available.</p>
            <button className="btn btn-outline-success" type="button" onClick={retry}>Retry</button>
          </div>
        )}
        {state === "error" && (
          <div className="alert alert-danger" role="alert">
            <p>Unable to load development requesters.</p>
            <button className="btn btn-outline-danger" type="button" onClick={retry}>Retry</button>
          </div>
        )}

        <form onSubmit={submit}>
          <label className="form-label" htmlFor="development-requester">Development Requester</label>
          <select
            className="form-select"
            id="development-requester"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            disabled={state !== "ready"}
          >
            <option value="">Select an active requester</option>
            {requesters.map((requester) => (
              <option key={requester.id} value={requester.id}>{requester.displayName}</option>
            ))}
          </select>
          <button className="btn btn-success w-100 mt-3" type="submit" disabled={state !== "ready" || !selectedId}>
            Continue
          </button>
        </form>
      </section>
    </main>
  );
}

function ServiceDesk() {
  const { currentRequester, changeRequester } = useRequester();
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleCheck() {
    setState("loading");
    setErrorMessage("");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState(result.online ? "success" : "error");
    } catch {
      setCategories([]);
      setErrorMessage("Unable to connect to TokTickIT API");
      setState("error");
    }
  }

  return (
    <>
      <header className="app-header">
        <div><strong>TokTickIT</strong><span> IT Service Desk</span></div>
        <div className="requester-chip">
          <span>Current Requester: <strong>{currentRequester?.displayName}</strong></span>
          <button className="btn btn-sm btn-outline-success" onClick={changeRequester}>Change Requester</button>
        </div>
      </header>
      <main className="container py-5" style={{ maxWidth: 720 }}>
        <h1 className="h3 mb-4">Development service desk</h1>
        <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
          {state === "loading" ? "Loading..." : "Check System"}
        </button>
        {state === "success" && (
          <section className="mt-4" aria-live="polite">
            <div className="alert alert-success" role="status"><strong>System Status:</strong> Online</div>
            <h2 className="h5">Supported Request Categories</h2>
            <ol className="list-group list-group-numbered">
              {categories.map((category) => <li className="list-group-item" key={category.id}>{category.name}</li>)}
            </ol>
          </section>
        )}
        {state === "error" && (
          <div className="alert alert-danger mt-4" role="alert">
            <p className="mb-1"><strong>System Status:</strong> Offline</p>
            <p className="mb-0">{errorMessage}</p>
          </div>
        )}
      </main>
    </>
  );
}

function AppContent() {
  const { currentRequester } = useRequester();
  return currentRequester ? <ServiceDesk /> : <RequesterSelection />;
}

export default function App() {
  return <RequesterProvider><AppContent /></RequesterProvider>;
}
