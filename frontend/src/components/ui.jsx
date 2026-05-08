export function UIButton({ children, variant = "ghost", style, ...props }) {
  const base = {
    padding: "9px 16px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    fontFamily: "Outfit, sans-serif",
    cursor: "pointer",
    border: "1px solid var(--border)",
    transition: "all 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  };

  const variants = {
    ghost: {
      background: "transparent",
      color: "var(--text-muted)",
    },
    primary: {
      background: "var(--accent)",
      color: "#fff",
      border: "1px solid transparent",
      boxShadow: "0 4px 16px var(--accent-glow)",
    },
  };

  return <button style={{ ...base, ...variants[variant], ...style }} {...props}>{children}</button>;
}

export function UIIconButton({ children, style, ...props }) {
  return (
    <button
      style={{
        width: "34px",
        height: "34px",
        borderRadius: "9px",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--text-muted)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s ease",
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function UICard({ children, style, className, ...props }) {
  return (
    <div
      className={className}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
