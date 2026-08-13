const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

interface HealthResponse {
  status: string;
  service: string;
}

// Issue 2 checks backend health. Issue 4 will extend this function to load
// categories after the health check succeeds.
export async function checkSystem(): Promise<SystemStatus> {
  const response = await fetch(`${API_URL}/api/health`);

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  const health = (await response.json()) as HealthResponse;
  if (health.status !== "ok" || health.service !== "TokTickIT API") {
    throw new Error("Health check returned an unexpected response");
  }

  return { online: true, categories: [] };
}
