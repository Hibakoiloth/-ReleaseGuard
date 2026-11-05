import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  releasesApi,
  buildsApi,
  testsApi,
  type Release,
  type BuildExecution,
  type TestExecution,
} from "../../lib/api";
import { Layout } from "../../components/Layout";

const STATUS_ORDER = [
  "CREATED",
  "BUILDING",
  "TESTING",
  "DEPLOYING",
  "MONITORING",
  "SUCCESS",
];

const ACTIVE_STATUSES = new Set(["BUILDING", "TESTING", "DEPLOYING", "MONITORING"]);
const RUNNING_EXEC = new Set(["PENDING", "RUNNING"]);

export function ReleaseDetailsPage() {
  const { id: projectId, releaseId } = useParams<{
    id: string;
    releaseId: string;
  }>();
  const [release, setRelease] = useState<Release | null>(null);
  const [builds, setBuilds] = useState<BuildExecution[]>([]);
  const [tests, setTests] = useState<TestExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function fetchAll() {
    if (!projectId || !releaseId) return;
    const [r, b, t] = await Promise.all([
      releasesApi.get(projectId, releaseId),
      buildsApi.list(projectId, releaseId).catch(() => [] as BuildExecution[]),
      testsApi.list(projectId, releaseId).catch(() => [] as TestExecution[]),
    ]);
    setRelease(r);
    setBuilds(b);
    setTests(t);
    return r;
  }

  useEffect(() => {
    if (!projectId || !releaseId) return;
    fetchAll()
      .then((r) => {
        if (r && ACTIVE_STATUSES.has(r.status)) {
          pollRef.current = setInterval(() => {
            fetchAll().then((updated) => {
              if (updated && !ACTIVE_STATUSES.has(updated.status)) stopPolling();
            });
          }, 3000);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));

    return stopPolling;
  }, [projectId, releaseId]);

  async function handleStart() {
    if (!projectId || !releaseId) return;
    setStarting(true);
    try {
      const updated = await releasesApi.start(projectId, releaseId);
      setRelease(updated);
      pollRef.current = setInterval(() => {
        fetchAll().then((r) => {
          if (r && !ACTIVE_STATUSES.has(r.status)) stopPolling();
        });
      }, 3000);
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

      {builds.length > 0 && (
        <ExecutionPanel title="Build" executions={builds} />
      )}

      {tests.length > 0 && (
        <ExecutionPanel title="Test" executions={tests} />
      )}
    </Layout>
  );
}

function ExecutionPanel({
  title,
  executions,
}: {
  title: string;
  executions: (BuildExecution | TestExecution)[];
}) {
  const latest = executions[0];
  const [expanded, setExpanded] = useState(false);

  const statusColor: Record<string, string> = {
    PENDING: "#6b7280",
    RUNNING: "#3b82f6",
    SUCCESS: "#10b981",
    FAILED: "#ef4444",
    TIMED_OUT: "#f59e0b",
  };

  return (
    <div style={execPanel}>
      <div style={execHeader}>
        <span style={{ fontWeight: 600 }}>{title} execution</span>
        <span
          style={{
            ...execBadge,
            background: statusColor[latest.status] ?? "#6b7280",
          }}
        >
          {latest.status}
          {RUNNING_EXEC.has(latest.status) && " …"}
        </span>
      </div>
      <div style={execMeta}>
        {latest.startedAt && (
          <span>Started: {new Date(latest.startedAt).toLocaleTimeString()}</span>
        )}
        {latest.completedAt && (
          <span style={{ marginLeft: "1rem" }}>
            Completed: {new Date(latest.completedAt).toLocaleTimeString()}
          </span>
        )}
        {latest.exitCode !== null && (
          <span style={{ marginLeft: "1rem" }}>
            Exit: {latest.exitCode}
          </span>
        )}
      </div>
      {latest.output && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={toggleBtn}
          >
            {expanded ? "Hide output" : "Show output"}
          </button>
          {expanded && (
            <pre style={outputPre}>{latest.output}</pre>
          )}
        </>
      )}
    </div>
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
  marginBottom: "1.5rem",
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
const execPanel: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  padding: "1.25rem",
  marginBottom: "1.5rem",
};
const execHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "0.5rem",
};
const execBadge: React.CSSProperties = {
  color: "#fff",
  borderRadius: "4px",
  padding: "2px 8px",
  fontSize: "0.75rem",
  fontWeight: 600,
};
const execMeta: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "#888",
  marginBottom: "0.75rem",
};
const toggleBtn: React.CSSProperties = {
  background: "none",
  border: "1px solid #e5e5e5",
  borderRadius: "4px",
  padding: "0.25rem 0.75rem",
  fontSize: "0.8rem",
  cursor: "pointer",
  color: "#555",
};
const outputPre: React.CSSProperties = {
  marginTop: "0.75rem",
  background: "#1a1a2e",
  color: "#e2e8f0",
  borderRadius: "6px",
  padding: "1rem",
  fontSize: "0.75rem",
  lineHeight: 1.6,
  overflowX: "auto",
  maxHeight: "400px",
  overflowY: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};
