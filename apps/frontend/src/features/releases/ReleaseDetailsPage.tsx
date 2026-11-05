import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { releasesApi, type Release } from "../../lib/api";
import { Layout } from "../../components/Layout";

const STATUS_ORDER = [
  "CREATED",
  "BUILDING",
  "TESTING",
  "DEPLOYING",
  "MONITORING",
  "SUCCESS",
];

export function ReleaseDetailsPage() {
  const { id: projectId, releaseId } = useParams<{
    id: string;
    releaseId: string;
  }>();
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!projectId || !releaseId) return;
    releasesApi
      .get(projectId, releaseId)
      .then(setRelease)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, releaseId]);

  async function handleStart() {
    if (!projectId || !releaseId) return;
    setStarting(true);
    try {
      const updated = await releasesApi.start(projectId, releaseId);
      setRelease(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <Layout><p>Loading…</p></Layout>;
  if (error) return <Layout><p style={{ color: "#c0392b" }}>{error}</p></Layout>;
  if (!release) return <Layout><p>Release not found.</p></Layout>;

  const isFailed = release.status === "FAILED" || release.status === "ROLLED_BACK";
  const isTerminal = release.status === "SUCCESS" || isFailed;

  return (
    <Layout>
      <Link to={`/projects/${projectId}`} style={backStyle}>
        ← Back to project
      </Link>
      <div style={headerRow}>
        <h1 style={{ margin: "0.25rem 0 0" }}>
          Release{" "}
          <span style={{ fontFamily: "monospace" }}>{release.version}</span>
        </h1>
        {release.status === "CREATED" && (
          <button onClick={handleStart} disabled={starting} style={startBtn}>
            {starting ? "Starting…" : "▶ Start release"}
          </button>
        )}
      </div>

      {!isTerminal && (
        <div style={progressBar}>
          {STATUS_ORDER.map((step) => {
            const idx = STATUS_ORDER.indexOf(step);
            const current = STATUS_ORDER.indexOf(release.status);
            const done = idx < current;
            const active = idx === current;
            return (
              <div key={step} style={stepWrapper}>
                <div style={stepDot(done, active, isFailed && active)} />
                <span style={stepLabel(active)}>{step}</span>
              </div>
            );
          })}
        </div>
      )}

      {isFailed && (
        <div style={failedBanner}>
          Release {release.status.toLowerCase()}.
        </div>
      )}

      <div style={metaGrid}>
        <MetaRow label="Status">{release.status}</MetaRow>
        <MetaRow label="Commit hash">
          {release.commitHash ?? "—"}
        </MetaRow>
        <MetaRow label="Created">
          {new Date(release.createdAt).toLocaleString()}
        </MetaRow>
        <MetaRow label="Updated">
          {new Date(release.updatedAt).toLocaleString()}
        </MetaRow>
      </div>
    </Layout>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={metaItem}>
      <span style={metaLabel}>{label}</span>
      <span style={metaValue}>{children}</span>
    </div>
  );
}

const backStyle: React.CSSProperties = {
  color: "#888",
  fontSize: "0.875rem",
  textDecoration: "none",
  display: "block",
  marginBottom: "0.75rem",
};
const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1.75rem",
};
const startBtn: React.CSSProperties = {
  background: "#0f3460",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  padding: "0.5rem 1.25rem",
  fontSize: "0.9rem",
  fontWeight: 600,
  cursor: "pointer",
};
const progressBar: React.CSSProperties = {
  display: "flex",
  gap: "0",
  marginBottom: "2rem",
  background: "#fff",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  padding: "1.25rem 1.5rem",
  alignItems: "center",
  overflowX: "auto",
};
const stepWrapper: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  flex: 1,
  minWidth: "70px",
};

function stepDot(
  done: boolean,
  active: boolean,
  failed: boolean
): React.CSSProperties {
  const bg = failed ? "#ef4444" : done ? "#10b981" : active ? "#3b82f6" : "#e5e7eb";
  return {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    background: bg,
    marginBottom: "0.5rem",
    border: active ? `3px solid ${bg}` : "none",
    boxSizing: "border-box",
  };
}

function stepLabel(active: boolean): React.CSSProperties {
  return {
    fontSize: "0.7rem",
    fontWeight: active ? 700 : 400,
    color: active ? "#111" : "#888",
    textAlign: "center",
  };
}

const failedBanner: React.CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "0.75rem 1rem",
  borderRadius: "6px",
  marginBottom: "1.5rem",
  fontWeight: 600,
};
const metaGrid: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  padding: "1.25rem",
  display: "grid",
  gap: "0.75rem",
};
const metaItem: React.CSSProperties = {
  display: "flex",
  gap: "1rem",
  alignItems: "baseline",
};
const metaLabel: React.CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#888",
  width: "100px",
  flexShrink: 0,
};
const metaValue: React.CSSProperties = {
  fontSize: "0.9rem",
  fontFamily: "monospace",
};
