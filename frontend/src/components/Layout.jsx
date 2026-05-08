import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiBarChart2, FiChevronDown, FiCommand, FiGrid, FiLogIn, FiLogOut, FiPackage, FiPlus, FiMoon, FiSun, FiUser } from "react-icons/fi";
import api from "../api/axios";
import { clearCachedAuthState, getCachedAuthState, setCachedAuthState } from "../api/authCache";
import { UIButton, UICard, UIIconButton } from "./ui";
import brandLogo from "../assets/bm-logo.svg";

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem("bestmotors-theme") || "dark");
  const [auth, setAuth] = useState(() => getCachedAuthState());
  const [menuOpen, setMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [flashMessage, setFlashMessage] = useState("");
  const protectedPrefixes = useMemo(() => ["/admin", "/add", "/edit/", "/reports"], []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("bestmotors-theme", theme);
  }, [theme]);

  const loadAuth = () => {
    api.get("auth/status/").then((res) => {
      const nextAuth = { checked: true, ...res.data };
      setAuth(nextAuth);
      setCachedAuthState(nextAuth);
    }).catch(() => {
      const nextAuth = { checked: true, is_authenticated: false, username: "", is_staff: false };
      setAuth(nextAuth);
      clearCachedAuthState();
    });
  };

  useEffect(() => {
    loadAuth();
  }, [location.pathname]);

  useEffect(() => {
    window.addEventListener("auth-changed", loadAuth);
    return () => window.removeEventListener("auth-changed", loadAuth);
  }, []);

  const handleLogout = async () => {
    await api.post("auth/logout/");
    clearCachedAuthState();
    setAuth({ checked: true, is_authenticated: false, username: "", is_staff: false });
    setFlashMessage("Logged out.");
    window.dispatchEvent(new Event("auth-changed"));
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!flashMessage) return undefined;
    const timer = window.setTimeout(() => setFlashMessage(""), 2800);
    return () => window.clearTimeout(timer);
  }, [flashMessage]);

  useEffect(() => {
    if (!auth.checked || auth.is_authenticated) return;
    const isProtectedPage = protectedPrefixes.some((prefix) => location.pathname.startsWith(prefix));
    if (isProtectedPage) {
      navigate("/", { replace: true });
    }
  }, [auth.checked, auth.is_authenticated, location.pathname, navigate, protectedPrefixes]);

  const goToAddVehicle = () => {
    setMenuOpen(false);
    navigate("/add");
  };

  const goToStockManager = () => {
    setMenuOpen(false);
    navigate("/admin");
  };

  const goToReports = () => {
    setMenuOpen(false);
    navigate("/reports");
  };

  const goToLogin = () => {
    const from = location.pathname === "/login"
      ? { pathname: "/" }
      : { pathname: location.pathname, search: location.search, hash: location.hash };
    navigate("/login", { state: { from } });
  };

  useEffect(() => {
    const isTypingTarget = (target) => {
      const tag = target?.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setShortcutsOpen(false);
        return;
      }

      if (event.key === "/" && !isTypingTarget(event.target)) {
        event.preventDefault();
        window.dispatchEvent(new Event("app-search-shortcut"));
        return;
      }

      if (isTypingTarget(event.target)) return;

      const key = event.key.toLowerCase();
      if (key === "?" || (event.shiftKey && key === "/")) {
        event.preventDefault();
        setShortcutsOpen((open) => !open);
        return;
      }
      if (key === "t" && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        setTheme((current) => (current === "dark" ? "light" : "dark"));
        return;
      }
      if (!event.altKey || event.ctrlKey || event.metaKey) return;

      const protectedNavigate = (path) => {
        if (auth.is_authenticated) {
          navigate(path);
          return;
        }
        navigate("/login", { state: { from: { pathname: path } } });
      };

      if (key === "f") {
        event.preventDefault();
        navigate("/");
      } else if (key === "a") {
        event.preventDefault();
        protectedNavigate("/add");
      } else if (key === "s") {
        event.preventDefault();
        protectedNavigate("/admin");
      } else if (key === "r") {
        event.preventDefault();
        protectedNavigate("/reports");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [auth.is_authenticated, navigate, theme, location.pathname, location.search, location.hash]);

  const navLinks = useMemo(() => [{ to: "/", label: "Fleet", icon: FiGrid }], []);
  const accountButtonStyle = {
    appearance: "none",
    WebkitAppearance: "none",
    border: 0,
    outline: 0,
    background: "var(--accent)",
    backgroundImage: "none",
    boxShadow: "0 4px 16px var(--accent-glow)",
    clipPath: "inset(0 round 10px)",
    color: "#fff",
    overflow: "hidden",
    textShadow: "none",
    WebkitTextStroke: 0,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <nav
        style={{
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--nav-bg)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div
          style={{
            maxWidth: "1680px",
            margin: "0 auto",
            padding: "10px clamp(16px, 2.5vw, 40px)",
            minHeight: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <Link to="/" className="brand-lockup">
            <motion.div
              whileHover={{ scale: 1.04 }}
              className="brand-mark-wrap"
            >
              <img src={brandLogo} alt="" className="brand-mark" />
            </motion.div>
            <span className="brand-wordmark" aria-label="Best Motors">
              <span className="brand-best">BEST</span>
              <span className="brand-motors">MOTORS</span>
            </span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto", flexWrap: "wrap" }}>
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} style={{ textDecoration: "none" }}>
                <UIButton
                  style={{
                    background: location.pathname === to ? "var(--accent-dim)" : "transparent",
                    color: location.pathname === to ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  <Icon size={14} />
                  {label}
                </UIButton>
              </Link>
            ))}

            <UIIconButton
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <FiSun size={15} /> : <FiMoon size={15} />}
            </UIIconButton>

            {auth.is_authenticated ? (
              <div style={{ position: "relative" }}>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <UIButton
                    variant="primary"
                    onClick={() => setMenuOpen(!menuOpen)}
                    style={accountButtonStyle}
                  >
                    <FiUser size={14} strokeWidth={2.5} />
                    <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#fff", textShadow: "none", WebkitTextStroke: 0 }}>
                      {auth.username}
                    </span>
                    <FiChevronDown size={14} />
                  </UIButton>
                </motion.div>
                {menuOpen && (
                  <UICard
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      minWidth: "190px",
                      padding: "8px",
                      zIndex: 100,
                      boxShadow: "0 18px 50px rgba(0,0,0,0.28)",
                    }}
                  >
                    <button className="menu-action" onClick={goToAddVehicle}>
                      <FiPlus size={14} />
                      Add New Vehicle
                    </button>
                    <button className="menu-action" onClick={goToStockManager}>
                      <FiPackage size={14} />
                      Stock Manager
                    </button>
                    <button className="menu-action" onClick={goToReports}>
                      <FiBarChart2 size={14} />
                      Reports
                    </button>
                    <button className="menu-action" onClick={() => { setShortcutsOpen(true); setMenuOpen(false); }}>
                      <FiCommand size={14} />
                      Shortcuts
                    </button>
                    <button className="menu-action" onClick={handleLogout}>
                      <FiLogOut size={14} />
                      Logout
                    </button>
                  </UICard>
                )}
              </div>
            ) : (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <UIButton variant="primary" onClick={goToLogin} style={accountButtonStyle}>
                  <FiLogIn size={14} strokeWidth={2.5} />
                  <span style={{ color: "#fff", textShadow: "none", WebkitTextStroke: 0 }}>Login</span>
                </UIButton>
              </motion.div>
            )}
          </div>
        </div>
      </nav>

      {shortcutsOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 180, background: "rgba(0,0,0,0.58)", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px" }} onClick={() => setShortcutsOpen(false)}>
          <UICard style={{ width: "min(520px, 100%)", padding: "22px", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FiCommand size={18} color="var(--accent)" />
                <h2 className="bebas" style={{ fontSize: "28px", letterSpacing: "1.8px", lineHeight: 1 }}>SHORTCUTS</h2>
              </div>
              <button className="btn-ghost" type="button" onClick={() => setShortcutsOpen(false)} style={{ padding: "8px 10px" }}>Esc</button>
            </div>
            <div style={{ display: "grid", gap: "8px" }}>
              {[
                ["Alt + F", "Fleet"],
                ["Alt + S", "Stock manager"],
                ["Alt + A", "Add vehicle"],
                ["Alt + R", "Reports"],
                ["/", "Focus search"],
                ["T", "Toggle theme"],
                ["?", "Show shortcuts"],
              ].map(([keys, label]) => (
                <div key={keys} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--surface2)" }}>
                  <span style={{ color: "var(--text)", fontWeight: 700, fontSize: "13px" }}>{label}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: 700 }}>{keys}</span>
                </div>
              ))}
            </div>
          </UICard>
        </div>
      )}

      <main style={{ maxWidth: "1680px", margin: "0 auto", padding: "clamp(20px, 2.5vw, 40px) clamp(16px, 2.5vw, 40px)" }}>
        {flashMessage && (
          <div style={{ marginBottom: "14px", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border-accent)", background: "var(--accent-dim)", color: "var(--text)", fontSize: "13px", fontWeight: 700 }}>
            {flashMessage}
          </div>
        )}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
          {children}
        </motion.div>
      </main>
    </div>
  );
}

export default Layout;
