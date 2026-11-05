import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";
import type { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <header style={headerStyle}>
        <Link to="/projects" style={logoStyle}>
          ReleaseGuard
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {user && (
            <span style={{ fontSize: "0.875rem", color: "#666" }}>
              {user.email}
            </span>
          )}
          <button onClick={handleSignOut} style={signOutStyle}>
            Sign out
          </button>
        </div>
      </header>
      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem" }}>
        {children}
      </main>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  background: "#fff",
  borderBottom: "1px solid #e5e5e5",
  padding: "0 1.5rem",
  height: "56px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  position: "sticky",
  top: 0,
  zIndex: 10,
};

const logoStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: "1.125rem",
  color: "#0f3460",
  textDecoration: "none",
};

const signOutStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid #ddd",
  borderRadius: "6px",
  padding: "0.35rem 0.75rem",
  fontSize: "0.875rem",
  cursor: "pointer",
  color: "#555",
};
