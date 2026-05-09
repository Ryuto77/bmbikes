import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import { getCachedAuthState, setCachedAuthState, clearCachedAuthState } from "../api/authCache";
import Layout from "../components/Layout";
import { UICard } from "../components/ui";
import {
  FiArrowDown,
  FiArrowRight,
  FiArrowUp,
  FiEdit2,
  FiFileText,
  FiGrid,
  FiList,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiTrash2,
  FiTruck,
  FiX,
} from "react-icons/fi";

const FILTERS = ["All", "In Stock", "Sold"];
const PAGE_SIZES = [10, 25, 50];
const STOCK_SETTINGS_KEY = "bestmotors-stock-settings";
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
];

const emptyForm = {
  id: null,
  vehicle_number: "",
  name: "",
  brand: "",
  model: "",
  year: new Date().getFullYear(),
  km_driven: "",
  cover_image: null,
};

const emptyFinance = {
  purchase: { id: null, amount: "", date: "" },
  sale: { id: null, amount: "", date: "" },
  expenses: [],
};

const emptyAdvancedFilters = {
  brand: "",
  yearMin: "",
  yearMax: "",
  kmMin: "",
  kmMax: "",
  purchaseMin: "",
  purchaseMax: "",
  saleMin: "",
  saleMax: "",
  purchaseFrom: "",
  purchaseTo: "",
  saleFrom: "",
  saleTo: "",
};

const numericValue = (vehicle, key) => Number(vehicle?.[key] || 0);
const dateValue = (vehicle, key) => (vehicle?.[key] ? new Date(vehicle[key]).getTime() : 0);
const textValue = (vehicle, key) => (vehicle?.[key] || "").toString();
const today = () => new Date().toISOString().slice(0, 10);
const mediaUrl = (media) => (typeof media === "string" ? media : media?.url || media?.image || "");
const mediaType = (media) => (typeof media === "string" ? (/\.(mp4|mov|webm|m4v|avi)(\?|$)/i.test(media) ? "video" : "image") : media?.media_type || (/\.(mp4|mov|webm|m4v|avi)(\?|$)/i.test(mediaUrl(media)) ? "video" : "image"));
const apiErrorMessage = (err, fallback) => err.response?.data?.error || err.response?.data?.detail || err.message || fallback;

function GalleryThumb({ media }) {
  const url = mediaUrl(media);
  if (mediaType(media) === "video") {
    return <video src={url} autoPlay loop muted playsInline style={{ width: "76px", aspectRatio: "var(--vehicle-image-ratio)", objectFit: "contain", borderRadius: "8px", display: "block", background: "#000" }} />;
  }
  return <img src={url} alt="" style={{ width: "76px", aspectRatio: "var(--vehicle-image-ratio)", objectFit: "contain", borderRadius: "8px", display: "block", background: "var(--surface)" }} />;
}

const defaultStockSettings = {
  stockSearch: "",
  stockFilter: "All",
  stockSort: "purchase_date_desc",
  stockView: "list",
  showAdvanced: false,
  advancedFilters: emptyAdvancedFilters,
  pageSize: 10,
};

function loadStockSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STOCK_SETTINGS_KEY) || "{}");
    return {
      ...defaultStockSettings,
      ...parsed,
      advancedFilters: {
        ...emptyAdvancedFilters,
        ...(parsed.advancedFilters || {}),
      },
      pageSize: PAGE_SIZES.includes(Number(parsed.pageSize)) ? Number(parsed.pageSize) : defaultStockSettings.pageSize,
    };
  } catch {
    return defaultStockSettings;
  }
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

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
      case "model_desc":
        return textValue(b, "model").localeCompare(textValue(a, "model"));
      case "model_asc":
      default:
        return textValue(a, "model").localeCompare(textValue(b, "model"));
    }
  });
  return sorted;
}

function inNumberRange(value, min, max) {
  const number = Number(value || 0);
  return (min === "" || number >= Number(min)) && (max === "" || number <= Number(max));
}

function inDateRange(value, from, to) {
  if (!from && !to) return true;
  if (!value) return false;
  const time = new Date(value).getTime();
  return (!from || time >= new Date(from).getTime()) && (!to || time <= new Date(to).getTime());
}

function Field({ label, children, required }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}{required && <span style={{ color: "var(--accent)", marginLeft: "3px" }}>*</span>}
      </span>
      {children}
    </label>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.58)", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px" }}>
      <UICard style={{ width: "min(520px, 100%)", padding: "22px", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
          <h2 className="bebas" style={{ fontSize: "28px", letterSpacing: "1.8px", lineHeight: 1 }}>{title}</h2>
          <button className="btn-ghost" type="button" onClick={onClose} style={{ padding: "9px", display: "flex" }}>
            <FiX size={16} />
          </button>
        </div>
        {children}
      </UICard>
    </div>
  );
}

function AdminStock() {
  const location = useLocation();
  const savedSettings = useMemo(loadStockSettings, []);
  const [auth, setAuth] = useState(() => getCachedAuthState());
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [finance, setFinance] = useState(emptyFinance);
  const [documentForm, setDocumentForm] = useState({ title: "", file: null });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [editStep, setEditStep] = useState("basic");
  const [stockSearch, setStockSearch] = useState(savedSettings.stockSearch);
  const [stockFilter, setStockFilter] = useState(savedSettings.stockFilter);
  const [stockSort, setStockSort] = useState(savedSettings.stockSort);
  const [stockView, setStockView] = useState(savedSettings.stockView);
  const [showAdvanced, setShowAdvanced] = useState(savedSettings.showAdvanced);
  const [advancedFilters, setAdvancedFilters] = useState(savedSettings.advancedFilters);
  const [pageSize, setPageSize] = useState(savedSettings.pageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [soldModal, setSoldModal] = useState(null);
  const searchRef = useRef(null);
  const stockSearchSectionRef = useRef(null);

  const isEditing = Boolean(form.id);
  const selectedVehicle = useMemo(() => vehicles.find((v) => v.id === form.id), [vehicles, form.id]);
  const brands = useMemo(() => [...new Set(vehicles.map((v) => v.brand).filter(Boolean))].sort(), [vehicles]);

  const filteredVehicles = useMemo(() => {
    const query = stockSearch.trim().toLowerCase();
    return sortVehicles(vehicles.filter((vehicle) => {
      const matchesSearch =
        !query ||
        (vehicle.vehicle_number || "").toLowerCase().includes(query) ||
        (vehicle.brand || "").toLowerCase().includes(query) ||
        (vehicle.model || "").toLowerCase().includes(query) ||
        String(vehicle.year || "").includes(query);
      const matchesFilter =
        stockFilter === "All" ||
        (stockFilter === "Sold" && vehicle.status === "sold") ||
        (stockFilter === "In Stock" && vehicle.status !== "sold");
      const matchesAdvanced =
        (!advancedFilters.brand || vehicle.brand === advancedFilters.brand) &&
        inNumberRange(vehicle.year, advancedFilters.yearMin, advancedFilters.yearMax) &&
        inNumberRange(vehicle.km_driven, advancedFilters.kmMin, advancedFilters.kmMax) &&
        inNumberRange(vehicle.purchase_amount, advancedFilters.purchaseMin, advancedFilters.purchaseMax) &&
        inNumberRange(vehicle.sale_amount, advancedFilters.saleMin, advancedFilters.saleMax) &&
        inDateRange(vehicle.purchase_date, advancedFilters.purchaseFrom, advancedFilters.purchaseTo) &&
        inDateRange(vehicle.sale_date, advancedFilters.saleFrom, advancedFilters.saleTo);
      return matchesSearch && matchesFilter && matchesAdvanced;
    }), stockSort);
  }, [advancedFilters, vehicles, stockSearch, stockFilter, stockSort]);

  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize));
  const pagedVehicles = filteredVehicles.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const duplicatePlateWarning = useMemo(() => {
    const plate = form.vehicle_number.trim().toUpperCase();
    if (!plate) return "";
    const duplicate = vehicles.find((vehicle) => vehicle.vehicle_number === plate && vehicle.id !== form.id);
    return duplicate ? `${plate} already exists in stock.` : "";
  }, [form.vehicle_number, form.id, vehicles]);

  useEffect(() => {
    setCurrentPage(1);
  }, [stockSearch, stockFilter, stockSort, advancedFilters, pageSize]);

  useEffect(() => {
    localStorage.setItem(STOCK_SETTINGS_KEY, JSON.stringify({
      stockSearch,
      stockFilter,
      stockSort,
      stockView,
      showAdvanced,
      advancedFilters,
      pageSize,
    }));
  }, [stockSearch, stockFilter, stockSort, stockView, showAdvanced, advancedFilters, pageSize]);

  const loadAuth = async () => {
    try {
      const res = await api.get("auth/status/");
      const nextAuth = { checked: true, ...res.data };
      setAuth(nextAuth);
      setCachedAuthState(nextAuth);
    } catch {
      setAuth({ checked: true, is_authenticated: false, username: "", is_staff: false });
      clearCachedAuthState();
    }
  };

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const res = await api.get("vehicles/");
      setVehicles(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuth();
    loadVehicles();
  }, []);

  useEffect(() => {
    const syncAuth = () => loadAuth();
    window.addEventListener("auth-changed", syncAuth);
    return () => window.removeEventListener("auth-changed", syncAuth);
  }, []);

  useEffect(() => {
    const focusSearch = () => searchRef.current?.focus();
    window.addEventListener("app-search-shortcut", focusSearch);
    return () => window.removeEventListener("app-search-shortcut", focusSearch);
  }, []);

  const scrollStockSearchIntoView = () => {
    window.requestAnimationFrame(() => {
      stockSearchSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleStockSearchChange = (e) => {
    const nextValue = e.target.value;
    setStockSearch(nextValue);
    if (/[a-z0-9]/i.test(nextValue)) {
      scrollStockSearchIntoView();
    }
  };

  const refreshVehicle = (updatedVehicle) => {
    setVehicles((current) => current.map((item) => (item.id === updatedVehicle.id ? updatedVehicle : item)));
  };

  const loadFinance = async (vehicleNumber) => {
    const res = await api.get(`search/?number=${vehicleNumber}`);
    setFinance({
      purchase: {
        id: res.data.purchase?.id || null,
        amount: res.data.purchase?.amount || "",
        date: res.data.purchase?.date || "",
      },
      sale: {
        id: res.data.sale?.id || null,
        amount: res.data.sale?.amount || "",
        date: res.data.sale?.date || "",
      },
      expenses: (res.data.expenses || []).map((expense) => ({
        id: expense.id || null,
        type: expense.type || "",
        amount: expense.amount || "",
        date: expense.date || "",
      })),
    });
  };

  const startEdit = async (vehicle) => {
    setForm({
      id: vehicle.id,
      vehicle_number: vehicle.vehicle_number || "",
      name: vehicle.name || "",
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      year: vehicle.year || new Date().getFullYear(),
      km_driven: vehicle.km_driven || "",
      cover_image: null,
    });
    setEditStep("basic");
    setDocumentForm({ title: "", file: null });
    await loadFinance(vehicle.vehicle_number);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setFinance(emptyFinance);
    setEditStep("basic");
    setImageError("");
    setDocumentForm({ title: "", file: null });
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0] || null;
    setImageError("");
    if (!file) {
      setForm({ ...form, cover_image: null });
      return;
    }

    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      if (image.width <= image.height) {
        setImageError("Upload a landscape image. The site will display it in a 6:4 frame.");
        setForm({ ...form, cover_image: null });
        e.target.value = "";
        return;
      }
      setForm({ ...form, cover_image: file });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setImageError("Upload a valid landscape image for the cover.");
      setForm({ ...form, cover_image: null });
      e.target.value = "";
    };
    image.src = url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (duplicatePlateWarning) {
      alert(duplicatePlateWarning);
      return;
    }

    setSaving(true);
    try {
      const payload = new FormData();
      payload.append("vehicle_number", form.vehicle_number.trim().toUpperCase());
      payload.append("brand", form.brand.trim());
      payload.append("model", form.model.trim());
      payload.append("year", form.year);
      payload.append("name", form.name.trim() || `${form.brand.trim()} ${form.model.trim()}`);
      if (form.km_driven !== "") payload.append("km_driven", form.km_driven);
      if (form.cover_image) payload.append("cover_image", form.cover_image);

      const res = await api.patch(`vehicles/${form.id}/`, payload, { headers: { "Content-Type": "multipart/form-data" } });
      await saveFinance(res.data.id);
      await loadVehicles();
      resetForm();
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "Unable to save vehicle.");
    } finally {
      setSaving(false);
    }
  };

  const saveFinance = async (vehicleId) => {
    if (finance.purchase.amount && finance.purchase.date) {
      const payload = { vehicle: vehicleId, amount: parseFloat(finance.purchase.amount), date: finance.purchase.date };
      if (finance.purchase.id) await api.patch(`purchase/${finance.purchase.id}/`, payload);
      else await api.post("purchase/", payload);
    }

    const hasSaleValue = finance.sale.amount !== "" && Number(finance.sale.amount) > 0;
    const saleDate = finance.sale.date || today();
    if (hasSaleValue) {
      const payload = { vehicle: vehicleId, amount: parseFloat(finance.sale.amount), date: saleDate };
      if (finance.sale.id) await api.patch(`sale/${finance.sale.id}/`, payload);
      else await api.post("sale/", payload);
    } else if (finance.sale.id) {
      await api.delete(`sale/${finance.sale.id}/`);
    }

    for (const expense of finance.expenses) {
      const isEmpty = !expense.type && !expense.amount && !expense.date;
      if (expense.id && isEmpty) {
        await api.delete(`expense/${expense.id}/`);
        continue;
      }
      if (!isEmpty && expense.type && expense.amount && expense.date) {
        const payload = { vehicle: vehicleId, type: expense.type, amount: parseFloat(expense.amount), date: expense.date };
        if (expense.id) await api.patch(`expense/${expense.id}/`, payload);
        else await api.post("expense/", payload);
      }
    }
  };

  const updateExpense = (index, key, value) => {
    setFinance((current) => {
      const expenses = [...current.expenses];
      expenses[index] = { ...expenses[index], [key]: value };
      return { ...current, expenses };
    });
  };

  const addExpense = () => {
    setFinance((current) => ({
      ...current,
      expenses: [...current.expenses, { id: null, type: "", amount: "", date: "" }],
    }));
  };

  const removeExpense = (index) => {
    setFinance((current) => {
      const expenses = [...current.expenses];
      const expense = expenses[index];
      if (expense?.id) expenses[index] = { id: expense.id, type: "", amount: "", date: "" };
      else expenses.splice(index, 1);
      return { ...current, expenses };
    });
  };

  const updateVehicleStatus = async (vehicle, status) => {
    if (status === "sold") {
      setSoldModal({ vehicle, amount: vehicle.sale_amount || "", date: vehicle.sale_date || today() });
      return;
    }

    setUpdatingStatusId(vehicle.id);
    try {
      const res = await api.post(`vehicles/${vehicle.id}/status/`, { status });
      refreshVehicle(res.data);
    } catch (err) {
      alert(err.response?.data?.error || "Unable to update vehicle status.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const submitSoldModal = async (e) => {
    e.preventDefault();
    const { vehicle, amount, date } = soldModal;
    setUpdatingStatusId(vehicle.id);
    try {
      const res = await api.post(`vehicles/${vehicle.id}/status/`, { status: "sold", amount: Number(amount || 0), date: date || today() });
      refreshVehicle(res.data);
      setSoldModal(null);
    } catch (err) {
      alert(err.response?.data?.error || "Unable to mark sold.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const confirmDeleteVehicle = async () => {
    if (!deleteCandidate) return;
    await api.delete(`vehicles/${deleteCandidate.id}/`);
    if (form.id === deleteCandidate.id) resetForm();
    setDeleteCandidate(null);
    await loadVehicles();
  };

  const uploadGalleryImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !form.id) return;
    setUploadingGallery(true);
    try {
      const payload = new FormData();
      files.forEach((file) => payload.append("extra_images", file));
      const res = await api.patch(`vehicles/${form.id}/`, payload, { headers: { "Content-Type": "multipart/form-data" } });
      refreshVehicle(res.data);
      e.target.value = "";
    } catch (err) {
      alert(apiErrorMessage(err, "Unable to upload images."));
    } finally {
      setUploadingGallery(false);
    }
  };

  const setCoverImage = async (imageId) => {
    const res = await api.post(`vehicles/${form.id}/set-cover-image/`, { image_id: imageId });
    refreshVehicle(res.data);
  };

  const deleteGalleryImage = async (imageId) => {
    const res = await api.post(`vehicles/${form.id}/delete-image/`, { image_id: imageId });
    refreshVehicle(res.data);
  };

  const moveGalleryImage = async (index, direction) => {
    const images = [...(selectedVehicle?.images || [])];
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    [images[index], images[nextIndex]] = [images[nextIndex], images[index]];
    const res = await api.post(`vehicles/${form.id}/reorder-images/`, { image_ids: images.map((image) => image.id) });
    refreshVehicle(res.data);
  };

  const uploadDocument = async (e) => {
    e.preventDefault();
    if (!documentForm.title || !documentForm.file) return;
    setUploadingDocument(true);
    try {
      const payload = new FormData();
      payload.append("title", documentForm.title);
      payload.append("file", documentForm.file);
      const res = await api.post(`vehicles/${form.id}/upload-document/`, payload, { headers: { "Content-Type": "multipart/form-data" } });
      refreshVehicle(res.data);
      setDocumentForm({ title: "", file: null });
      e.target.reset();
    } catch (err) {
      alert(err.response?.data?.error || "Unable to upload document.");
    } finally {
      setUploadingDocument(false);
    }
  };

  const deleteDocument = async (documentId) => {
    const res = await api.post(`vehicles/${form.id}/delete-document/`, { document_id: documentId });
    refreshVehicle(res.data);
  };

  if (!auth.checked) {
    return (
      <Layout>
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "80px 20px" }}>Loading login...</div>
      </Layout>
    );
  }

  if (!auth.is_authenticated) {
    return <Navigate to="/login" replace state={{ from: { pathname: location.pathname, search: location.search, hash: location.hash } }} />;
  }

  return (
    <Layout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap", marginBottom: "22px" }}>
        <div>
          <h1 className="bebas" style={{ fontSize: "38px", letterSpacing: "2px", lineHeight: 1, marginBottom: "6px" }}>STOCK MANAGER</h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Signed in as {auth.username}</p>
        </div>
      </div>

      <div className="admin-stock-grid" style={{ display: "grid", gridTemplateColumns: isEditing ? "410px minmax(0, 1fr)" : "1fr", gap: "18px", alignItems: "start" }}>
        {isEditing && (
          <UICard style={{ padding: "22px", position: "sticky", top: "92px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "18px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {editStep === "basic" ? "Edit Vehicle" : editStep === "finance" ? "Finance" : editStep === "gallery" ? "Gallery" : "Documents"}
                </div>
                {selectedVehicle && <div style={{ marginTop: "4px", color: "var(--accent)", fontWeight: 700 }}>{selectedVehicle.vehicle_number}</div>}
              </div>
              <button className="btn-ghost" type="button" onClick={resetForm} style={{ padding: "9px", display: "flex" }}>
                <FiX size={15} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginBottom: "16px" }}>
              {[
                ["basic", "Basic"],
                ["finance", "Money"],
                ["gallery", "Images"],
                ["documents", "Docs"],
              ].map(([step, label]) => (
                <button key={step} type="button" onClick={() => setEditStep(step)} className={editStep === step ? "btn-accent" : "btn-ghost"} style={{ padding: "8px 6px", fontSize: "12px" }}>
                  {label}
                </button>
              ))}
            </div>

            {(editStep === "basic" || editStep === "finance") && (
              <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
                {editStep === "basic" ? (
                  <>
                    <Field label="Number Plate" required>
                      <input className="input-base" value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value.toUpperCase() })} required />
                      {duplicatePlateWarning && <div style={{ marginTop: "6px", color: "var(--danger)", fontSize: "12px" }}>{duplicatePlateWarning}</div>}
                    </Field>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <Field label="Brand" required>
                        <input className="input-base" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required />
                      </Field>
                      <Field label="Model" required>
                        <input className="input-base" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
                      </Field>
                    </div>
                    <Field label="Display Name">
                      <input className="input-base" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Defaults to brand + model" />
                    </Field>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <Field label="Year" required>
                        <input className="input-base" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required />
                      </Field>
                      <Field label="KM Driven">
                        <input className="input-base" type="number" value={form.km_driven} onChange={(e) => setForm({ ...form, km_driven: e.target.value })} />
                      </Field>
                    </div>
                    <Field label="Cover Image">
                      <input className="input-base" type="file" accept="image/*" onChange={handleCoverChange} />
                      <div style={{ marginTop: "6px", color: imageError ? "var(--danger)" : "var(--text-muted)", fontSize: "12px" }}>
                        {imageError || "Use a landscape image. It will display in a 6:4 frame."}
                      </div>
                    </Field>
                  </>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <Field label="Purchase Amount">
                        <input className="input-base" type="number" value={finance.purchase.amount} onChange={(e) => setFinance({ ...finance, purchase: { ...finance.purchase, amount: e.target.value } })} />
                      </Field>
                      <Field label="Purchase Date">
                        <input className="input-base" type="date" value={finance.purchase.date || ""} onChange={(e) => setFinance({ ...finance, purchase: { ...finance.purchase, date: e.target.value } })} />
                      </Field>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <Field label="Sold Value">
                        <input className="input-base" type="number" value={finance.sale.amount} onChange={(e) => setFinance({ ...finance, sale: { ...finance.sale, amount: e.target.value } })} />
                      </Field>
                      <Field label="Sold Date">
                        <input className="input-base" type="date" value={finance.sale.date || ""} onChange={(e) => setFinance({ ...finance, sale: { ...finance.sale, date: e.target.value } })} />
                      </Field>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Expenses</span>
                      <button className="btn-ghost" type="button" onClick={addExpense} style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <FiPlus size={14} />
                        Expense
                      </button>
                    </div>
                    {finance.expenses.map((expense, index) => (
                      <div key={expense.id || index} className="admin-expense-row" style={{ display: "grid", gap: "8px", padding: "10px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--surface2)" }}>
                        <input className="input-base" placeholder="Type" value={expense.type} onChange={(e) => updateExpense(index, "type", e.target.value)} />
                        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) auto", gap: "8px", alignItems: "center" }}>
                          <input className="input-base" type="number" placeholder="Amount" value={expense.amount} onChange={(e) => updateExpense(index, "amount", e.target.value)} />
                          <input className="input-base" type="date" value={expense.date || ""} onChange={(e) => updateExpense(index, "date", e.target.value)} />
                          <button className="btn-ghost" type="button" onClick={() => removeExpense(index)} style={{ padding: "10px", color: "var(--danger)", display: "flex" }}>
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button className="btn-accent" type="submit" disabled={saving || Boolean(duplicatePlateWarning)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: saving ? 0.7 : 1 }}>
                    {saving ? <FiRefreshCw size={14} /> : <FiSave size={14} />}
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button className="btn-ghost" type="button" onClick={() => setEditStep(editStep === "basic" ? "finance" : "basic")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    {editStep === "basic" ? <FiArrowRight size={14} /> : <FiX size={14} />}
                    {editStep === "basic" ? "Next" : "Back"}
                  </button>
                </div>
              </form>
            )}

            {editStep === "gallery" && (
              <div style={{ display: "grid", gap: "14px" }}>
                <Field label="Add Gallery Media">
                  <input className="input-base" type="file" accept="image/*,video/*" multiple onChange={uploadGalleryImages} disabled={uploadingGallery} />
                </Field>
                <div style={{ display: "grid", gap: "10px" }}>
                  {(selectedVehicle?.images || []).length === 0 ? (
                    <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>No gallery images yet.</div>
                  ) : selectedVehicle.images.map((image, index) => (
                    <div key={image.id} style={{ display: "grid", gridTemplateColumns: "76px minmax(0, 1fr)", gap: "10px", alignItems: "center", border: "1px solid var(--border)", background: "var(--surface2)", borderRadius: "10px", padding: "8px" }}>
                      <div style={{ position: "relative", width: "76px", aspectRatio: "var(--vehicle-image-ratio)", overflow: "hidden", borderRadius: "8px", background: "var(--surface)" }}>
                        <GalleryThumb media={image} />
                        {mediaType(image) === "video" && <span style={{ position: "absolute", right: "4px", bottom: "4px", padding: "1px 5px", borderRadius: "999px", background: "rgba(0,0,0,0.68)", color: "#fff", fontSize: "9px", fontWeight: 800 }}>VIDEO</span>}
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {mediaType(image) === "image" && <button className="btn-ghost" type="button" onClick={() => setCoverImage(image.id)} style={{ padding: "8px 10px" }}>Cover</button>}
                        <button className="btn-ghost" type="button" onClick={() => moveGalleryImage(index, -1)} disabled={index === 0} style={{ padding: "8px" }}><FiArrowUp size={14} /></button>
                        <button className="btn-ghost" type="button" onClick={() => moveGalleryImage(index, 1)} disabled={index === selectedVehicle.images.length - 1} style={{ padding: "8px" }}><FiArrowDown size={14} /></button>
                        <button className="btn-ghost" type="button" onClick={() => deleteGalleryImage(image.id)} style={{ padding: "8px", color: "var(--danger)" }}><FiTrash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editStep === "documents" && (
              <div style={{ display: "grid", gap: "14px" }}>
                <form onSubmit={uploadDocument} style={{ display: "grid", gap: "10px" }}>
                  <Field label="Document Title" required>
                    <input className="input-base" value={documentForm.title} onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })} placeholder="RC, insurance, invoice..." />
                  </Field>
                  <Field label="Document File" required>
                    <input className="input-base" type="file" accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg" onChange={(e) => setDocumentForm({ ...documentForm, file: e.target.files[0] || null })} />
                  </Field>
                  <button className="btn-accent" type="submit" disabled={uploadingDocument} style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                    <FiFileText size={14} />
                    {uploadingDocument ? "Uploading..." : "Upload Document"}
                  </button>
                </form>
                <div style={{ display: "grid", gap: "8px" }}>
                  {(selectedVehicle?.documents || []).length === 0 ? (
                    <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>No documents uploaded.</div>
                  ) : selectedVehicle.documents.map((document) => (
                    <div key={document.id} style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "space-between", padding: "10px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--surface2)" }}>
                      <a href={document.file} target="_blank" rel="noreferrer" style={{ color: "var(--text)", textDecoration: "none", fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{document.title}</a>
                      <button className="btn-ghost" type="button" onClick={() => deleteDocument(document.id)} style={{ padding: "8px", color: "var(--danger)", display: "flex" }}>
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </UICard>
        )}

        <div style={{ display: "grid", gap: "16px" }}>
          <div ref={stockSearchSectionRef} style={{ scrollMarginTop: "86px" }}>
          <UICard style={{ padding: "14px", display: "grid", gap: "12px" }}>
            <div style={{ position: "relative" }}>
              <FiSearch size={15} color="var(--text-muted)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
              <input ref={searchRef} className="input-base" style={{ paddingLeft: "40px" }} placeholder="Search plate, brand, model, year..." value={stockSearch} onChange={handleStockSearchChange} />
            </div>
            <div className="stock-toolbar-grid" style={{ display: "grid", gridTemplateColumns: "minmax(180px, 260px) minmax(120px, 1fr)", gap: "12px" }}>
              <label style={{ display: "grid", gap: "5px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Sort By</span>
                <select className="input-base" value={stockSort} onChange={(e) => setStockSort(e.target.value)} aria-label="Sort stock">
                  {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "end" }}>
                {FILTERS.map((filter) => (
                  <button key={filter} type="button" onClick={() => setStockFilter(filter)} className={stockFilter === filter ? "btn-accent" : "btn-ghost"} style={{ padding: "9px 12px" }}>
                    {filter}
                  </button>
                ))}
                <button type="button" className="btn-ghost" onClick={() => setShowAdvanced(!showAdvanced)} style={{ padding: "9px 12px" }}>
                  Advanced Filters
                </button>
                <button type="button" className="btn-ghost" onClick={() => { setStockSearch(""); setStockFilter("All"); setAdvancedFilters(emptyAdvancedFilters); }} style={{ padding: "9px 12px" }}>
                  Clear
                </button>
                <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                {[
                  ["list", <FiList key="list" size={15} />],
                  ["grid", <FiGrid key="grid" size={15} />],
                ].map(([view, icon]) => (
                    <button key={view} type="button" onClick={() => setStockView(view)} title={`${view === "list" ? "List" : "Grid"} view`} style={{ width: "38px", height: "38px", borderRadius: "8px", border: "1px solid", borderColor: stockView === view ? "var(--border-accent)" : "var(--border)", background: stockView === view ? "var(--accent-dim)" : "transparent", color: stockView === view ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {showAdvanced && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", paddingTop: "4px" }}>
                <Field label="Brand">
                  <select className="input-base" value={advancedFilters.brand} onChange={(e) => setAdvancedFilters({ ...advancedFilters, brand: e.target.value })}>
                    <option value="">All brands</option>
                    {brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                  </select>
                </Field>
                {[
                  ["Year Min", "yearMin", "number"],
                  ["Year Max", "yearMax", "number"],
                  ["KM Min", "kmMin", "number"],
                  ["KM Max", "kmMax", "number"],
                  ["Purchase Min", "purchaseMin", "number"],
                  ["Purchase Max", "purchaseMax", "number"],
                  ["Sale Min", "saleMin", "number"],
                  ["Sale Max", "saleMax", "number"],
                  ["Purchase From", "purchaseFrom", "date"],
                  ["Purchase To", "purchaseTo", "date"],
                  ["Sold From", "saleFrom", "date"],
                  ["Sold To", "saleTo", "date"],
                ].map(([label, key, type]) => (
                  <Field key={key} label={label}>
                    <input className="input-base" type={type} value={advancedFilters[key]} onChange={(e) => setAdvancedFilters({ ...advancedFilters, [key]: e.target.value })} />
                  </Field>
                ))}
              </div>
            )}
          </UICard>
          </div>

          <UICard style={{ overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: "32px", color: "var(--text-muted)", textAlign: "center" }}>Loading stock...</div>
            ) : vehicles.length === 0 ? (
              <div style={{ padding: "48px 20px", color: "var(--text-muted)", textAlign: "center" }}>No vehicles in stock.</div>
            ) : filteredVehicles.length === 0 ? (
              <div style={{ padding: "48px 20px", color: "var(--text-muted)", textAlign: "center" }}>No vehicles match the current filters.</div>
            ) : stockView === "grid" ? (
              <div className="stock-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px", padding: "14px" }}>
                {pagedVehicles.map((vehicle) => (
                  <div key={vehicle.id} style={{ border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", background: "var(--surface)" }}>
                    <div style={{ width: "100%", aspectRatio: "var(--vehicle-image-ratio)", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {vehicle.cover_image ? <img src={vehicle.cover_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <FiTruck size={28} color="var(--text-muted)" />}
                    </div>
                    <div style={{ padding: "12px", display: "grid", gap: "10px" }}>
                      <div>
                        <div className="bebas" style={{ fontSize: "23px", letterSpacing: "1.4px", color: "var(--text)", lineHeight: 1 }}>{vehicle.vehicle_number}</div>
                        <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{vehicle.brand} {vehicle.model} - {vehicle.year}</div>
                      </div>
                      <VehicleActions vehicle={vehicle} updatingStatusId={updatingStatusId} updateVehicleStatus={updateVehicleStatus} startEdit={startEdit} setDeleteCandidate={setDeleteCandidate} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid" }}>
                {pagedVehicles.map((vehicle) => (
                  <div key={vehicle.id} className="stock-list-row" style={{ display: "grid", gridTemplateColumns: "72px minmax(0, 1fr) auto", gap: "14px", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ width: "72px", aspectRatio: "var(--vehicle-image-ratio)", borderRadius: "8px", overflow: "hidden", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {vehicle.cover_image ? <img src={vehicle.cover_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <FiTruck size={22} color="var(--text-muted)" />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="bebas" style={{ fontSize: "22px", letterSpacing: "1.4px", color: "var(--text)", lineHeight: 1 }}>{vehicle.vehicle_number}</div>
                      <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {vehicle.brand} {vehicle.model} - {vehicle.year}{vehicle.km_driven ? ` - ${Number(vehicle.km_driven).toLocaleString()} km` : ""}
                      </div>
                    </div>
                    <VehicleActions vehicle={vehicle} updatingStatusId={updatingStatusId} updateVehicleStatus={updateVehicleStatus} startEdit={startEdit} setDeleteCandidate={setDeleteCandidate} />
                  </div>
                ))}
              </div>
            )}

            {filteredVehicles.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", padding: "14px", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredVehicles.length)} of {filteredVehicles.length}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <select className="input-base" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} style={{ width: "86px", padding: "9px" }}>
                    {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                  </select>
                  <button className="btn-ghost" type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Prev</button>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{currentPage} / {totalPages}</span>
                  <button className="btn-ghost" type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Next</button>
                </div>
              </div>
            )}
          </UICard>
        </div>
      </div>

      {soldModal && (
        <Modal title={`Mark ${soldModal.vehicle.vehicle_number} Sold`} onClose={() => setSoldModal(null)}>
          <form onSubmit={submitSoldModal} style={{ display: "grid", gap: "14px" }}>
            <Field label="Sale Amount" required>
              <input className="input-base" type="number" value={soldModal.amount} onChange={(e) => setSoldModal({ ...soldModal, amount: e.target.value })} required autoFocus />
            </Field>
            <Field label="Sale Date" required>
              <input className="input-base" type="date" value={soldModal.date} onChange={(e) => setSoldModal({ ...soldModal, date: e.target.value })} required />
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn-ghost" type="button" onClick={() => setSoldModal(null)}>Cancel</button>
              <button className="btn-accent" type="submit">Mark Sold</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteCandidate && (
        <Modal title="Archive Vehicle" onClose={() => setDeleteCandidate(null)}>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "18px" }}>
            Archive <strong style={{ color: "var(--text)" }}>{deleteCandidate.vehicle_number}</strong>? It will be hidden from stock pages, but its finance, images, documents, and audit history will remain in Django admin.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button className="btn-ghost" type="button" onClick={() => setDeleteCandidate(null)}>Cancel</button>
            <button className="btn-accent" type="button" onClick={confirmDeleteVehicle} style={{ background: "var(--danger)" }}>Archive</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}

function VehicleActions({ vehicle, updatingStatusId, updateVehicleStatus, startEdit, setDeleteCandidate }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
      <button
        onClick={() => updateVehicleStatus(vehicle, vehicle.status === "sold" ? "unsold" : "sold")}
        disabled={updatingStatusId === vehicle.id}
        style={{
          padding: "5px 9px",
          borderRadius: "999px",
          fontSize: "11px",
          fontWeight: 700,
          color: vehicle.status === "sold" ? "var(--success)" : "var(--danger)",
          background: vehicle.status === "sold" ? "var(--sold-bg)" : "var(--unsold-bg)",
          border: "1px solid var(--border)",
          cursor: updatingStatusId === vehicle.id ? "wait" : "pointer",
          fontFamily: "Outfit, sans-serif",
          whiteSpace: "nowrap",
        }}
      >
        {vehicle.status === "sold" ? "Sold" : "In Stock"}
      </button>
      <div style={{ display: "flex", gap: "6px" }}>
        <button className="btn-ghost" onClick={() => startEdit(vehicle)} style={{ padding: "9px", display: "flex" }} title="Edit vehicle">
          <FiEdit2 size={14} />
        </button>
        <button className="btn-ghost" onClick={() => setDeleteCandidate(vehicle)} style={{ padding: "9px", display: "flex", color: "var(--danger)" }} title="Archive vehicle">
          <FiTrash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default AdminStock;
