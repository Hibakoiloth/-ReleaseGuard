import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";
import type { ReactNode, CSSProperties } from "react";

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div style={shell}>
      <header style={header}>
        <div style={headerInner}>
          <Link to="/projects" style={logo}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0 }}>
              <polygon points="11,1 20,6 20,16 11,21 2,16 2,6" fill="none" stroke="#E879B9" strokeWidth="1.6" />
              <polygon points="11,5 16,8 16,14 11,17 6,14 6,8" fill="rgba(232,121,185,0.20)" stroke="#EC8FC3" strokeWidth="1" />
              <circle cx="11" cy="11" r="2.2" fill="#D96AA8" />
            </svg>
            ReleaseGuard
          </Link>
          <div style={headerRight}>
            {user && <span style={userChip}>{user.username}</span>}
            <button onClick={handleSignOut} className="rg-btn-ghost" style={signOutBtn}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="rg-page" style={mainContent}>
        {children}
      </main>
    </div>
  );
}

const shell: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
};

const header: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 100,
  background: "rgba(255, 255, 255, 0.58)",
  backdropFilter: "blur(22px)",
  WebkitBackdropFilter: "blur(22px)",
  borderBottom: "1px solid rgba(242, 197, 220, 0.55)",
  boxShadow: "0 2px 20px rgba(190, 100, 150, 0.08)",
};

const headerInner: CSSProperties = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "0 1.75rem",
  height: "60px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const logo: CSSProperties = {
  fontWeight: 800,
  fontSize: "1.1rem",
  color: "#D96AA8",
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  letterSpacing: "-0.015em",
};

const headerRight: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.875rem",
};

const userChip: CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#95758A",
  background: "rgba(248, 187, 216, 0.35)",
  border: "1px solid rgba(242, 197, 220, 0.65)",
  borderRadius: "20px",
  padding: "0.25rem 0.8rem",
};

const signOutBtn: CSSProperties = {
  background: "rgba(255, 255, 255, 0.52)",
  border: "1px solid rgba(242, 197, 220, 0.72)",
  borderRadius: "10px",
  padding: "0.35rem 0.9rem",
  fontSize: "0.78rem",
  cursor: "pointer",
  color: "#95758A",
  fontWeight: 500,
};

const mainContent: CSSProperties = {
  flex: 1,
  maxWidth: "1100px",
  width: "100%",
  margin: "0 auto",
  padding: "2.25rem 1.75rem 3rem",
};
