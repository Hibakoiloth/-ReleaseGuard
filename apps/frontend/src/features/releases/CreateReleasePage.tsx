import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { releasesApi } from "../../lib/api";
import { Layout } from "../../components/Layout";
import { formStyles as s } from "../../components/formStyles";

export function CreateReleasePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [version, setVersion] = useState("");
  const [commitHash, setCommitHash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const release = await releasesApi.create(projectId, {
        version,
        commitHash: commitHash || undefined,
      });
      navigate(`/projects/${projectId}/releases/${release.id}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div style={{ maxWidth: "480px" }}>
        <Link to={`/projects/${projectId}`} style={backStyle}>
          ← Back to project
        </Link>
        <h1 style={{ margin: "0.5rem 0 1.5rem" }}>New release</h1>
        <div style={formCard}>
          <form onSubmit={handleSubmit}>
            <div style={s.field}>
              <label style={s.label}>Version *</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                required
                placeholder="1.0.0"
                style={s.input}
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>Commit hash (optional)</label>
              <input
                type="text"
                value={commitHash}
                onChange={(e) => setCommitHash(e.target.value)}
                placeholder="abc1234"
                maxLength={40}
                style={s.input}
              />
            </div>
            {error && <p style={s.error}>{error}</p>}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="submit"
                disabled={loading}
                style={{ ...s.button, width: "auto", padding: "0.6rem 1.5rem" }}
              >
                {loading ? "Creating…" : "Create release"}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/projects/${projectId}`)}
                style={cancelStyle}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

const backStyle: React.CSSProperties = {
  color: "#888",
  fontSize: "0.875rem",
  textDecoration: "none",
  display: "block",
};

const formCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  padding: "1.75rem",
};

const cancelStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid #ddd",
  borderRadius: "6px",
  padding: "0.6rem 1.25rem",
  cursor: "pointer",
  fontSize: "1rem",
};
