import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../api/axios";
import { getCachedVehicleDetail, setCachedVehicleDetail } from "../api/publicCache";
import Layout from "../components/Layout";
import usePageTitle from "../hooks/usePageTitle";
import {
  FiActivity,
  FiAlertCircle,
  FiArrowLeft,
  FiCalendar,
  FiDollarSign,
  FiEdit2,
  FiFileText,
  FiImage,
  FiInfo,
  FiTrendingDown,
  FiTrendingUp,
} from "react-icons/fi";

function isPdfDocument(url = "") {
  return /\.pdf(\?|$)/i.test(url);
}

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

function normalizeMedia(item) {
  if (!item) return null;
  if (typeof item === "string") return { url: item, media_type: "image" };
  const url = item.url || item.image || item.file;
  if (!url) return null;
  return { ...item, url, media_type: item.media_type || (/\.(mp4|mov|webm|m4v|avi)(\?|$)/i.test(url) ? "video" : "image") };
}

function mediaKey(item) {
  const url = item?.url || "";
  try {
    return new URL(url).pathname;
  } catch {
    return url.split("?")[0];
  }
}

function MediaFrame({ media, style }) {
  if (!media) {
    return <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "var(--text-muted)" }}>No media</div>;
  }
  if (media.media_type === "video") {
    return <video src={media.url} autoPlay loop controls muted playsInline style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#000", ...style }} />;
  }
  return <img src={media.url} alt="" style={{ width: "100%", height: "100%", objectFit: media.isCover ? "cover" : "contain", display: "block", background: "var(--surface)", ...style }} />;
}

function Panel({ title, icon: Icon, children, style }) {
  return (
    <section style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px", minWidth: 0, height: "100%", ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: "7px", minHeight: "18px", marginBottom: "10px" }}>
        {Icon && <Icon size={15} color="var(--accent)" />}
        <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {title}
        </span>
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, sub, color, icon: Icon, style }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px", minHeight: "88px", display: "grid", alignContent: "space-between", minWidth: 0, ...style }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 800 }}>
          {label}
        </span>
        {Icon && <Icon size={14} color={color || "var(--text-muted)"} />}
      </div>
      <div>
        <div style={{ fontSize: "20px", fontWeight: 800, color: color || "var(--text)", lineHeight: 1.1 }}>
          {formatCurrency(value)}
        </div>
        {sub && <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{sub}</div>}
      </div>
    </div>
  );
}

function InfoGrid({ rows }) {
  return (
    <div className="vehicle-info-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
      {rows.map(([label, value]) => (
        <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "9px 11px", minHeight: "56px", minWidth: 0, display: "grid", alignContent: "center" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "4px" }}>{label}</div>
          <div style={{ fontSize: "14px", color: "var(--text)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || "-"}</div>
        </div>
      ))}
    </div>
  );
}

function StatusSummary({ isSold }) {
  return (
    <div style={{ minWidth: "122px", padding: "8px 12px", borderRadius: "10px", border: "1px solid var(--border)", background: isSold ? "var(--sold-bg)" : "var(--unsold-bg)", display: "grid", gap: "2px" }}>
      <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.4px" }}>Stock Status</span>
      <span style={{ fontSize: "13px", color: isSold ? "var(--success)" : "var(--danger)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4px" }}>{isSold ? "Sold" : "In Stock"}</span>
    </div>
  );
}

function vehicleListItemToDetail(vehicle) {
  if (!vehicle) return null;
  const purchaseAmount = Number(vehicle.purchase_amount || 0);
  const saleAmount = Number(vehicle.sale_amount || 0);
  const totalExpense = Number(vehicle.total_expense || 0);
  return {
    vehicle: {
      id: vehicle.id,
      name: vehicle.name,
      vehicle_number: vehicle.vehicle_number,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      km_driven: vehicle.km_driven,
      cover_image: vehicle.cover_image,
      images: vehicle.images || [],
      documents: vehicle.documents || [],
    },
    purchase: { id: null, amount: purchaseAmount, date: vehicle.purchase_date || null },
    sale: { id: null, amount: saleAmount, date: vehicle.sale_date || null },
    expenses: [],
    total_expense: totalExpense,
    total_investment: purchaseAmount + totalExpense,
    status: vehicle.status || "unsold",
    profit: Number(vehicle.profit || 0),
  };
}

function VehicleDetail() {
  const { number } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState("");
  const [auth, setAuth] = useState({ checked: false, is_authenticated: false });
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  usePageTitle(data?.vehicle?.vehicle_number || "Vehicle");

  useEffect(() => {
    let active = true;
    const cachedDetail = getCachedVehicleDetail(number);
    if (cachedDetail) setData(cachedDetail);
    setLoadError("");

    api.get(`search/?number=${encodeURIComponent(number)}`).then((res) => {
      if (!active) return;
      if (!res.data?.vehicle) {
        throw new Error(res.data?.error || "Vehicle detail response was incomplete.");
      }
      setData(res.data);
      setCachedVehicleDetail(number, res.data);
      setLoadError("");
    }).catch((err) => {
      if (!active) return;
      api.get(`vehicles/?search=${encodeURIComponent(number)}`).then((fallbackRes) => {
        if (!active) return;
        const vehicles = Array.isArray(fallbackRes.data) ? fallbackRes.data : fallbackRes.data?.results || [];
        const vehicle = vehicles.find((item) => item.vehicle_number === String(number).toUpperCase()) || vehicles[0];
        const fallbackDetail = vehicleListItemToDetail(vehicle);
        if (!fallbackDetail) throw new Error("Vehicle was not found in stock.");
        setData(fallbackDetail);
        setLoadError("");
      }).catch((fallbackErr) => {
        if (!active) return;
        setLoadError(
          fallbackErr.response?.data?.error ||
          err.response?.data?.error ||
          fallbackErr.message ||
          err.message ||
          "Unable to load this vehicle."
        );
        if (!cachedDetail) setData(null);
      });
    });

    api.get("auth/status/").then((res) => {
      if (!active) return;
      setAuth({ checked: true, ...res.data });
    }).catch(() => {
      if (!active) return;
      setAuth({ checked: true, is_authenticated: false });
    });

    return () => {
      active = false;
    };
  }, [number, reloadKey]);

  useEffect(() => {
    const refreshDetail = (event) => {
      const changedNumber = event.detail?.vehicleNumber;
      if (!changedNumber || String(changedNumber).toUpperCase() === String(number).toUpperCase()) {
        setReloadKey((current) => current + 1);
      }
    };
    window.addEventListener("vehicles-changed", refreshDetail);
    return () => window.removeEventListener("vehicles-changed", refreshDetail);
  }, [number]);

  useEffect(() => {
    const documents = data?.vehicle?.documents || [];
    const selectedDocument = documents.find((document) => document.id === selectedDocumentId);
    if (!selectedDocument?.file) {
      setDocumentPreviewUrl("");
      return undefined;
    }

    let active = true;
    let objectUrl = "";
    fetch(selectedDocument.file, { credentials: "include" })
      .then((res) => res.blob())
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setDocumentPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (active) setDocumentPreviewUrl(selectedDocument.file);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [data, selectedDocumentId]);

  if (!data && loadError) {
    return (
      <Layout>
        <div style={{ display: "grid", placeItems: "center", minHeight: "42vh", padding: "24px" }}>
          <div style={{ maxWidth: "520px", width: "100%", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--surface)", padding: "20px", textAlign: "center" }}>
            <FiAlertCircle size={26} color="var(--danger)" style={{ marginBottom: "10px" }} />
            <div style={{ color: "var(--text)", fontWeight: 800, marginBottom: "6px" }}>Vehicle could not be loaded</div>
            <div style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "16px" }}>{loadError}</div>
            <button className="btn-accent" type="button" onClick={() => navigate("/")}>Back to fleet</button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div style={{ display: "grid", placeItems: "center", height: "40vh", color: "var(--text-muted)", fontSize: "14px" }}>Loading vehicle...</div>
      </Layout>
    );
  }

  const { vehicle, purchase, sale, expenses = [], total_expense = 0, profit = 0, status } = data;
  const coverMedia = normalizeMedia(vehicle.cover_image);
  if (coverMedia) coverMedia.isCover = true;
  const galleryMedia = (vehicle.images || []).map(normalizeMedia).filter(Boolean);
  const allImages = [coverMedia, ...galleryMedia].filter((item, index, items) => item && items.findIndex((candidate) => mediaKey(candidate) === mediaKey(item)) === index);
  const documents = vehicle.documents || [];
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) || null;
  const isSold = status === "sold";
  const profitPositive = profit >= 0;
  const investmentTotal = Number(purchase?.amount || 0) + Number(total_expense || 0);

  return (
    <Layout>
      <button
        onClick={() => navigate("/")}
        style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "16px", background: "transparent", border: 0, cursor: "pointer", color: "var(--text-muted)", fontSize: "14px", fontFamily: "Outfit, sans-serif", padding: 0 }}
      >
        <FiArrowLeft size={16} />
        Back to fleet
      </button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "12px",
          display: "grid",
          gap: "12px",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px", minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px", flexWrap: "wrap" }}>
              <h1 className="bebas" style={{ fontSize: "36px", letterSpacing: "2px", color: "var(--text)", lineHeight: 1 }}>
                {vehicle.vehicle_number}
              </h1>
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {vehicle.brand} {vehicle.model} - {vehicle.year}{vehicle.km_driven ? ` - ${vehicle.km_driven.toLocaleString("en-IN")} km` : ""}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <StatusSummary isSold={isSold} />
            {auth.is_authenticated && (
              <button className="btn-accent" onClick={() => navigate(`/edit/${vehicle.vehicle_number}`)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 14px" }}>
                <FiEdit2 size={14} />
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="vehicle-detail-grid" style={{ display: "grid", gridTemplateColumns: "minmax(360px, 0.9fr) minmax(420px, 1.1fr)", gap: "12px", alignItems: "start", minWidth: 0 }}>
          <Panel title="Gallery" icon={FiImage} style={{ gridColumn: "1", gridRow: "1 / span 2" }}>
            <div style={{ borderRadius: "10px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)", aspectRatio: "var(--vehicle-image-ratio)" }}>
              {allImages.length > 0 ? (
                <MediaFrame media={allImages[imgIdx]} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "var(--text-muted)" }}>No image</div>
              )}
            </div>

            {allImages.length > 1 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: "8px", marginTop: "8px" }}>
                {allImages.map((media, i) => (
                  <button key={mediaKey(media)} type="button" onClick={() => setImgIdx(i)} style={{ aspectRatio: "var(--vehicle-image-ratio)", borderRadius: "8px", overflow: "hidden", cursor: "pointer", border: `2px solid ${i === imgIdx ? "var(--accent)" : "transparent"}`, padding: 0, background: "var(--surface2)", opacity: i === imgIdx ? 1 : 0.55, position: "relative" }}>
                    <MediaFrame media={media} />
                    {media.media_type === "video" && <span style={{ position: "absolute", right: "5px", bottom: "5px", padding: "2px 5px", borderRadius: "999px", background: "rgba(0,0,0,0.68)", color: "#fff", fontSize: "10px", fontWeight: 800 }}>VIDEO</span>}
                  </button>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Vehicle Information" icon={FiInfo} style={{ gridColumn: "2", gridRow: "1" }}>
            <InfoGrid
              rows={[
                ["Plate", vehicle.vehicle_number],
                ["Brand", vehicle.brand],
                ["Model", vehicle.model],
                ["Year", vehicle.year],
                ["ODO", vehicle.km_driven ? `${vehicle.km_driven.toLocaleString("en-IN")} km` : "Not set"],
                ["Media", `${allImages.length} item${allImages.length !== 1 ? "s" : ""}`],
              ]}
            />
          </Panel>

          <Panel title="Stock Status" icon={FiInfo} style={{ gridColumn: "1", gridRow: "3" }}>
            <div style={{ display: "grid", gap: "7px" }}>
              {[
                ["Status", isSold ? "Sold" : "In Stock"],
                ["Investment", formatCurrency(investmentTotal)],
                ["Purchase", purchase?.date || "Not set"],
                ["Sale", sale?.date || (isSold ? "Not set" : "Not sold")],
                ["Documents", documents.length],
                ["Media", allImages.length],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "grid", gridTemplateColumns: "88px minmax(0, 1fr)", gap: "10px", alignItems: "center", minHeight: "30px", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "9px", background: "var(--surface)" }}>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.35px" }}>{label}</span>
                  <span style={{ fontSize: "13px", color: label === "Status" ? (isSold ? "var(--success)" : "var(--danger)") : "var(--text)", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{value || "-"}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Finance Summary" icon={FiDollarSign} style={{ gridColumn: "2", gridRow: "2" }}>
            <div className="vehicle-metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
              <MetricCard label="Purchase" value={purchase?.amount} sub={purchase?.date} icon={FiDollarSign} />
              <MetricCard label="Total Expenses" value={total_expense} sub={`${expenses.length} item${expenses.length !== 1 ? "s" : ""}`} icon={FiActivity} />
              {isSold && <MetricCard label="Sale Price" value={sale?.amount} sub={sale?.date} icon={FiTrendingUp} color="var(--success)" />}
              <MetricCard label={isSold ? "Profit / Loss" : "Investment"} value={Math.abs(profit)} sub={isSold ? (profitPositive ? "Profit" : "Loss") : "Total invested"} icon={profitPositive ? FiTrendingUp : FiTrendingDown} color={isSold ? (profitPositive ? "var(--success)" : "var(--danger)") : "var(--accent)"} />
            </div>
          </Panel>

          <Panel title="Expense Breakdown" icon={FiActivity} style={{ gridColumn: "2", gridRow: "3" }}>
            {expenses.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>No expenses recorded</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", minHeight: "248px" }}>
                <div style={{ display: "grid", gap: "6px", flex: 1, maxHeight: "196px", overflowY: "auto", paddingRight: "2px", minHeight: 0 }}>
                  {expenses.map((expense) => (
                    <div key={expense.id || `${expense.type}-${expense.date}`} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 112px", gap: "8px", alignItems: "center", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "9px", background: "var(--surface)", minHeight: "40px" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "13px", color: "var(--text)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{expense.type}</div>
                        {expense.date && <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}><FiCalendar size={10} style={{ display: "inline", marginRight: "3px" }} />{expense.date}</div>}
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)", textAlign: "right" }}>{formatCurrency(expense.amount)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 9px", borderRadius: "9px", background: "var(--accent-dim)", border: "1px solid var(--border-accent)", marginTop: "auto" }}>
                  <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--text)" }}>Total</span>
                  <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--accent)" }}>{formatCurrency(total_expense)}</span>
                </div>
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Documents" icon={FiFileText}>
          {documents.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>No documents uploaded.</div>
          ) : (
            <div style={{ display: "grid", gap: "12px", minWidth: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
                {documents.map((document) => {
                  const isSelected = selectedDocument?.id === document.id;
                  return (
                    <button key={document.id} type="button" onClick={() => setSelectedDocumentId(isSelected ? null : document.id)} style={{ width: "100%", minHeight: "42px", border: "1px solid", borderColor: isSelected ? "var(--border-accent)" : "var(--border)", background: isSelected ? "var(--accent-dim)" : "var(--surface)", color: isSelected ? "var(--accent)" : "var(--text)", borderRadius: "10px", padding: "8px 10px", textAlign: "left", fontFamily: "Outfit, sans-serif", fontWeight: 800, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={document.title}>
                      {document.title}
                    </button>
                  );
                })}
              </div>
              {selectedDocument ? (
                <div style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", background: "var(--surface)", minWidth: 0 }}>
                  {isPdfDocument(selectedDocument.file) ? (
                    <iframe
                      key={selectedDocument.id}
                      src={documentPreviewUrl || selectedDocument.file}
                      title={selectedDocument.title}
                      style={{ width: "100%", height: "min(72vh, 760px)", border: 0, display: "block", background: "#fff" }}
                    />
                  ) : (
                    <div style={{ display: "grid", placeItems: "center", padding: "12px", background: "var(--surface)" }}>
                      <img
                        key={selectedDocument.id}
                        src={documentPreviewUrl || selectedDocument.file}
                        alt={selectedDocument.title}
                        style={{ width: "100%", maxWidth: "100%", maxHeight: "min(72vh, 760px)", objectFit: "contain", display: "block", borderRadius: "8px", background: "var(--surface)" }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "8px 2px" }}>Click a document to preview it.</div>
              )}
            </div>
          )}
        </Panel>
      </motion.div>
    </Layout>
  );
}

export default VehicleDetail;
