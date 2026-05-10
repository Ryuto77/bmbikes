import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiBarChart2, FiDownload, FiFileText, FiLogIn, FiRefreshCw } from "react-icons/fi";
import api from "../api/axios";
import { clearCachedAuthState, getCachedAuthState, setCachedAuthState } from "../api/authCache";
import Layout from "../components/Layout";
import { UICard } from "../components/ui";
import usePageTitle from "../hooks/usePageTitle";

const numericValue = (vehicle, key) => Number(vehicle?.[key] || 0);
const vehicleProfit = (vehicle) => numericValue(vehicle, "profit");
const vehicleInvestment = (vehicle) => numericValue(vehicle, "purchase_amount") + numericValue(vehicle, "total_expense");
const chartColors = {
  purchase: "#64748b",
  expenses: "#f59e0b",
  sales: "#2563eb",
  profit: "#16a34a",
  loss: "#dc2626",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function StatTile({ label, value, tone }) {
  return (
    <div style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--surface)", minHeight: "68px", display: "grid", alignContent: "space-between", minWidth: 0 }}>
      <div style={{ fontSize: "19px", fontWeight: 800, color: tone || "var(--text)", lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

function ReportSection({ title, children }) {
  return (
    <section style={{ padding: "12px", borderRadius: "12px", background: "var(--surface2)", border: "1px solid var(--border)", minWidth: 0 }}>
      <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
        {title}
      </div>
      {children}
    </section>
  );
}

function StockReports() {
  const location = useLocation();
  const navigate = useNavigate();
  const cachedAuth = getCachedAuthState();
  const [vehicles, setVehicles] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [auth, setAuth] = useState(() => cachedAuth);
  const [loading, setLoading] = useState(!cachedAuth.checked || cachedAuth.is_authenticated);
  const [activityLoading, setActivityLoading] = useState(false);
  const [auditExpanded, setAuditExpanded] = useState(false);

  usePageTitle("Reports");

  const loadActivity = async () => {
    setActivityLoading(true);
    try {
      const res = await api.get("activity/");
      setActivityLogs(res.data);
    } catch {
      setActivityLogs([]);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    if (cachedAuth.checked && cachedAuth.is_authenticated) {
      setActivityLoading(true);
      Promise.allSettled([api.get("vehicles/"), api.get("activity/")]).then(([vehicleResult, activityResult]) => {
        if (vehicleResult.status === "fulfilled") setVehicles(vehicleResult.value.data);
        if (activityResult.status === "fulfilled") setActivityLogs(activityResult.value.data);
        else setActivityLogs([]);
        setLoading(false);
        setActivityLoading(false);
      });
    }

    api.get("auth/status/").then((res) => {
      const nextAuth = { checked: true, ...res.data };
      setAuth(nextAuth);
      setCachedAuthState(nextAuth);
      if (res.data.is_authenticated) {
        setActivityLoading(true);
        Promise.allSettled([api.get("vehicles/"), api.get("activity/")]).then(([vehicleResult, activityResult]) => {
          if (vehicleResult.status === "fulfilled") setVehicles(vehicleResult.value.data);
          if (activityResult.status === "fulfilled") setActivityLogs(activityResult.value.data);
          else setActivityLogs([]);
          setLoading(false);
          setActivityLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch(() => {
      setAuth({ checked: true, is_authenticated: false });
      clearCachedAuthState();
      setLoading(false);
    });
  }, [cachedAuth.checked, cachedAuth.is_authenticated]);

  useEffect(() => {
    const refreshReports = () => {
      if (!auth.is_authenticated) return;
      Promise.allSettled([api.get("vehicles/"), api.get("activity/")]).then(([vehicleResult, activityResult]) => {
        if (vehicleResult.status === "fulfilled") setVehicles(vehicleResult.value.data);
        if (activityResult.status === "fulfilled") setActivityLogs(activityResult.value.data);
      });
    };
    window.addEventListener("vehicles-changed", refreshReports);
    return () => window.removeEventListener("vehicles-changed", refreshReports);
  }, [auth.is_authenticated]);

  const visibleActivityLogs = auditExpanded ? activityLogs : activityLogs.slice(0, 5);

  const summary = useMemo(() => {
    const purchase = vehicles.reduce((total, vehicle) => total + numericValue(vehicle, "purchase_amount"), 0);
    const expenses = vehicles.reduce((total, vehicle) => total + numericValue(vehicle, "total_expense"), 0);
    const sales = vehicles.reduce((total, vehicle) => total + numericValue(vehicle, "sale_amount"), 0);
    const soldVehicles = vehicles.filter((vehicle) => vehicle.status === "sold");
    const realizedProfit = soldVehicles.reduce((total, vehicle) => total + vehicleProfit(vehicle), 0);
    return {
      total: vehicles.length,
      inStock: vehicles.filter((vehicle) => vehicle.status !== "sold").length,
      sold: soldVehicles.length,
      purchase,
      expenses,
      sales,
      investment: purchase + expenses,
      realizedProfit,
      averageProfit: soldVehicles.length ? realizedProfit / soldVehicles.length : 0,
    };
  }, [vehicles]);

  const chartRows = useMemo(() => {
    const buckets = new Map();
    const add = (date, key, amount) => {
      if (!date || !amount) return;
      const month = new Date(date);
      const bucketKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
      const label = month.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      const bucket = buckets.get(bucketKey) || { key: bucketKey, label, purchase: 0, sales: 0, expenses: 0, profit: 0 };
      bucket[key] += Number(amount || 0);
      bucket.profit = bucket.sales - (bucket.purchase + bucket.expenses);
      buckets.set(bucketKey, bucket);
    };

    vehicles.forEach((vehicle) => {
      add(vehicle.purchase_date, "purchase", vehicle.purchase_amount);
      add(vehicle.sale_date, "sales", vehicle.sale_amount);
      add(vehicle.latest_expense_date, "expenses", vehicle.total_expense);
    });

    return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-12);
  }, [vehicles]);

  const maxChartValue = Math.max(1, ...chartRows.flatMap((row) => [row.purchase, row.sales, row.expenses, Math.abs(row.profit)]));
  const highestSaleVehicles = useMemo(
    () => [...vehicles].filter((vehicle) => numericValue(vehicle, "sale_amount") > 0).sort((a, b) => numericValue(b, "sale_amount") - numericValue(a, "sale_amount")).slice(0, 3),
    [vehicles]
  );

  const exportCsv = () => {
    const headers = ["Plate", "Brand", "Model", "Year", "KM", "Status", "Purchase", "Purchase Date", "Expenses", "Sale", "Sale Date", "Investment", "Profit"];
    const rows = vehicles.map((vehicle) => [
      vehicle.vehicle_number,
      vehicle.brand,
      vehicle.model,
      vehicle.year,
      vehicle.km_driven || "",
      vehicle.status === "sold" ? "Sold" : "In Stock",
      vehicle.purchase_amount,
      vehicle.purchase_date || "",
      vehicle.total_expense,
      vehicle.sale_amount,
      vehicle.sale_date || "",
      vehicleInvestment(vehicle),
      vehicleProfit(vehicle),
    ]);
    downloadFile("vehicle-stock-report.csv", [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n"), "text/csv;charset=utf-8");
  };

  const exportPdf = () => {
    const rows = vehicles.map((vehicle) => `
      <tr>
        <td>${vehicle.vehicle_number}</td>
        <td>${vehicle.brand} ${vehicle.model}</td>
        <td>${vehicle.status === "sold" ? "Sold" : "In Stock"}</td>
        <td>${formatCurrency(vehicleInvestment(vehicle))}</td>
        <td>${formatCurrency(vehicle.sale_amount)}</td>
        <td>${formatCurrency(vehicleProfit(vehicle))}</td>
      </tr>
    `).join("");
    const report = window.open("", "_blank", "width=1100,height=800");
    report.document.write(`
      <html>
        <head>
          <title>Vehicle Stock Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #111; }
            h1 { margin: 0 0 8px; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 22px 0; }
            .tile { border: 1px solid #ddd; padding: 12px; border-radius: 8px; }
            .label { font-size: 12px; color: #555; }
            .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border-bottom: 1px solid #ddd; padding: 9px; text-align: left; font-size: 12px; }
            th { background: #f4f4f4; }
          </style>
        </head>
        <body>
          <h1>Vehicle Stock Report</h1>
          <div>Generated ${new Date().toLocaleString("en-IN")}</div>
          <div class="summary">
            <div class="tile"><div class="label">Vehicles</div><div class="value">${vehicles.length}</div></div>
            <div class="tile"><div class="label">Investment</div><div class="value">${formatCurrency(summary.investment)}</div></div>
            <div class="tile"><div class="label">Sales</div><div class="value">${formatCurrency(summary.sales)}</div></div>
            <div class="tile"><div class="label">Realized Profit</div><div class="value">${formatCurrency(summary.realizedProfit)}</div></div>
          </div>
          <table>
            <thead><tr><th>Plate</th><th>Vehicle</th><th>Status</th><th>Investment</th><th>Sale</th><th>Profit</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    report.document.close();
  };

  return (
    <Layout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px", flexWrap: "wrap", marginBottom: "14px" }}>
        <div>
          <h1 className="bebas" style={{ fontSize: "34px", letterSpacing: "2px", lineHeight: 1, marginBottom: "4px" }}>REPORTS</h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Investment, sales, expenses, and profit overview</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button className="btn-ghost" type="button" onClick={exportCsv} disabled={loading} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FiDownload size={14} />
            CSV
          </button>
          <button className="btn-accent" type="button" onClick={exportPdf} disabled={loading} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FiFileText size={14} />
            PDF
          </button>
        </div>
      </div>

      {loading || !auth.checked ? (
        <UICard style={{ padding: "32px", color: "var(--text-muted)", textAlign: "center" }}>Loading reports...</UICard>
      ) : !auth.is_authenticated ? (
        <UICard style={{ padding: "32px", color: "var(--text-muted)", textAlign: "center", display: "grid", justifyItems: "center", gap: "14px" }}>
          <div>Login to view reports.</div>
          <button
            className="btn-accent"
            type="button"
            onClick={() => navigate("/login", { state: { from: { pathname: location.pathname, search: location.search, hash: location.hash } } })}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <FiLogIn size={14} />
            Login
          </button>
        </UICard>
      ) : (
        <UICard style={{ padding: "12px", display: "grid", gap: "12px", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", padding: "10px 12px", borderRadius: "12px", background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>Report Overview</div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>Fleet numbers, money flow, and recent changes.</div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700 }}>Vehicles: {summary.total}</span>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700 }}>Sold: {summary.sold}</span>
            </div>
          </div>

          <div className="reports-summary-grid" style={{ display: "grid", gridTemplateColumns: "0.8fr 1.35fr 0.85fr", gap: "12px", alignItems: "stretch" }}>
            <ReportSection title="Inventory">
              <div className="reports-inventory-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px" }}>
                <StatTile label="Vehicles" value={summary.total} tone="var(--accent)" />
                <StatTile label="In Stock" value={summary.inStock} />
                <StatTile label="Sold" value={summary.sold} />
              </div>
            </ReportSection>

            <ReportSection title="Money Flow">
              <div className="reports-money-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "8px" }}>
                <StatTile label="Purchase" value={formatCurrency(summary.purchase)} />
                <StatTile label="Expenses" value={formatCurrency(summary.expenses)} />
                <StatTile label="Investment" value={formatCurrency(summary.investment)} />
                <StatTile label="Sales" value={formatCurrency(summary.sales)} />
              </div>
            </ReportSection>

            <ReportSection title="Profit">
              <div className="reports-profit-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
                <StatTile label="Realized" value={formatCurrency(summary.realizedProfit)} tone={summary.realizedProfit >= 0 ? "var(--success)" : "var(--danger)"} />
                <StatTile label="Average" value={formatCurrency(summary.averageProfit)} />
              </div>
            </ReportSection>
          </div>

          <div className="reports-main-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(340px, 0.65fr)", gap: "12px", alignItems: "stretch" }}>
            <section style={{ padding: "12px", borderRadius: "12px", background: "var(--surface2)", border: "1px solid var(--border)", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <FiBarChart2 size={16} color="var(--accent)" />
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Monthly Trend</span>
              </div>
              {chartRows.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>Add purchase, expense, or sale dates to show charts.</div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${chartRows.length}, minmax(58px, 1fr))`, gap: "8px", overflowX: "auto" }}>
                    {chartRows.map((row) => (
                      <div key={row.key} style={{ display: "grid", gap: "6px", minWidth: "58px" }}>
                        <div style={{ height: "138px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px", alignItems: "end", padding: "7px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px" }}>
                          {[
                            ["Purchase", row.purchase, chartColors.purchase],
                            ["Expense", row.expenses, chartColors.expenses],
                            ["Sales", row.sales, chartColors.sales],
                            ["Profit", Math.abs(row.profit), row.profit >= 0 ? chartColors.profit : chartColors.loss],
                          ].map(([label, value, color]) => (
                            <div key={label} title={`${label}: ${formatCurrency(value)}`} style={{ height: `${Math.max(4, (value / maxChartValue) * 100)}%`, background: color, borderRadius: "5px 5px 2px 2px", opacity: 0.9 }} />
                          ))}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>{row.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="reports-chart-extra-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 0.55fr)", gap: "10px", marginTop: "12px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "8px" }}>
                      {[
                        ["Purchase", chartColors.purchase],
                        ["Expense", chartColors.expenses],
                        ["Sales", chartColors.sales],
                        ["Profit", chartColors.profit],
                      ].map(([label, color]) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "8px 9px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--surface)", minWidth: 0 }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: color, flex: "0 0 auto" }} />
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ border: "1px solid var(--border)", borderRadius: "10px", background: "var(--surface)", padding: "10px", minWidth: 0 }}>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>Highest Sales</div>
                      {[0, 1, 2].map((index) => {
                        const vehicle = highestSaleVehicles[index];
                        return (
                        <div key={vehicle?.id || vehicle?.vehicle_number || `sale-slot-${index}`} style={{ display: "grid", gridTemplateColumns: "24px minmax(0, 1fr) auto", gap: "8px", padding: "6px 0", borderTop: "1px solid var(--border)", alignItems: "center" }}>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 900 }}>#{index + 1}</span>
                          <span style={{ fontSize: "12px", color: vehicle ? "var(--text)" : "var(--text-muted)", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vehicle?.vehicle_number || "No sale yet"}</span>
                          <span style={{ fontSize: "12px", color: vehicle ? "var(--success)" : "var(--text-muted)", fontWeight: 900 }}>{vehicle ? formatCurrency(vehicle.sale_amount) : "-"}</span>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </section>

            <section style={{ padding: "12px", borderRadius: "12px", background: "var(--surface2)", border: "1px solid var(--border)", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Recent Activity</div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {activityLogs.length > 5 && (
                    <button className="btn-ghost" type="button" onClick={() => setAuditExpanded(!auditExpanded)} style={{ padding: "7px 9px", fontSize: "12px" }}>
                      {auditExpanded ? "Show Less" : `Show More (${activityLogs.length})`}
                    </button>
                  )}
                  <button className="btn-ghost" type="button" onClick={loadActivity} disabled={activityLoading} style={{ padding: "8px", display: "flex" }} title="Refresh activity">
                    <FiRefreshCw size={14} />
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gap: "7px" }}>
                {activityLoading && activityLogs.length === 0 ? (
                  <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>Loading activity...</div>
                ) : activityLogs.length === 0 ? (
                  <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>No activity recorded yet.</div>
                ) : visibleActivityLogs.map((log) => (
                  <div key={log.id} className="audit-log-row" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "10px", padding: "8px 10px", borderRadius: "10px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{log.action}{log.vehicle_number ? ` - ${log.vehicle_number}` : ""}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.details || "No details"}</div>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap", textAlign: "right" }}>
                      <div style={{ color: "var(--text)", fontWeight: 700 }}>{log.actor || "System"}</div>
                      <div>{formatDate(log.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </UICard>
      )}
    </Layout>
  );
}

export default StockReports;
