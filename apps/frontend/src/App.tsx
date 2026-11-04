import { useEffect, useState } from "react";
import type { HealthResponse } from "@releaseguard/shared-types";

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then(async (r) => {
        const text = await r.text();
        if (!text) throw new Error("Backend unavailable");
        return JSON.parse(text) as HealthResponse;
      })
      .then(setHealth)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <h1>ReleaseGuard</h1>
      {!health && !error && <p>Connecting to backend...</p>}
      {health && (
        <p>
          Backend: <strong>{health.status}</strong> — {health.timestamp}
        </p>
      )}
      {error && <p style={{ color: "red" }}>Backend error: {error}</p>}
    </main>
  );
}

export default App;
