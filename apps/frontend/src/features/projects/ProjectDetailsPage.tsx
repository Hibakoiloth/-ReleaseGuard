import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { projectsApi, releasesApi, policiesApi, type Project, type Release, type Policy } from "../../lib/api";
import { Layout } from "../../components/Layout";
import {
  glassCard,
  glassCardStrong,
  btnPrimary,
  btnGhost,
  btnDanger,
  linkBtnPrimary,
  glassInput,
  fieldLabel,
  fieldWrap,
  pageTitle,
  sectionTitle,
  mutedText,
  errorText,
  backLink,
  metaGrid,
  metaItem,
  metaLabel,
  metaValue,
  tableWrap,
  tableStyle,
  thStyle,
  tdStyle,
  sectionRow,
  releaseBadgeStyle,
} from "../../design/tokens";

export function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  const [saving, setSaving] = useState(false);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    name: "",
    action: "ROLLBACK" as string,
    event: "HEALTH_CHECK_FAILED" as string,
    requireApproval: false,
  });

  useEffect(() => {
    if (!id) return;
    Promise.all([projectsApi.get(id), releasesApi.list(id)])
      .then(([p, r]) => { setProject(p); setReleases(r); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    policiesApi.list(id).then(setPolicies).catch(() => {});
  }, [id]);

  async function handleArchive() {
    if (!project) return;
    setArchiving(true);
    try {
      const updated = await projectsApi.archive(project.id);
      setProject(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setArchiving(false);
    }
  }

  async function handleSave() {
    if (!project) return;
    setSaving(true);
    try {
      const updated = await projectsApi.update(project.id, editForm);
      setProject(updated);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreatePolicy() {
    if (!id) return;
    try {
      const p = await policiesApi.create(id, {
        name: policyForm.name,
        action: policyForm.action,
        conditions: { event: policyForm.event, requireApproval: policyForm.requireApproval },
      });
      setPolicies((prev) => [p, ...prev]);
      setShowPolicyForm(false);
      setPolicyForm({ name: "", action: "ROLLBACK", event: "HEALTH_CHECK_FAILED", requireApproval: false });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDeletePolicy(policyId: string) {
    if (!id) return;
    try {
      await policiesApi.delete(id, policyId);
      setPolicies((prev) => prev.filter((p) => p.id !== policyId));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <Layout><p style={mutedText}>Loading…</p></Layout>;
  if (error)   return <Layout><p style={errorText}>{error}</p></Layout>;
  if (!project) return <Layout><p style={mutedText}>Project not found.</p></Layout>;

  return (
    <Layout>
      <Link to="/projects" style={backLink}>← Projects</Link>

      <div style={headerRow}>
        <h1 style={pageTitle}>{project.name}</h1>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {project.status === "ACTIVE" && (
            <button
              onClick={() => {
                setEditForm({
                  name: project.name,
                  description: project.description ?? "",
                  repositoryUrl: project.repositoryUrl,
                  buildCommand: project.buildCommand,
                  testCommand: project.testCommand,
                  dockerfilePath: project.dockerfilePath,
                  healthCheckPath: project.healthCheckPath,
                });
                setEditing(true);
              }}
              style={btnGhost}
              className="rg-btn-ghost"
            >
              Edit
            </button>
          )}
          {project.status === "ACTIVE" && (
            <button
              onClick={handleArchive}
              disabled={archiving}
              style={btnDanger}
              className="rg-btn-ghost"
            >
              {archiving ? "Archiving…" : "Archive"}
            </button>
          )}
        </div>
      </div>

      <div style={metaGrid}>
        <MetaField label="Status">{project.status}</MetaField>
        <MetaField label="Repository">{project.repositoryUrl}</MetaField>
        <MetaField label="Build">{project.buildCommand}</MetaField>
        <MetaField label="Test">{project.testCommand}</MetaField>
        <MetaField label="Dockerfile">{project.dockerfilePath}</MetaField>
        <MetaField label="Health check">{project.healthCheckPath}</MetaField>
        {project.description && (
          <MetaField label="Description">{project.description}</MetaField>
        )}
      </div>

      <div style={sectionRow}>
        <h2 style={sectionTitle}>Releases</h2>
        {project.status === "ACTIVE" && (
          <Link
            to={`/projects/${project.id}/releases/new`}
            style={linkBtnPrimary}
            className="rg-btn-primary"
          >
            + New release
          </Link>
        )}
      </div>

      {releases.length === 0 ? (
        <p style={mutedText}>No releases yet.</p>
      ) : (
        <div style={tableWrap}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Version", "Status", "Commit", "Created"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {releases.map((r) => (
                <tr
                  key={r.id}
                  className="rg-tr-hover"
                  onClick={() => navigate(`/projects/${id}/releases/${r.id}`)}
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.version}</td>
                  <td style={tdStyle}>
                    <span style={releaseBadgeStyle(r.status)}>{r.status}</span>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" }}>
                    {r.commitHash ? r.commitHash.slice(0, 7) : "—"}
                  </td>
                  <td style={{ ...tdStyle, color: "#95758A", fontSize: "0.8rem" }}>
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Policies */}
      <div style={{ marginTop: "2.5rem" }}>
        <div style={sectionRow}>
          <h2 style={sectionTitle}>Recovery Policies</h2>
          <button
            style={btnGhost}
            className="rg-btn-ghost"
            onClick={() => setShowPolicyForm((v) => !v)}
          >
            {showPolicyForm ? "Cancel" : "+ Add policy"}
          </button>
        </div>

        {showPolicyForm && (
          <div style={{ ...glassCard, padding: "1.25rem", marginBottom: "1rem", display: "grid", gap: "0.875rem" }}>
            <div style={fieldWrap}>
              <label style={fieldLabel}>Policy name</label>
              <input
                style={glassInput}
                value={policyForm.name}
                onChange={(e) => setPolicyForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Auto-rollback on failure"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
              <div style={fieldWrap}>
                <label style={fieldLabel}>Action</label>
                <select
                  style={{ ...glassInput, cursor: "pointer" }}
                  value={policyForm.action}
                  onChange={(e) => setPolicyForm((f) => ({ ...f, action: e.target.value }))}
                >
                  <option value="ROLLBACK">ROLLBACK</option>
                  <option value="BLOCK">BLOCK</option>
                  <option value="REQUIRE_APPROVAL">REQUIRE_APPROVAL</option>
                </select>
              </div>
              <div style={fieldWrap}>
                <label style={fieldLabel}>Trigger event</label>
                <select
                  style={{ ...glassInput, cursor: "pointer" }}
                  value={policyForm.event}
                  onChange={(e) => setPolicyForm((f) => ({ ...f, event: e.target.value }))}
                >
                  <option value="HEALTH_CHECK_FAILED">HEALTH_CHECK_FAILED</option>
                  <option value="DEPLOYMENT_FAILED">DEPLOYMENT_FAILED</option>
                  <option value="BUILD_FAILED">BUILD_FAILED</option>
                  <option value="TEST_FAILED">TEST_FAILED</option>
                </select>
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "#45283E", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={policyForm.requireApproval}
                onChange={(e) => setPolicyForm((f) => ({ ...f, requireApproval: e.target.checked }))}
              />
              Require approval before executing
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button style={btnPrimary} className="rg-btn-primary" onClick={handleCreatePolicy}>
                Create policy
              </button>
            </div>
          </div>
        )}

        {policies.length === 0 ? (
          <p style={mutedText}>No recovery policies. Add one to enable automated recovery.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {policies.map((p) => (
              <div key={p.id} style={{ ...glassCard, padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 600, color: "#45283E", fontSize: "0.875rem" }}>{p.name}</span>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
                    <span style={policyBadge("action")}>{p.action}</span>
                    <span style={policyBadge("event")}>{p.conditions.event}</span>
                    {p.conditions.requireApproval && <span style={policyBadge("approval")}>Requires approval</span>}
                  </div>
                </div>
                <button
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.82rem" }}
                  onClick={() => handleDeletePolicy(p.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div style={modalOverlay}>
          <div style={{ ...glassCardStrong, padding: "2rem", width: "100%", maxWidth: "520px", display: "grid", gap: "1rem" }}>
            <h2 style={{ ...sectionTitle, marginBottom: "0.25rem" }}>Edit Project</h2>
            {(
              [
                { key: "name", label: "Name" },
                { key: "description", label: "Description" },
                { key: "repositoryUrl", label: "Repository URL" },
                { key: "buildCommand", label: "Build Command" },
                { key: "testCommand", label: "Test Command" },
                { key: "dockerfilePath", label: "Dockerfile Path" },
                { key: "healthCheckPath", label: "Health Check Path" },
              ] as { key: keyof Project; label: string }[]
            ).map(({ key, label }) => (
              <div key={key} style={fieldWrap}>
                <label style={fieldLabel}>{label}</label>
                <input
                  style={glassInput}
                  value={(editForm[key] as string) ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button style={btnGhost} onClick={() => setEditing(false)}>Cancel</button>
              <button style={btnPrimary} className="rg-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={metaItem}>
      <span style={metaLabel}>{label}</span>
      <span style={metaValue}>{children}</span>
    </div>
  );
}

function policyBadge(variant: "action" | "event" | "approval"): React.CSSProperties {
  const styles = {
    action:   { background: "rgba(147,197,253,0.42)", color: "#1d4ed8",  border: "1px solid rgba(96,165,250,0.45)" },
    event:    { background: "rgba(196,181,253,0.42)", color: "#5b21b6",  border: "1px solid rgba(167,139,250,0.45)" },
    approval: { background: "rgba(253,230,138,0.42)", color: "#92400e", border: "1px solid rgba(251,191,36,0.45)" },
  };
  return {
    fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem",
    borderRadius: "20px", letterSpacing: "0.04em", display: "inline-block",
    ...styles[variant],
  };
}

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "1.5rem",
};

const modalOverlay: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 200,
  background: "rgba(252,228,241,0.75)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "1.5rem",
};
