import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiCheckCircle } from "react-icons/fi";
import Layout from "../components/Layout";
import { UICard } from "../components/ui";
import usePageTitle from "../hooks/usePageTitle";

function ResetPasswordSuccess() {
  const navigate = useNavigate();

  usePageTitle("Password Updated");

  useEffect(() => {
    const timer = window.setTimeout(() => navigate("/login", { replace: true }), 2200);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <Layout>
      <div style={{ minHeight: "calc(100vh - 150px)", display: "grid", placeItems: "center", padding: "24px 0" }}>
        <UICard style={{ width: "min(460px, 100%)", padding: "28px", boxShadow: "0 22px 70px rgba(0,0,0,0.22)" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px" }}>
            <FiCheckCircle size={20} color="var(--accent)" />
          </div>
          <h1 className="bebas" style={{ fontSize: "40px", letterSpacing: "2px", lineHeight: 1, marginBottom: "8px" }}>PASSWORD UPDATED</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px" }}>
            Your password was reset successfully. Redirecting to login.
          </p>
          <button className="btn-accent" type="button" onClick={() => navigate("/login", { replace: true })} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            Go to Login
            <FiArrowRight size={15} />
          </button>
        </UICard>
      </div>
    </Layout>
  );
}

export default ResetPasswordSuccess;
