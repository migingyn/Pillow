import { useEffect, useState } from "react";

type HealthResponse = {
  status: string;
  timestamp: string;
};

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Request failed with ${res.status}`);
        }
        return res.json() as Promise<HealthResponse>;
      })
      .then(setHealth)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <main className="app">
      <h1>React + Vite + TypeScript + Express</h1>
      <p>This frontend is served by Vite and connects to an Express backend.</p>
      {health && (
        <p className="ok">
          API status: <strong>{health.status}</strong> ({health.timestamp})
        </p>
      )}
      {error && <p className="error">API error: {error}</p>}
    </main>
  );
}
