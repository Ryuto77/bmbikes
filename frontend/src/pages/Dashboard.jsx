import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";
import { getCachedVehicles, setCachedVehicles } from "../api/publicCache";
import Layout from "../components/Layout";
import VehicleCard from "../components/VehicleCard";
import {
  FiSearch,
  FiPackage,
  FiCheckCircle,
  FiClock,
  FiArrowUpRight,
  FiLogIn,
  FiTruck,
} from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import { UICard } from "../components/ui";

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <UICard style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          background: accent ? "var(--accent-dim)" : "rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={accent ? "var(--accent)" : "var(--text-muted)"} />
      </div>
      <div>
        <div style={{ fontSize: "22px", fontWeight: 700, color: accent ? "var(--accent)" : "var(--text)" }}>
          {value}
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "1px" }}>{label}</div>
      </div>
      </UICard>
    </motion.div>
  );
}

const FILTERS = ["All", "In Stock", "Sold"];
const SORT_OPTIONS = [
  { value: "model_asc", label: "Model A-Z" },
  { value: "model_desc", label: "Model Z-A" },
  { value: "purchase_price_desc", label: "Purchase price high-low" },
  { value: "purchase_price_asc", label: "Purchase price low-high" },
  { value: "purchase_date_desc", label: "Purchase date newest" },
  { value: "purchase_date_asc", label: "Purchase date oldest" },
  { value: "sold_date_desc", label: "Sold date newest" },
  { value: "sold_date_asc", label: "Sold date oldest" },
  { value: "sale_price_desc", label: "Sold price high-low" },
  { value: "sale_price_asc", label: "Sold price low-high" },
  { value: "expense_desc", label: "Expense high-low" },
  { value: "expense_asc", label: "Expense low-high" },
  { value: "latest_expense_desc", label: "Latest expense date" },
];

const numericValue = (vehicle, key) => Number(vehicle?.[key] || 0);
const dateValue = (vehicle, key) => (vehicle?.[key] ? new Date(vehicle[key]).getTime() : 0);
const textValue = (vehicle, key) => (vehicle?.[key] || "").toString();

function sortVehicles(vehicles, sortBy) {
  const sorted = [...vehicles];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "purchase_price_desc":
        return numericValue(b, "purchase_amount") - numericValue(a, "purchase_amount");
      case "purchase_price_asc":
        return numericValue(a, "purchase_amount") - numericValue(b, "purchase_amount");
      case "purchase_date_desc":
        return dateValue(b, "purchase_date") - dateValue(a, "purchase_date");
      case "purchase_date_asc":
        return dateValue(a, "purchase_date") - dateValue(b, "purchase_date");
      case "sold_date_desc":
        return dateValue(b, "sale_date") - dateValue(a, "sale_date");
      case "sold_date_asc":
        return dateValue(a, "sale_date") - dateValue(b, "sale_date");
      case "sale_price_desc":
        return numericValue(b, "sale_amount") - numericValue(a, "sale_amount");
      case "sale_price_asc":
        return numericValue(a, "sale_amount") - numericValue(b, "sale_amount");
      case "expense_desc":
        return numericValue(b, "total_expense") - numericValue(a, "total_expense");
      case "expense_asc":
        return numericValue(a, "total_expense") - numericValue(b, "total_expense");
      case "latest_expense_desc":
        return dateValue(b, "latest_expense_date") - dateValue(a, "latest_expense_date");
      case "plate_asc":
        return (a.vehicle_number || "").localeCompare(b.vehicle_number || "");
      case "plate_desc":
        return (b.vehicle_number || "").localeCompare(a.vehicle_number || "");
      case "brand_asc":
        return textValue(a, "brand").localeCompare(textValue(b, "brand"));
      case "brand_desc":
        return textValue(b, "brand").localeCompare(textValue(a, "brand"));
      case "model_asc":
        return textValue(a, "model").localeCompare(textValue(b, "model"));
      case "model_desc":
        return textValue(b, "model").localeCompare(textValue(a, "model"));
      default:
        return (a.vehicle_number || "").localeCompare(b.vehicle_number || "");
    }
  });
  return sorted;
}

function FleetFeature({ vehicles, total, inStock, sold, auth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const spotlightVehicles = vehicles.filter((v) => v.status !== "sold");
  const fallbackVehicles = spotlightVehicles.length ? spotlightVehicles : vehicles;
  const vehicle = fallbackVehicles.length ? fallbackVehicles[spotlightIndex % fallbackVehicles.length] : null;
  const soldRate = total ? Math.round((sold / total) * 100) : 0;
  const formatCurrency = (value) => Number(value || 0) ? `₹${Number(value || 0).toLocaleString("en-IN")}` : "Not set";
  const detailTiles = vehicle
    ? [
        ["Year", vehicle.year || "Not set"],
        ["ODO", vehicle.km_driven ? `${Number(vehicle.km_driven).toLocaleString("en-IN")} km` : "Not set"],
        ["Investment", formatCurrency(Number(vehicle.purchase_amount || 0) + Number(vehicle.total_expense || 0))],
      ]
    : [
        ["Year", "-"],
        ["ODO", "-"],
        ["Investment", "-"],
      ];

  useEffect(() => {
    setSpotlightIndex(0);
  }, [fallbackVehicles.length]);

  useEffect(() => {
    if (fallbackVehicles.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setSpotlightIndex((current) => (current + 1) % fallbackVehicles.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [fallbackVehicles.length]);

  return (
    <div
      className="dashboard-feature-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.45fr) minmax(280px, 0.55fr)",
        gap: "16px",
        marginBottom: "28px",
      }}
    >
      <UICard
        className="dashboard-spotlight-card"
        onClick={() => vehicle && navigate(`/vehicle/${vehicle.vehicle_number}`)}
        style={{
          minHeight: "260px",
          overflow: "hidden",
          position: "relative",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 0.85fr)",
          cursor: vehicle ? "pointer" : "default",
        }}
      >
        <div style={{ padding: "26px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "28px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <FiTruck size={16} color="var(--accent)" />
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                Fleet Spotlight
              </span>
            </div>
            <h2 className="bebas" style={{ fontSize: "42px", letterSpacing: "2px", lineHeight: 1, color: "var(--text)", marginBottom: "10px" }}>
              {vehicle ? vehicle.vehicle_number : "NO VEHICLES"}
            </h2>
            <p style={{ fontSize: "15px", color: "var(--text-muted)", maxWidth: "460px" }}>
              {vehicle
                ? `${vehicle.brand} ${vehicle.model} ${vehicle.year ? `(${vehicle.year})` : ""}`
                : "Sign in to manage stock and add the first vehicle."}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
            {detailTiles.map(([label, value]) => (
              <div key={label} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px" }}>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)" }}>{value}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ minHeight: "260px", aspectRatio: "var(--vehicle-image-ratio)", background: "var(--surface2)", position: "relative" }}>
          {vehicle?.cover_image ? (
            <img src={vehicle.cover_image} alt={vehicle.vehicle_number} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FiTruck size={74} color="var(--text-muted)" style={{ opacity: 0.28 }} />
            </div>
          )}
          {vehicle && (
            <div
              style={{
                position: "absolute",
                left: "16px",
                right: "16px",
                bottom: "16px",
                padding: "12px 14px",
                borderRadius: "12px",
                background: "rgba(0,0,0,0.58)",
                color: "#fff",
                backdropFilter: "blur(10px)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 600 }}>{vehicle.km_driven ? `${vehicle.km_driven.toLocaleString()} km` : "Mileage not set"}</span>
              <FiArrowUpRight size={16} />
            </div>
          )}
        </div>
      </UICard>

      <div style={{ display: "grid", gap: "16px" }}>
        <UICard style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Inventory Mix
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", marginTop: "4px" }}>{soldRate}% sold</div>
            </div>
            <FiPackage size={24} color="var(--accent)" />
          </div>
          <div style={{ height: "10px", borderRadius: "999px", background: "var(--surface2)", overflow: "hidden", marginBottom: "10px" }}>
            <div style={{ width: `${soldRate}%`, height: "100%", background: "var(--accent)", borderRadius: "999px" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)" }}>
            <span>{sold} sold</span>
            <span>{soldRate}% sold</span>
          </div>
        </UICard>

        <UICard style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FiLogIn size={18} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{auth?.is_authenticated ? auth.username : "Login"}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{auth?.is_authenticated ? "Manage stock and add vehicles" : "Manage stock after signing in"}</div>
            </div>
          </div>
          <button
            className="btn-accent"
            onClick={() => {
              if (!auth?.checked) return;
              if (auth?.is_authenticated) {
                navigate("/admin");
                return;
              }
              navigate("/login", { state: { from: { pathname: location.pathname, search: location.search, hash: location.hash } } });
            }}
            disabled={!auth?.checked}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            {!auth?.checked ? "Checking Access..." : auth?.is_authenticated ? "Open Stock Manager" : "Login"}
            <FiArrowUpRight size={14} />
          </button>
        </UICard>
      </div>
    </div>
  );
}

function Dashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [auth, setAuth] = useState({ checked: false, is_authenticated: false, username: "" });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("purchase_date_desc");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const searchRef = useRef(null);
  const searchSectionRef = useRef(null);

  useEffect(() => {
    const cachedVehicles = getCachedVehicles();
    if (cachedVehicles) {
      setVehicles(cachedVehicles);
      setLoading(false);
    }

    api.get("vehicles/").then((res) => {
      if (!Array.isArray(res.data)) {
        throw new Error("Vehicle API returned an unexpected response.");
      }
      setVehicles(res.data);
      setCachedVehicles(res.data);
      setLoadError("");
      setLoading(false);
    }).catch((err) => {
      setLoadError(err.message || "Unable to load vehicles from the API.");
      setLoading(false);
    });
    api.get("auth/status/").then((res) => {
      setAuth({ checked: true, ...res.data });
    }).catch(() => {
      setAuth({ checked: true, is_authenticated: false, username: "" });
    });
  }, []);

  useEffect(() => {
    const focusSearch = () => searchRef.current?.focus();
    window.addEventListener("app-search-shortcut", focusSearch);
    return () => window.removeEventListener("app-search-shortcut", focusSearch);
  }, []);

  const scrollSearchSectionIntoView = () => {
    window.requestAnimationFrame(() => {
      searchSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSearchChange = (event) => {
    const nextValue = event.target.value;
    setSearch(nextValue);
    if (/[a-z0-9]/i.test(nextValue)) {
      scrollSearchSectionIntoView();
    }
  };

  const updateVehicleStatus = async (vehicle, status) => {
    setUpdatingStatusId(vehicle.id);
    try {
      const res = await api.post(`vehicles/${vehicle.id}/status/`, { status });
      setVehicles((current) => {
        const next = current.map((item) => (item.id === vehicle.id ? res.data : item));
        setCachedVehicles(next);
        return next;
      });
    } catch (err) {
      alert(err.response?.data?.error || "Unable to update vehicle status.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const filtered = sortVehicles(vehicles.filter((v) => {
    const query = search.toLowerCase();
    const matchSearch =
      (v.vehicle_number || "").toLowerCase().includes(query) ||
      (v.brand || "").toLowerCase().includes(query) ||
      (v.model || "").toLowerCase().includes(query);

    const matchFilter =
      filter === "All" ||
      (filter === "Sold" && v.status === "sold") ||
      (filter === "In Stock" && v.status !== "sold");

    return matchSearch && matchFilter;
  }), sortBy);

  const total = vehicles.length;
  const sold = vehicles.filter((v) => v.status === "sold").length;
  const inStock = total - sold;
  return (
    <Layout>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "4px" }}>
          <h1
            className="bebas"
            style={{ fontSize: "36px", letterSpacing: "2px", color: "var(--text)", lineHeight: 1 }}
          >
            FLEET
          </h1>
          <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            {total} vehicles
          </span>
        </div>
        <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Manage your vehicle inventory</p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
          marginBottom: "28px",
        }}
      >
        <StatCard icon={FiPackage} label="Total Vehicles" value={total} accent />
        <StatCard icon={FiClock} label="In Stock" value={inStock} />
        <StatCard icon={FiCheckCircle} label="Sold" value={sold} />
      </div>

      <FleetFeature vehicles={vehicles} total={total} inStock={inStock} sold={sold} auth={auth} />

      {/* Search + Filter row */}
      <div
        ref={searchSectionRef}
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
          flexWrap: "wrap",
          alignItems: "center",
          scrollMarginTop: "86px",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
          <FiSearch
            size={15}
            color="var(--text-muted)"
            style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            ref={searchRef}
            className="input-base"
            style={{ paddingLeft: "40px" }}
            placeholder="Search by plate, brand, model..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: "6px" }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid",
                fontSize: "13px",
                fontWeight: 500,
                fontFamily: "Outfit, sans-serif",
                cursor: "pointer",
                transition: "all 0.2s",
                background: filter === f ? "var(--accent-dim)" : "transparent",
                borderColor: filter === f ? "var(--border-accent)" : "var(--border)",
                color: filter === f ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <label style={{ display: "grid", gap: "5px", width: "260px", minWidth: "220px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Sort By</span>
          <select
            className="input-base"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort vehicles"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loadError && (
        <div
          style={{
            marginBottom: "18px",
            padding: "12px 14px",
            borderRadius: "10px",
            border: "1px solid var(--danger)",
            background: "rgba(220, 38, 38, 0.08)",
            color: "var(--text)",
            fontSize: "13px",
          }}
        >
          {loadError}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              style={{
                background: "var(--surface)",
                borderRadius: "16px",
                height: "240px",
                border: "1px solid var(--border)",
                animation: "pulse 1.5s infinite",
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>🚗</div>
          <div style={{ fontSize: "16px", fontWeight: 500, marginBottom: "6px", color: "var(--text-dim)" }}>
            No vehicles found
          </div>
          <div style={{ fontSize: "13px" }}>Try adjusting your search or filters</div>
        </div>
      ) : (
        <motion.div
          layout
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          <AnimatePresence>
            {filtered.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
              >
                <VehicleCard
                  vehicle={v}
                  canManage={auth.is_authenticated}
                  onStatusChange={updateVehicleStatus}
                  statusUpdating={updatingStatusId === v.id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </Layout>
  );
}

export default Dashboard;
