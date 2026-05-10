import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { clearCachedAuthState, getCachedAuthState, setCachedAuthState } from "../api/authCache";
import { clearPublicVehicleCache, notifyVehiclesChanged } from "../api/publicCache";
import Layout from "../components/Layout";
import usePageTitle from "../hooks/usePageTitle";
import { VEHICLE_BRANDS, modelsForBrand } from "../data/vehicleCatalog";
import {
  FiArrowRight,
  FiArrowLeft,
  FiCheck,
  FiPlus,
  FiTrash2,
  FiUpload,
  FiX,
  FiTruck,
  FiDollarSign,
  FiCamera,
  FiList,
} from "react-icons/fi";

const STEPS = [
  { label: "Vehicle", icon: FiTruck, desc: "Basic details" },
  { label: "Purchase", icon: FiDollarSign, desc: "Buy price & seller" },
  { label: "Expenses", icon: FiList, desc: "Repair & service costs" },
  { label: "Documents", icon: FiUpload, desc: "RC, insurance, Aadhaar" },
  { label: "Photos", icon: FiCamera, desc: "Cover and gallery images" },
];

function isVideoFile(file) {
  return file.type.startsWith("video/");
}

function MediaPreview({ media }) {
  if (media.media_type === "video") {
    return <video src={media.url} autoPlay loop muted playsInline controls style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#000" }} />;
  }
  return <img src={media.url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "var(--surface)" }} />;
}

function FieldLabel({ children, required }) {
  return (
    <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px", display: "block" }}>
      {children}{required && <span style={{ color: "var(--accent)", marginLeft: "3px" }}>*</span>}
    </label>
  );
}

function AddVehicle() {
  const navigate = useNavigate();
  const location = useLocation();
  const cachedAuth = getCachedAuthState();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(!cachedAuth.checked);
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);
  const extraFileRef = useRef(null);

  const [vehicle, setVehicle] = useState({
    vehicle_number: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    km_driven: "",
    name: "",
  });

  const [purchase, setPurchase] = useState({ amount: "", date: "", seller_name: "", seller_phone: "", seller_aadhaar: "" });

  const [expenses, setExpenses] = useState([]);

  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [extraImages, setExtraImages] = useState([]);
  const [extraPreviews, setExtraPreviews] = useState([]);
  const [purchaseDocuments, setPurchaseDocuments] = useState([]);

  usePageTitle("Add Vehicle");

  useEffect(() => {
    if (cachedAuth.checked && !cachedAuth.is_staff) {
      navigate("/login", { replace: true, state: { from: { pathname: location.pathname, search: location.search, hash: location.hash } } });
      return undefined;
    }

    api.get("auth/status/").then((res) => {
      setCachedAuthState(res.data);
      if (!res.data.is_staff) {
        clearCachedAuthState();
        navigate("/login", { replace: true, state: { from: { pathname: location.pathname, search: location.search, hash: location.hash } } });
        return;
      }
      setCheckingAuth(false);
    }).catch(() => {
      clearCachedAuthState();
      navigate("/login", { replace: true, state: { from: { pathname: location.pathname, search: location.search, hash: location.hash } } });
    });
  }, [cachedAuth.checked, cachedAuth.is_staff, location.hash, location.pathname, location.search, navigate]);

  // Expense helpers
  const addExpense = () => setExpenses([...expenses, { type: "", amount: "", date: "" }]);
  const removeExpense = (i) => setExpenses(expenses.filter((_, idx) => idx !== i));
  const updateExpense = (i, key, val) => {
    const copy = [...expenses];
    copy[i][key] = val;
    setExpenses(copy);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (!file.type.startsWith("image/")) {
        URL.revokeObjectURL(url);
        alert("Upload a valid image file for the cover.");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      setCoverImage(file);
      setCoverPreview(url);
    }
  };

  const handleExtraImagesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const accepted = [];
    const previews = [];
    for (const file of files) {
      if (file.type.startsWith("image/") || isVideoFile(file)) {
        accepted.push(file);
        previews.push({ url: URL.createObjectURL(file), media_type: isVideoFile(file) ? "video" : "image" });
      }
    }

    if (accepted.length !== files.length) {
      alert("Some gallery files were skipped. Gallery accepts images and videos.");
    }

    setExtraImages((current) => [...current, ...accepted]);
    setExtraPreviews((current) => [...current, ...previews]);
    if (extraFileRef.current) extraFileRef.current.value = "";
  };

  const removeExtraImage = (index) => {
    setExtraImages((current) => current.filter((_, i) => i !== index));
    setExtraPreviews((current) => current.filter((_, i) => i !== index));
  };

  const removeImage = () => {
    setCoverImage(null);
    setCoverPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handlePurchaseDocumentsChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPurchaseDocuments((current) => [
      ...current,
      ...files.map((file) => ({ title: file.name.replace(/\.[^.]+$/, ""), file })),
    ]);
    e.target.value = "";
  };

  const updatePurchaseDocument = (index, key, value) => {
    setPurchaseDocuments((current) => {
      const next = [...current];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const removePurchaseDocument = (index) => {
    setPurchaseDocuments((current) => current.filter((_, i) => i !== index));
  };

  const canNext = () => {
    if (step === 0) return vehicle.vehicle_number.trim() && vehicle.brand.trim() && vehicle.model.trim();
    if (step === 1) return purchase.amount && purchase.date;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // 1. Create vehicle
      const formData = new FormData();
      formData.append("vehicle_number", vehicle.vehicle_number.trim().toUpperCase());
      formData.append("brand", vehicle.brand.trim());
      formData.append("model", vehicle.model.trim());
      formData.append("year", vehicle.year);
      formData.append("name", (vehicle.name || `${vehicle.brand} ${vehicle.model}`).trim());
      if (vehicle.km_driven) formData.append("km_driven", vehicle.km_driven);
      if (coverImage) formData.append("cover_image", coverImage);
      extraImages.forEach((image) => formData.append("extra_images", image));

      const res = await api.post("vehicles/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const vehicleId = res.data.id;

      // 2. Create purchase
      if (purchase.amount && purchase.date) {
        await api.post("purchase/", {
          vehicle: vehicleId,
          amount: parseFloat(purchase.amount),
          date: purchase.date,
          seller_name: purchase.seller_name,
          seller_phone: purchase.seller_phone,
          seller_aadhaar: purchase.seller_aadhaar,
        });
      }

      // 3. Create expenses
      for (const exp of expenses) {
        if (exp.type.trim() && exp.amount && exp.date) {
          await api.post("expense/", {
            vehicle: vehicleId,
            type: exp.type,
            amount: parseFloat(exp.amount),
            date: exp.date,
          });
        }
      }

      for (const document of purchaseDocuments) {
        if (!document.file || !document.title.trim()) continue;
        const payload = new FormData();
        payload.append("title", document.title.trim());
        payload.append("document_stage", "purchase");
        payload.append("file", document.file);
        await api.post(`vehicles/${vehicleId}/upload-document/`, payload, { headers: { "Content-Type": "multipart/form-data" } });
      }

      clearPublicVehicleCache(res.data.vehicle_number);
      notifyVehiclesChanged({ vehicleNumber: res.data.vehicle_number });
      setDone(true);
      setTimeout(() => navigate("/"), 1800);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        alert("Please sign in before adding vehicles.");
        navigate("/login", { replace: true, state: { from: { pathname: location.pathname, search: location.search, hash: location.hash } } });
      } else {
        const detail = err.response?.data;
        const message =
          typeof detail === "string"
            ? detail
            : detail?.error
              ? detail.error
              : detail
                ? Object.entries(detail).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`).join("\n")
                : "Something went wrong. Please try again.";
        alert(message);
      }
    }
    setLoading(false);
  };

  // ── Success screen ──
  if (done) {
    return (
      <Layout>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: "16px" }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "rgba(34,197,94,0.15)",
              border: "2px solid rgba(34,197,94,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FiCheck size={32} color="var(--success)" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 style={{ textAlign: "center", fontSize: "22px", fontWeight: 700, marginBottom: "6px" }}>Vehicle Added!</h2>
            <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>Redirecting to fleet…</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (checkingAuth) {
    return (
      <Layout>
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "80px 20px" }}>Checking login...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        {/* Page title */}
        <div style={{ marginBottom: "32px" }}>
          <h1 className="bebas" style={{ fontSize: "36px", letterSpacing: "2px", color: "var(--text)" }}>
            ADD VEHICLE
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Fill in all details to register a vehicle</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "36px" }}>
          {STEPS.map((s, i) => {
            const isCompleted = i < step;
            const isActive = i === step;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1.5px solid`,
                      borderColor: isCompleted ? "var(--success)" : isActive ? "var(--accent)" : "var(--border)",
                      background: isCompleted ? "rgba(34,197,94,0.1)" : isActive ? "var(--accent-dim)" : "var(--surface)",
                      transition: "all 0.3s",
                      cursor: i < step ? "pointer" : "default",
                    }}
                    onClick={() => i < step && setStep(i)}
                  >
                    {isCompleted ? (
                      <FiCheck size={16} color="var(--success)" />
                    ) : (
                      <s.icon size={16} color={isActive ? "var(--accent)" : "var(--text-muted)"} />
                    )}
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: isActive ? "var(--accent)" : "var(--text-muted)", letterSpacing: "0.3px", whiteSpace: "nowrap" }}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      marginBottom: "18px",
                      background: i < step ? "var(--success)" : "var(--border)",
                      transition: "background 0.3s",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "18px",
              padding: "32px",
              marginBottom: "20px",
            }}
          >
            {/* Step header */}
            <div style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "var(--accent-dim)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {(() => { const Icon = STEPS[step].icon; return <Icon size={16} color="var(--accent)" />; })()}
                </div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>{STEPS[step].label}</h2>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginLeft: "42px" }}>{STEPS[step].desc}</p>
            </div>

            {/* ── Step 0: Vehicle Info ── */}
            {step === 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <FieldLabel required>Number Plate</FieldLabel>
                  <input
                    className="input-base"
                    placeholder="e.g. KL-01-AB-1234"
                    value={vehicle.vehicle_number}
                    onChange={(e) => setVehicle({ ...vehicle, vehicle_number: e.target.value.toUpperCase() })}
                    style={{ textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, fontSize: "16px" }}
                  />
                </div>
                <div>
                  <FieldLabel required>Brand</FieldLabel>
                  <input className="input-base" list="vehicle-brand-options" placeholder="e.g. Toyota" value={vehicle.brand} onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })} />
                  <datalist id="vehicle-brand-options">
                    {VEHICLE_BRANDS.map((brand) => <option key={brand} value={brand} />)}
                  </datalist>
                </div>
                <div>
                  <FieldLabel required>Model</FieldLabel>
                  <input className="input-base" list="vehicle-model-options" placeholder="e.g. Innova" value={vehicle.model} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} />
                  <datalist id="vehicle-model-options">
                    {modelsForBrand(vehicle.brand).map((model) => <option key={model} value={model} />)}
                  </datalist>
                </div>
                <div>
                  <FieldLabel>Year</FieldLabel>
                  <input className="input-base" type="number" placeholder="2020" value={vehicle.year} onChange={(e) => setVehicle({ ...vehicle, year: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>KM Driven</FieldLabel>
                  <input className="input-base" type="number" placeholder="e.g. 45000" value={vehicle.km_driven} onChange={(e) => setVehicle({ ...vehicle, km_driven: e.target.value })} />
                </div>
              </div>
            )}

            {/* ── Step 1: Purchase ── */}
            {step === 1 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <FieldLabel required>Purchase Amount (₹)</FieldLabel>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--accent)", fontSize: "16px", fontWeight: 600 }}>₹</span>
                    <input
                      className="input-base"
                      type="number"
                      placeholder="0"
                      style={{ paddingLeft: "32px", fontSize: "18px", fontWeight: 600 }}
                      value={purchase.amount}
                      onChange={(e) => setPurchase({ ...purchase, amount: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel required>Purchase Date</FieldLabel>
                  <input
                    className="input-base"
                    type="date"
                    value={purchase.date}
                    onChange={(e) => setPurchase({ ...purchase, date: e.target.value })}
                    style={{ colorScheme: "dark" }}
                  />
                </div>
                <div>
                  <FieldLabel>Seller Name</FieldLabel>
                  <input className="input-base" value={purchase.seller_name} onChange={(e) => setPurchase({ ...purchase, seller_name: e.target.value })} placeholder="Seller name" />
                </div>
                <div>
                  <FieldLabel>Seller Phone</FieldLabel>
                  <input className="input-base" value={purchase.seller_phone} onChange={(e) => setPurchase({ ...purchase, seller_phone: e.target.value })} placeholder="Phone number" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <FieldLabel>Seller Aadhaar</FieldLabel>
                  <input className="input-base" value={purchase.seller_aadhaar} onChange={(e) => setPurchase({ ...purchase, seller_aadhaar: e.target.value })} placeholder="Aadhaar number" />
                </div>

                {purchase.amount && (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      background: "var(--accent-dim)",
                      border: "1px solid var(--border-accent)",
                      borderRadius: "10px",
                      padding: "12px 16px",
                      fontSize: "14px",
                      color: "var(--accent)",
                    }}
                  >
                    Purchase price: <strong>₹{parseFloat(purchase.amount || 0).toLocaleString("en-IN")}</strong>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Expenses ── */}
            {step === 2 && (
              <div>
                {expenses.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "32px",
                      borderRadius: "12px",
                      border: "1px dashed var(--border)",
                      marginBottom: "16px",
                    }}
                  >
                    <div style={{ fontSize: "32px", marginBottom: "10px", opacity: 0.3 }}>🔧</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "4px" }}>No expenses added yet</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>Add repairs, service, parts, etc.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "14px" }}>
                    {expenses.map((exp, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          padding: "14px 16px",
                        }}
                      >
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "10px", alignItems: "center" }}>
                          <input
                            className="input-base"
                            placeholder="Type (e.g. Engine repair)"
                            value={exp.type}
                            onChange={(e) => updateExpense(i, "type", e.target.value)}
                            style={{ background: "var(--surface)" }}
                          />
                          <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--accent)", fontSize: "13px", fontWeight: 600 }}>₹</span>
                            <input
                              className="input-base"
                              type="number"
                              placeholder="Amount"
                              value={exp.amount}
                              onChange={(e) => updateExpense(i, "amount", e.target.value)}
                              style={{ paddingLeft: "28px", background: "var(--surface)" }}
                            />
                          </div>
                          <input
                            className="input-base"
                            type="date"
                            value={exp.date}
                            onChange={(e) => updateExpense(i, "date", e.target.value)}
                            style={{ background: "var(--surface)", colorScheme: "dark" }}
                          />
                          <button
                            onClick={() => removeExpense(i)}
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "8px",
                              border: "1px solid rgba(239,68,68,0.2)",
                              background: "rgba(239,68,68,0.08)",
                              color: "var(--danger)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              transition: "all 0.2s",
                            }}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ))}

                    {/* Total preview */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: "var(--accent-dim)",
                        border: "1px solid var(--border-accent)",
                      }}
                    >
                      <span style={{ fontSize: "13px", color: "var(--text-dim)" }}>Total Expenses</span>
                      <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent)" }}>
                        ₹{expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={addExpense}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px dashed var(--border)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    fontSize: "14px",
                    fontFamily: "Outfit, sans-serif",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                  <FiPlus size={14} /> Add Expense
                </button>
              </div>
            )}

            {step === 3 && (
              <div style={{ display: "grid", gap: "14px" }}>
                <input className="input-base" type="file" accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg" multiple onChange={handlePurchaseDocumentsChange} />
                {purchaseDocuments.length === 0 ? (
                  <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "18px", border: "1px dashed var(--border)", borderRadius: "12px", textAlign: "center" }}>
                    Add purchase documents such as RC, insurance, seller Aadhaar, invoice, or agreement.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "10px" }}>
                    {purchaseDocuments.map((document, index) => (
                      <div key={`${document.file.name}-${index}`} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "8px", alignItems: "center", padding: "10px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--surface2)" }}>
                        <input className="input-base" value={document.title} onChange={(e) => updatePurchaseDocument(index, "title", e.target.value)} placeholder="Document title" />
                        <button className="btn-ghost" type="button" onClick={() => removePurchaseDocument(index)} style={{ padding: "10px", color: "var(--danger)", display: "flex" }}>
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 4: Photos ── */}
            {step === 4 && (
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
                <input
                  ref={extraFileRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleExtraImagesChange}
                  style={{ display: "none" }}
                />

                {coverPreview ? (
                  <div style={{ position: "relative" }}>
                    <img
                      src={coverPreview}
                      alt=""
                      style={{ width: "100%", aspectRatio: "var(--vehicle-image-ratio)", objectFit: "cover", borderRadius: "12px", border: "1px solid var(--border)" }}
                    />
                    <button
                      onClick={removeImage}
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        border: "none",
                        background: "rgba(0,0,0,0.6)",
                        backdropFilter: "blur(8px)",
                        color: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FiX size={14} />
                    </button>
                    <div style={{ marginTop: "10px", fontSize: "13px", color: "var(--text-muted)", textAlign: "center" }}>
                      ✓ Cover image selected
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: "2px dashed var(--border)",
                      borderRadius: "14px",
                      padding: "60px 20px",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--accent-dim)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent"; }}
                  >
                    <div
                      style={{
                        width: "52px",
                        height: "52px",
                        borderRadius: "14px",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 14px",
                      }}
                    >
                      <FiUpload size={22} color="var(--text-muted)" />
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>Upload cover photo</div>
                    <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Click to browse - any image shape is allowed</div>
                  </div>
                )}

                <div style={{ marginTop: "18px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                    <FieldLabel>Gallery Media</FieldLabel>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => extraFileRef.current?.click()}
                      title="Add other photos"
                      style={{ width: "36px", height: "36px", borderRadius: "50%", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    >
                      <FiPlus size={16} />
                    </button>
                  </div>
                  {extraPreviews.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: "10px", marginTop: "12px" }}>
                      {extraPreviews.map((preview, index) => (
                        <div key={preview.url} style={{ position: "relative", aspectRatio: "var(--vehicle-image-ratio)", borderRadius: "10px", border: "1px solid var(--border)", overflow: "hidden", background: "var(--surface2)" }}>
                          <MediaPreview media={preview} />
                          {preview.media_type === "video" && <span style={{ position: "absolute", left: "6px", bottom: "6px", padding: "2px 6px", borderRadius: "999px", background: "rgba(0,0,0,0.68)", color: "#fff", fontSize: "10px", fontWeight: 800 }}>VIDEO</span>}
                          <button type="button" onClick={() => removeExtraImage(index)} style={{ position: "absolute", top: "6px", right: "6px", width: "26px", height: "26px", borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.62)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <FiX size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Review summary */}
                <div
                  style={{
                    marginTop: "20px",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "16px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
                    Summary
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {[
                      ["Plate", vehicle.vehicle_number],
                      ["Vehicle", `${vehicle.brand} ${vehicle.model} (${vehicle.year})`],
                      ["Purchase", purchase.amount ? `₹${parseFloat(purchase.amount).toLocaleString("en-IN")}` : "—"],
                      ["Expenses", `${expenses.length} item${expenses.length !== 1 ? "s" : ""} · ₹${expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0).toLocaleString("en-IN")}`],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{k}</span>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => (step === 0 ? navigate("/") : setStep(step - 1))}
            className="btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <FiArrowLeft size={14} />
            {step === 0 ? "Cancel" : "Back"}
          </button>

          {step < STEPS.length - 1 ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-accent"
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                opacity: canNext() ? 1 : 0.4,
                cursor: canNext() ? "pointer" : "not-allowed",
              }}
            >
              Continue
              <FiArrowRight size={14} />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-accent"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                minWidth: "140px",
                justifyContent: "center",
                background: loading ? "rgba(217,4,41,0.5)" : "var(--accent)",
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      border: "2px solid rgba(0,0,0,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  Saving…
                </>
              ) : (
                <>
                  <FiCheck size={14} strokeWidth={2.5} />
                  Add Vehicle
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </Layout>
  );
}

export default AddVehicle;
