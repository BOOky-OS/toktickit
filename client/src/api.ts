const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface DevelopmentRequester {
  id: number;
  displayName: string;
  email: string;
}

export async function getDevelopmentRequesters(): Promise<DevelopmentRequester[]> {
  const response = await fetch(`${API_URL}/api/development-requesters`);
  if (!response.ok) {
    throw new Error(`Requester request failed with status ${response.status}`);
  }
  return (await response.json()) as DevelopmentRequester[];
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

interface HealthResponse {
  status: string;
  service: string;
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthResponse = await fetch(`${API_URL}/api/health`);

  if (!healthResponse.ok) {
    throw new Error(`Health check failed with status ${healthResponse.status}`);
  }

  const health = (await healthResponse.json()) as HealthResponse;
  if (health.status !== "ok" || health.service !== "TokTickIT API") {
    throw new Error("Health check returned an unexpected response");
  }

  const categoryResponse = await fetch(`${API_URL}/api/categories`);
  if (!categoryResponse.ok) {
    throw new Error(`Category request failed with status ${categoryResponse.status}`);
  }

  const categories = (await categoryResponse.json()) as Category[];
  return { online: true, categories };
}
