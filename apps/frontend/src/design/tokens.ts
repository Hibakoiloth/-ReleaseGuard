import type { CSSProperties } from "react";

// ── Glass surfaces ───────────────────────────────────────────────────────────
export const glassCard: CSSProperties = {
  background: "rgba(255, 255, 255, 0.50)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(255, 255, 255, 0.68)",
  boxShadow: "0 8px 32px rgba(190, 100, 150, 0.10)",
  borderRadius: "16px",
};

export const glassCardStrong: CSSProperties = {
  background: "rgba(255, 255, 255, 0.65)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255, 255, 255, 0.82)",
  boxShadow: "0 12px 48px rgba(190, 100, 150, 0.14)",
  borderRadius: "20px",
};

// ── Buttons ──────────────────────────────────────────────────────────────────
export const btnPrimary: CSSProperties = {
  background: "linear-gradient(135deg, #EC8FC3 0%, #D96AA8 100%)",
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  padding: "0.55rem 1.25rem",
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 4px 14px rgba(216, 100, 160, 0.30)",
  letterSpacing: "0.01em",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
};

export const btnGhost: CSSProperties = {
  background: "rgba(255, 255, 255, 0.48)",
  color: "#45283E",
  border: "1px solid rgba(242, 197, 220, 0.72)",
  borderRadius: "12px",
  padding: "0.55rem 1.25rem",
  fontSize: "0.875rem",
  fontWeight: 500,
  cursor: "pointer",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

export const btnDanger: CSSProperties = {
  background: "rgba(254, 226, 226, 0.6)",
  color: "#991b1b",
  border: "1px solid rgba(252, 165, 165, 0.5)",
  borderRadius: "12px",
  padding: "0.55rem 1.25rem",
  fontSize: "0.875rem",
  fontWeight: 500,
  cursor: "pointer",
};

export const linkBtnPrimary: CSSProperties = {
  ...btnPrimary,
  textDecoration: "none",
};

export const linkBtnGhost: CSSProperties = {
  ...btnGhost,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};

// ── Inputs ───────────────────────────────────────────────────────────────────
export const glassInput: CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.9rem",
  fontSize: "0.9rem",
  background: "rgba(255, 255, 255, 0.60)",
  border: "1px solid rgba(242, 197, 220, 0.82)",
  borderRadius: "10px",
  color: "#45283E",
  boxSizing: "border-box",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  fontFamily: "inherit",
};

export const glassTextarea: CSSProperties = {
  ...glassInput,
  resize: "vertical",
  minHeight: "90px",
};

export const fieldLabel: CSSProperties = {
  display: "block",
  marginBottom: "0.4rem",
  fontSize: "0.72rem",
  fontWeight: 700,
  color: "#95758A",
  textTransform: "uppercase",
  letterSpacing: "0.055em",
};

export const fieldWrap: CSSProperties = { marginBottom: "1rem" };

// ── Typography ───────────────────────────────────────────────────────────────
export const pageTitle: CSSProperties = {
  fontSize: "1.7rem",
  fontWeight: 800,
  color: "#45283E",
  letterSpacing: "-0.025em",
};

export const sectionTitle: CSSProperties = {
  fontSize: "0.95rem",
  fontWeight: 700,
  color: "#45283E",
};

export const mutedText: CSSProperties = { color: "#95758A", fontSize: "0.875rem" };
export const errorText: CSSProperties  = { color: "#d05070", fontSize: "0.875rem" };

export const backLink: CSSProperties = {
  color: "#95758A",
  fontSize: "0.8rem",
  fontWeight: 500,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.3rem",
  marginBottom: "0.875rem",
  transition: "color 0.15s",
};

// ── Meta rows ────────────────────────────────────────────────────────────────
export const metaGrid: CSSProperties = {
  ...glassCard,
  padding: "1.25rem 1.5rem",
  marginBottom: "1.75rem",
  display: "grid",
  gap: "0.875rem",
};

export const metaItem: CSSProperties = {
  display: "flex",
  gap: "1rem",
  alignItems: "baseline",
};

export const metaLabel: CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 700,
  color: "#95758A",
  width: "110px",
  flexShrink: 0,
  textTransform: "uppercase",
  letterSpacing: "0.055em",
};

export const metaValue: CSSProperties = {
  fontSize: "0.875rem",
  color: "#45283E",
  wordBreak: "break-all",
};

// ── Tables ───────────────────────────────────────────────────────────────────
export const tableWrap: CSSProperties = {
  ...glassCard,
  overflow: "hidden",
  padding: 0,
};

export const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.875rem",
};

export const thStyle: CSSProperties = {
  padding: "0.75rem 1rem",
  textAlign: "left",
  fontSize: "0.7rem",
  fontWeight: 700,
  color: "#95758A",
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  borderBottom: "1px solid rgba(242, 197, 220, 0.50)",
  background: "rgba(255,255,255,0.30)",
};

export const tdStyle: CSSProperties = {
  padding: "0.8rem 1rem",
  borderBottom: "1px solid rgba(242, 197, 220, 0.28)",
  color: "#45283E",
};

// ── Status badges ─────────────────────────────────────────────────────────────
const badge: CSSProperties = {
  fontSize: "0.68rem",
  fontWeight: 700,
  padding: "0.22rem 0.65rem",
  borderRadius: "20px",
  letterSpacing: "0.05em",
  display: "inline-block",
  whiteSpace: "nowrap",
};

const releaseMap: Record<string, [string, string, string]> = {
  CREATED:     ["rgba(248,187,216,0.42)", "#a0527a", "rgba(242,197,220,0.8)"],
  BUILDING:    ["rgba(253,230,138,0.42)", "#92400e", "rgba(251,191,36,0.45)"],
  TESTING:     ["rgba(196,181,253,0.42)", "#5b21b6", "rgba(167,139,250,0.45)"],
  DEPLOYING:   ["rgba(147,197,253,0.42)", "#1d4ed8", "rgba(96,165,250,0.45)"],
  MONITORING:  ["rgba(103,232,249,0.32)", "#0e7490", "rgba(34,211,238,0.42)"],
  SUCCESS:     ["rgba(134,239,172,0.42)", "#166534", "rgba(74,222,128,0.45)"],
  FAILED:      ["rgba(252,165,165,0.42)", "#991b1b", "rgba(248,113,113,0.45)"],
  ROLLED_BACK: ["rgba(209,213,219,0.50)", "#374151", "rgba(156,163,175,0.55)"],
};

export function releaseBadgeStyle(status: string): CSSProperties {
  const [bg, color, border] = releaseMap[status] ?? ["rgba(209,213,219,0.5)", "#374151", "rgba(156,163,175,0.5)"];
  return { ...badge, background: bg, color, border: `1px solid ${border}` };
}

const deployMap: Record<string, [string, string, string]> = {
  PENDING:        ["rgba(209,213,219,0.40)", "#374151",  "rgba(156,163,175,0.5)"],
  BUILDING_IMAGE: ["rgba(196,181,253,0.42)", "#5b21b6", "rgba(167,139,250,0.45)"],
  STARTING:       ["rgba(147,197,253,0.42)", "#1d4ed8",  "rgba(96,165,250,0.45)"],
  RUNNING:        ["rgba(134,239,172,0.42)", "#166534",  "rgba(74,222,128,0.45)"],
  STOPPED:        ["rgba(209,213,219,0.50)", "#374151",  "rgba(156,163,175,0.55)"],
  FAILED:         ["rgba(252,165,165,0.42)", "#991b1b",  "rgba(248,113,113,0.45)"],
};

export function deployBadgeStyle(status: string): CSSProperties {
  const [bg, color, border] = deployMap[status] ?? deployMap.PENDING;
  return { ...badge, background: bg, color, border: `1px solid ${border}` };
}

export function projectBadgeStyle(status: string): CSSProperties {
  if (status === "ACTIVE")
    return { ...badge, background: "rgba(134,239,172,0.42)", color: "#166534", border: "1px solid rgba(74,222,128,0.45)" };
  return { ...badge, background: "rgba(209,213,219,0.50)", color: "#374151", border: "1px solid rgba(156,163,175,0.55)" };
}

export function severityBadgeStyle(severity: string): CSSProperties {
  const map: Record<string, [string, string, string]> = {
    LOW:      ["rgba(134,239,172,0.42)", "#166534", "rgba(74,222,128,0.45)"],
    MEDIUM:   ["rgba(253,230,138,0.42)", "#92400e", "rgba(251,191,36,0.45)"],
    HIGH:     ["rgba(252,165,165,0.42)", "#991b1b", "rgba(248,113,113,0.45)"],
    CRITICAL: ["rgba(196,181,253,0.42)", "#5b21b6", "rgba(167,139,250,0.45)"],
  };
  const [bg, color, border] = map[severity] ?? ["rgba(209,213,219,0.5)", "#374151", "rgba(156,163,175,0.5)"];
  return { ...badge, background: bg, color, border: `1px solid ${border}` };
}

// ── Terminal / log output ─────────────────────────────────────────────────────
export const terminalPre: CSSProperties = {
  background: "#1a0d1a",
  color: "#f8d7ea",
  border: "1px solid rgba(232, 121, 185, 0.22)",
  borderRadius: "12px",
  padding: "1rem 1.25rem",
  fontSize: "0.74rem",
  lineHeight: 1.7,
  overflowX: "auto",
  maxHeight: "420px",
  overflowY: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontFamily: "ui-monospace, Consolas, 'Courier New', monospace",
  marginTop: "0.75rem",
};

// ── Section header row ────────────────────────────────────────────────────────
export const sectionRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1rem",
};
