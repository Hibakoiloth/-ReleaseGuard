import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { projectsApi, type Project } from "../../lib/api";
import { Layout } from "../../components/Layout";
import {
  glassCard,
  linkBtnPrimary,
  pageTitle,
  mutedText,
  errorText,
  projectBadgeStyle,
} from "../../design/tokens";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    projectsApi
      .list()
      .then(setProjects)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div style={rowStyle}>
        <h1 style={pageTitle}>Projects</h1>
        <Link to="/projects/new" style={linkBtnPrimary} className="rg-btn-primary">
          + New project
        </Link>
      </div>

      {loading && <p style={mutedText}>Loading…</p>}
      {error && <p style={{ ...errorText, marginTop: "0.5rem" }}>{error}</p>}

      {!loading && !error && projects.length === 0 && (
        <div style={emptyState}>
          <div style={emptyIcon}>⬡</div>
          <p style={{ ...mutedText, marginBottom: "1.25rem" }}>
            No projects yet. Create one to get started.
          </p>
          <Link to="/projects/new" style={linkBtnPrimary} className="rg-btn-primary">
            Create your first project
          </Link>
        </div>
      )}

      <div style={gridStyle}>
        {projects.map((p) => (
          <Link
            key={p.id}
            to={`/projects/${p.id}`}
            className="rg-link-card"
            style={{ ...glassCard, ...cardBase }}
          >
            <div style={cardHeader}>
              <span style={cardName}>{p.name}</span>
              <span style={projectBadgeStyle(p.status)}>{p.status}</span>
            </div>
            {p.description && (
              <p style={descStyle}>{p.description}</p>
            )}
            <p style={repoStyle}>{p.repositoryUrl}</p>
          </Link>
        ))}
      </div>
    </Layout>
  );
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1.75rem",
};

const emptyState: React.CSSProperties = {
  ...glassCard,
  padding: "4rem 2rem",
  textAlign: "center",
  marginTop: "2rem",
};

const emptyIcon: React.CSSProperties = {
  fontSize: "3rem",
  color: "#EC8FC3",
  marginBottom: "0.875rem",
  display: "block",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: "1.25rem",
};

const cardBase: React.CSSProperties = {
  padding: "1.5rem",
  textDecoration: "none",
  color: "inherit",
  display: "block",
};

const cardHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "0.625rem",
  gap: "0.75rem",
};

const cardName: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "1rem",
  color: "#45283E",
};

const descStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#95758A",
  marginBottom: "0.625rem",
  lineHeight: 1.5,
};

const repoStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "#B89AAE",
  fontFamily: "ui-monospace, Consolas, monospace",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
