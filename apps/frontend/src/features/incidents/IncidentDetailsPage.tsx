import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { incidentsApi, aiAnalysisApi, type Incident, type AiAnalysis } from "../../lib/api";
import { Layout } from "../../components/Layout";
import {
  glassCard,
  btnPrimary,
  pageTitle,
  sectionTitle,
  mutedText,
  errorText,
  backLink,
  metaItem,
  metaLabel,
  metaValue,
  severityBadgeStyle,
} from "../../design/tokens";

const POLL_MS = 3000;
const IN_PROGRESS = new Set(["PENDING", "PROCESSING"]);

export function IncidentDetailsPage() {
  const { id: projectId, releaseId, deploymentId, incidentId } = useParams<{
    id: string;
    releaseId: string;
    deploymentId: string;
    incidentId: string;
  }>();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [analysis, setAnalysis] = useState<AiAnalysis | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function fetchAnalysis() {
    if (!projectId || !releaseId || !deploymentId || !incidentId) return;
    const a = await aiAnalysisApi.get(projectId, releaseId, deploymentId, incidentId);
    setAnalysis(a);
    if (!a || !IN_PROGRESS.has(a.status)) stopPolling();
    return a;
  }

  useEffect(() => {
    if (!projectId || !releaseId || !deploymentId || !incidentId) return;
    Promise.all([
      incidentsApi.get(projectId, releaseId, deploymentId, incidentId),
      aiAnalysisApi.get(projectId, releaseId, deploymentId, incidentId),
    ])
      .then(([inc, a]) => {
        setIncident(inc);
        setAnalysis(a);
        if (a && IN_PROGRESS.has(a.status)) {
          pollRef.current = setInterval(() => fetchAnalysis().catch(() => {}), POLL_MS);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    return stopPolling;
  }, [projectId, releaseId, deploymentId, incidentId]);

  async function handleTrigger() {
    if (!projectId || !releaseId || !deploymentId || !incidentId) return;
    setTriggering(true);
    try {
      await aiAnalysisApi.trigger(projectId, releaseId, deploymentId, incidentId);
      const a = await aiAnalysisApi.get(projectId, releaseId, deploymentId, incidentId);
      setAnalysis(a);
      if (a && IN_PROGRESS.has(a.status)) {
        stopPolling();
        pollRef.current = setInterval(() => fetchAnalysis().catch(() => {}), POLL_MS);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTriggering(false);
    }
  }

  if (loading) return <Layout><p style={mutedText}>Loading…</p></Layout>;
  if (error) return <Layout><p style={errorText}>{error}</p></Layout>;
  if (!incident) return <Layout><p style={mutedText}>Incident not found.</p></Layout>;

  const isOpen = incident.status === "OPEN";

  return (
    <Layout>
      <Link
        to={`/projects/${projectId}/releases/${releaseId}/deployments/${deploymentId}`}
        style={backLink}
      >
        ← Back to monitoring
      </Link>

      {/* Incident header */}
      <div style={{ ...glassCard, padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={headerRow}>
          <h1 style={{ ...pageTitle, marginBottom: 0 }}>
            {incident.type.replace(/_/g, " ")}
          </h1>
          <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
            <span style={severityBadgeStyle(incident.severity)}>{incident.severity}</span>
            <span style={statusBadge(isOpen)}>{incident.status}</span>
          </div>
        </div>
        <p style={{ margin: "0.875rem 0 0.4rem", fontSize: "0.9rem", color: "#6b4f65", lineHeight: 1.6 }}>
          {incident.description}
        </p>
        <p style={{ fontSize: "0.75rem", color: "#B89AAE" }}>
          Detected {new Date(incident.createdAt).toLocaleString()}
        </p>
      </div>

      {/* AI Analysis panel */}
      <div style={{ ...glassCard, padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ ...sectionTitle, marginBottom: "1.25rem" }}>AI Analysis</h2>
        <AnalysisPanel
          analysis={analysis}
          triggering={triggering}
          onTrigger={handleTrigger}
        />
      </div>
    </Layout>
  );
}

function AnalysisPanel({
  analysis,
  triggering,
  onTrigger,
}: {
  analysis: AiAnalysis | null | undefined;
  triggering: boolean;
  onTrigger: () => void;
}) {
  if (analysis === undefined) {
    return <p style={mutedText}>Loading analysis…</p>;
  }

  if (analysis === null) {
    return (
      <div>
        <p style={{ ...mutedText, marginBottom: "1rem" }}>
          No analysis yet. Trigger one to analyse this incident with Llama.
        </p>
        <button
          onClick={onTrigger}
          disabled={triggering}
          style={btnPrimary}
          className="rg-btn-primary"
        >
          {triggering ? "Queuing…" : "Analyse with AI"}
        </button>
      </div>
    );
  }

  if (analysis.status === "PENDING") {
    return (
      <div style={statusRow}>
        <Spinner />
        <span style={mutedText}>Analysis queued — waiting for Llama 3.1:8b…</span>
      </div>
    );
  }

  if (analysis.status === "PROCESSING") {
    return (
      <div style={statusRow}>
        <Spinner />
        <span style={mutedText}>Llama 3.1:8b is analysing the incident…</span>
      </div>
    );
  }

  if (analysis.status === "FAILED") {
    return (
      <div>
        <div style={failedBox}>
          <strong style={{ color: "#991b1b" }}>Analysis failed</strong>
          {analysis.errorMessage && (
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.82rem", color: "#991b1b" }}>
              {analysis.errorMessage}
            </p>
          )}
        </div>
        <button
          onClick={onTrigger}
          disabled={triggering}
          style={{ ...btnPrimary, marginTop: "0.875rem" }}
          className="rg-btn-primary"
        >
          {triggering ? "Queuing…" : "Re-analyse"}
        </button>
      </div>
    );
  }

  // COMPLETED
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {analysis.summary && (
        <Section title="Summary">
          <p style={bodyText}>{analysis.summary}</p>
        </Section>
      )}

      {analysis.probableCause && (
        <Section title="Probable Cause">
          <p style={bodyText}>{analysis.probableCause}</p>
        </Section>
      )}

      {analysis.impact && (
        <Section title="Impact">
          <p style={bodyText}>{analysis.impact}</p>
        </Section>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
        {analysis.severity && (
          <div style={metaItem}>
            <span style={metaLabel}>AI Severity</span>
            <span style={metaValue}>
              <span style={severityBadgeStyle(analysis.severity)}>{analysis.severity}</span>
            </span>
          </div>
        )}
        {analysis.confidence != null && (
          <div style={metaItem}>
            <span style={metaLabel}>Confidence</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={confBar(analysis.confidence)} />
              <span style={{ ...metaValue, fontSize: "0.82rem" }}>
                {Math.round(analysis.confidence * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {analysis.evidence && analysis.evidence.length > 0 && (
        <Section title="Evidence">
          <ul style={listStyle}>
            {analysis.evidence.map((e, i) => <li key={i} style={listItem}>{e}</li>)}
          </ul>
        </Section>
      )}

      {analysis.recommendedActions && analysis.recommendedActions.length > 0 && (
        <Section title="Recommended Actions">
          <ol style={{ ...listStyle, listStyleType: "decimal" }}>
            {analysis.recommendedActions.map((a, i) => <li key={i} style={listItem}>{a}</li>)}
          </ol>
        </Section>
      )}

      {analysis.rollbackRecommended != null && (
        <div style={metaItem}>
          <span style={metaLabel}>Rollback recommended</span>
          <span style={rollbackPill(analysis.rollbackRecommended)}>
            {analysis.rollbackRecommended ? "Yes" : "No"}
          </span>
        </div>
      )}

      {analysis.rollbackReason && (
        <Section title="Rollback Reason">
          <p style={bodyText}>{analysis.rollbackReason}</p>
        </Section>
      )}

      {analysis.missingInformation && analysis.missingInformation.length > 0 && (
        <Section title="Missing Information">
          <ul style={listStyle}>
            {analysis.missingInformation.map((m, i) => <li key={i} style={listItem}>{m}</li>)}
          </ul>
        </Section>
      )}

      <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.75rem", color: "#B89AAE", marginTop: "0.25rem", flexWrap: "wrap" }}>
        {analysis.modelName && <span>Model: <strong style={{ color: "#95758A" }}>{analysis.modelName}</strong></span>}
        {analysis.processingDurationMs != null && (
          <span>Duration: <strong style={{ color: "#95758A" }}>{(analysis.processingDurationMs / 1000).toFixed(1)}s</strong></span>
        )}
        {analysis.updatedAt && (
          <span>Completed: <strong style={{ color: "#95758A" }}>{new Date(analysis.updatedAt).toLocaleString()}</strong></span>
        )}
      </div>

      <button
        onClick={onTrigger}
        style={{ alignSelf: "flex-start", background: "none", border: "1px solid rgba(242,197,220,0.7)", color: "#D96AA8", borderRadius: "8px", padding: "0.3rem 0.875rem", fontSize: "0.78rem", cursor: "pointer" }}
      >
        Re-analyse
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ ...metaLabel, marginBottom: "0.4rem" }}>{title}</p>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: "50%",
      border: "2px solid rgba(242,197,220,0.5)",
      borderTopColor: "#D96AA8",
      animation: "spin 0.8s linear infinite",
      flexShrink: 0,
    }} />
  );
}

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "0.875rem",
};

const statusRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
};

const failedBox: React.CSSProperties = {
  background: "rgba(252,165,165,0.18)",
  border: "1px solid rgba(248,113,113,0.40)",
  borderRadius: "10px",
  padding: "0.875rem 1rem",
};

const bodyText: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#6b4f65",
  lineHeight: 1.6,
  margin: 0,
};

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: "1.25rem",
  display: "grid",
  gap: "0.3rem",
};

const listItem: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#6b4f65",
  lineHeight: 1.5,
};

function statusBadge(isOpen: boolean): React.CSSProperties {
  return {
    fontSize: "0.68rem",
    fontWeight: 700,
    padding: "0.22rem 0.65rem",
    borderRadius: "20px",
    letterSpacing: "0.05em",
    background: isOpen ? "rgba(252,165,165,0.42)" : "rgba(134,239,172,0.42)",
    color: isOpen ? "#991b1b" : "#166534",
    border: `1px solid ${isOpen ? "rgba(248,113,113,0.45)" : "rgba(74,222,128,0.45)"}`,
  };
}

function confBar(value: number): React.CSSProperties {
  return {
    height: 6,
    width: `${Math.round(value * 80)}px`,
    background: value > 0.7
      ? "linear-gradient(90deg, #22c55e, #4ade80)"
      : value > 0.4
      ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
      : "linear-gradient(90deg, #ef4444, #fca5a5)",
    borderRadius: 3,
  };
}

function rollbackPill(yes: boolean): React.CSSProperties {
  return {
    fontSize: "0.72rem",
    fontWeight: 700,
    padding: "0.22rem 0.75rem",
    borderRadius: "20px",
    background: yes ? "rgba(252,165,165,0.42)" : "rgba(134,239,172,0.42)",
    color: yes ? "#991b1b" : "#166534",
    border: `1px solid ${yes ? "rgba(248,113,113,0.45)" : "rgba(74,222,128,0.45)"}`,
    display: "inline-block",
  };
}
