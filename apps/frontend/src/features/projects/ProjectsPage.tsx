import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { projectsApi, type Project } from "../../lib/api";
import { Layout } from "../../components/Layout";

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
        <h1 style={titleStyle}>Projects</h1>
        <Link to="/projects/new" style={btnStyle}>
          + New project
        </Link>
      </div>

      {loading && <p style={mutedStyle}>Loading…</p>}
      {error && <p style={errorStyle}>{error}</p>}

      {!loading && !error && projects.length === 0 && (
        <div style={emptyStyle}>
          <p>No projects yet.</p>
          <Link to="/projects/new" style={btnStyle}>
            Create your first project
          </Link>
        </div>
      )}

      <div style={gridStyle}>
        {projects.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`} style={cardStyle}>
            <div style={cardHeaderStyle}>
              <span style={cardNameStyle}>{p.name}</span>
              <span style={badgeStyle(p.status)}>{p.status}</span>
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
  marginBottom: "1.5rem",
};

const titleStyle: React.CSSProperties = { margin: 0, fontSize: "1.5rem" };

const btnStyle: React.CSSProperties = {
  background: "#0f3460",
  color: "#fff",
  padding: "0.5rem 1rem",
  borderRadius: "6px",
  textDecoration: "none",
  fontSize: "0.875rem",
  fontWeight: 600,
};

const mutedStyle: React.CSSProperties = { color: "#888" };
const errorStyle: React.CSSProperties = { color: "#c0392b" };

const emptyStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "4rem 1rem",
  color: "#888",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gap: "1rem",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  padding: "1.25rem",
  textDecoration: "none",
  color: "inherit",
  display: "block",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "0.5rem",
};

const cardNameStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "1rem",
};

const descStyle: React.CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "0.875rem",
  color: "#555",
};

const repoStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.8rem",
  color: "#888",
};

function badgeStyle(status: string): React.CSSProperties {
  return {
    fontSize: "0.75rem",
    padding: "0.2rem 0.6rem",
    borderRadius: "12px",
    background: status === "ACTIVE" ? "#d1fae5" : "#f3f4f6",
    color: status === "ACTIVE" ? "#065f46" : "#6b7280",
    fontWeight: 600,
  };
}
