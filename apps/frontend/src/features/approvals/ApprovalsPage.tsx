import { useEffect, useState } from "react";
import { approvalsApi, type ApprovalDetail } from "../../lib/api";
import { Layout } from "../../components/Layout";
import {
  glassCard,
  btnPrimary,
  btnDanger,
  pageTitle,
  sectionTitle,
  mutedText,
  errorText,
  severityBadgeStyle,
} from "../../design/tokens";
import type { CSSProperties } from "react";

type Tab = "pending" | "history";

export function ApprovalsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<ApprovalDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function load(t: Tab) {
    setLoading(true);
    setError(null);
    try {
      const data = t === "pending"
        ? await approvalsApi.listPending()
        : await approvalsApi.listHistory();
      setItems(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(tab); }, [tab]);

  async function handleApprove(approvalId: string) {
    setActionError(null);
    try {
      await approvalsApi.approve(approvalId);
      load(tab);
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  async function handleReject(approvalId: string) {
    setActionError(null);
    try {
      await approvalsApi.reject(approvalId);
      load(tab);
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  return (
    <Layout>
      <h1 style={{ ...pageTitle, marginBottom: "1.5rem" }}>Approvals</h1>

      <div style={tabRow}>
        <TabBtn active={tab === "pending"} onClick={() => setTab("pending")}>
          Pending
        </TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")}>
          History
        </TabBtn>
      </div>

      {loading && <p style={mutedText}>Loading…</p>}
      {error && <p style={errorText}>{error}</p>}
      {actionError && <p style={{ ...errorText, marginBottom: "0.875rem" }}>{actionError}</p>}

      {!loading && !error && items.length === 0 && (
        <p style={{ ...mutedText, marginTop: "2rem" }}>
          {tab === "pending" ? "No pending approvals." : "No approval history."}
        </p>
      )}

      <div style={{ display: "grid", gap: "1rem" }}>
        {items.map(({ approval, recoveryAction, aiAnalysis }) => (
          <div key={approval.id} style={{ ...glassCard, padding: "1.5rem" }}>
            <div style={cardHeader}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <span style={actionTypeBadge(recoveryAction.actionType)}>
                  {recoveryAction.actionType}
                </span>
                <span style={statusBadge(approval.decision)}>
                  {approval.decision}
                </span>
                {aiAnalysis?.severity && (
                  <span style={severityBadgeStyle(aiAnalysis.severity)}>
                    {aiAnalysis.severity}
                  </span>
                )}
              </div>
              <span style={{ fontSize: "0.72rem", color: "#B89AAE" }}>
                {new Date(approval.createdAt).toLocaleString()}
              </span>
            </div>

            {recoveryAction.reason && (
              <p style={reasonText}>{recoveryAction.reason}</p>
            )}

            {aiAnalysis?.summary && (
              <div style={aiBox}>
                <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "#95758A", textTransform: "uppercase", letterSpacing: "0.055em", marginBottom: "0.3rem" }}>
                  AI Summary
                </p>
                <p style={{ fontSize: "0.875rem", color: "#6b4f65", lineHeight: 1.6, margin: 0 }}>
                  {aiAnalysis.summary}
                </p>
                {aiAnalysis.rollbackRecommended && (
                  <p style={{ fontSize: "0.78rem", color: "#991b1b", marginTop: "0.4rem", marginBottom: 0 }}>
                    ⚠ AI recommends rollback
                    {aiAnalysis.rollbackReason && `: ${aiAnalysis.rollbackReason}`}
                  </p>
                )}
              </div>
            )}

            {tab === "pending" && approval.decision === "PENDING" && (
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                <button
                  style={btnPrimary}
                  className="rg-btn-primary"
                  onClick={() => handleApprove(approval.id)}
                >
                  Approve
                </button>
                <button
                  style={btnDanger}
                  onClick={() => handleReject(approval.id)}
                >
                  Reject
                </button>
              </div>
            )}

            {tab === "history" && approval.approvedBy && (
              <p style={{ fontSize: "0.72rem", color: "#B89AAE", marginTop: "0.75rem", marginBottom: 0 }}>
                {approval.decision === "APPROVED" ? "Approved" : "Rejected"} by {approval.approvedBy}
              </p>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "rgba(217, 106, 168, 0.15)" : "transparent",
        border: active ? "1px solid rgba(217, 106, 168, 0.5)" : "1px solid transparent",
        borderRadius: "8px",
        padding: "0.35rem 1rem",
        fontSize: "0.82rem",
        fontWeight: active ? 700 : 500,
        color: active ? "#D96AA8" : "#95758A",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

const tabRow: CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  marginBottom: "1.5rem",
};

const cardHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "0.875rem",
  marginBottom: "0.75rem",
};

const reasonText: CSSProperties = {
  fontSize: "0.875rem",
  color: "#6b4f65",
  margin: "0 0 0.75rem",
  lineHeight: 1.5,
};

const aiBox: CSSProperties = {
  background: "rgba(217, 106, 168, 0.07)",
  border: "1px solid rgba(242, 197, 220, 0.50)",
  borderRadius: "10px",
  padding: "0.875rem 1rem",
  marginTop: "0.5rem",
};

const badgeBase: CSSProperties = {
  fontSize: "0.68rem",
  fontWeight: 700,
  padding: "0.22rem 0.65rem",
  borderRadius: "20px",
  letterSpacing: "0.05em",
  display: "inline-block",
  whiteSpace: "nowrap",
};

function actionTypeBadge(type: string): CSSProperties {
  return {
    ...badgeBase,
    background: "rgba(147,197,253,0.42)",
    color: "#1d4ed8",
    border: "1px solid rgba(96,165,250,0.45)",
  };
}

function statusBadge(decision: string): CSSProperties {
  const map: Record<string, [string, string, string]> = {
    PENDING:  ["rgba(253,230,138,0.42)", "#92400e", "rgba(251,191,36,0.45)"],
    APPROVED: ["rgba(134,239,172,0.42)", "#166534", "rgba(74,222,128,0.45)"],
    REJECTED: ["rgba(252,165,165,0.42)", "#991b1b", "rgba(248,113,113,0.45)"],
  };
  const [bg, color, border] = map[decision] ?? ["rgba(209,213,219,0.5)", "#374151", "rgba(156,163,175,0.5)"];
  return { ...badgeBase, background: bg, color, border: `1px solid ${border}` };
}
