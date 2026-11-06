import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { releasesApi } from "../../lib/api";
import { Layout } from "../../components/Layout";
import { formStyles as s } from "../../components/formStyles";
import {
  glassCard,
  btnPrimary,
  btnGhost,
  pageTitle,
  backLink,
} from "../../design/tokens";

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
        <Link to={`/projects/${projectId}`} style={backLink}>
          ← Back to project
        </Link>
        <h1 style={{ ...pageTitle, marginBottom: "1.75rem" }}>New release</h1>
        <div style={{ ...glassCard, padding: "2rem" }}>
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
                className="rg-input"
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
                className="rg-input"
              />
            </div>
            {error && <p style={s.error}>{error}</p>}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button
                type="submit"
                disabled={loading}
                style={{ ...btnPrimary, padding: "0.6rem 1.5rem" }}
                className="rg-btn-primary"
              >
                {loading ? "Creating…" : "Create release"}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/projects/${projectId}`)}
                style={btnGhost}
                className="rg-btn-ghost"
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
