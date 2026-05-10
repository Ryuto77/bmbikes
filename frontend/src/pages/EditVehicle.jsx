import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import api from "../api/axios";
import { clearCachedAuthState, getCachedAuthState, setCachedAuthState } from "../api/authCache";
import { clearPublicVehicleCache, notifyVehiclesChanged } from "../api/publicCache";
import Layout from "../components/Layout";
import usePageTitle from "../hooks/usePageTitle";
import { VEHICLE_BRANDS, modelsForBrand } from "../data/vehicleCatalog";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCamera,
  FiCheck,
  FiDollarSign,
  FiList,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiTrendingUp,
  FiTruck,
  FiUpload,
  FiX,
} from "react-icons/fi";

const STEPS = [
  { label: "Vehicle", icon: FiTruck, desc: "Basic details" },
  { label: "Purchase", icon: FiDollarSign, desc: "Buy price & date" },
  { label: "Sale", icon: FiTrendingUp, desc: "Sold value & date" },
  { label: "Expenses", icon: FiList, desc: "Repair & service costs" },
  { label: "Photos", icon: FiCamera, desc: "Cover and gallery images" },
];

function isVideoFile(file) {
  return file.type.startsWith("video/");
}

function mediaPreview(fileOrUrl) {
  if (typeof fileOrUrl === "string") {
    return { url: fileOrUrl, media_type: /\.(mp4|mov|webm|m4v|avi)(\?|$)/i.test(fileOrUrl) ? "video" : "image" };
  }
  const url = fileOrUrl.url || fileOrUrl.image || "";
  return { ...fileOrUrl, url, media_type: fileOrUrl.media_type || (/\.(mp4|mov|webm|m4v|avi)(\?|$)/i.test(url) ? "video" : "image") };
}

function MediaPreview({ media }) {
  const item = mediaPreview(media);
  if (item.media_type === "video") {
    return <video src={item.url} autoPlay loop muted playsInline controls style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#000" }} />;
  }
  return <img src={item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "var(--surface)" }} />;
}

function FieldLabel({ children, required }) {
  return (
    <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px", display: "block" }}>
      {children}{required && <span style={{ color: "var(--accent)", marginLeft: "3px" }}>*</span>}
    </label>
  );
}

function EditVehicle() {
  const { number } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const cachedAuth = getCachedAuthState();
  const fileRef = useRef(null);
  const extraFileRef = useRef(null);
  const [checkingAuth, setCheckingAuth] = useState(!cachedAuth.checked);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [vehicle, setVehicle] = useState(null);
  const [purchase, setPurchase] = useState({ id: null, amount: "", date: "", seller_name: "", seller_phone: "", seller_aadhaar: "" });
  const [sale, setSale] = useState({ id: null, amount: "", date: "", buyer_name: "", buyer_phone: "", buyer_aadhaar: "" });
  const [expenses, setExpenses] = useState([]);
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [extraImages, setExtraImages] = useState([]);
  const [extraPreviews, setExtraPreviews] = useState([]);

  usePageTitle(vehicle?.vehicle_number ? `Edit ${vehicle.vehicle_number}` : "Edit Vehicle");

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

  useEffect(() => {
    if (checkingAuth) return;
    api.get(`search/?number=${number}`).then((res) => {
      const data = res.data;
      setVehicle({
        id: data.vehicle.id,
        vehicle_number: data.vehicle.vehicle_number || "",
        name: data.vehicle.name || "",
        brand: data.vehicle.brand || "",
        model: data.vehicle.model || "",
        year: data.vehicle.year || new Date().getFullYear(),
        km_driven: data.vehicle.km_driven || "",
      });
      setPurchase({
        id: data.purchase?.id || null,
        amount: data.purchase?.amount || "",
        date: data.purchase?.date || "",
        seller_name: data.purchase?.seller_name || "",
        seller_phone: data.purchase?.seller_phone || "",
        seller_aadhaar: data.purchase?.seller_aadhaar || "",
      });
      setSale({
        id: data.sale?.id || null,
        amount: data.sale?.amount || "",
        date: data.sale?.date || "",
        buyer_name: data.sale?.buyer_name || "",
        buyer_phone: data.sale?.buyer_phone || "",
        buyer_aadhaar: data.sale?.buyer_aadhaar || "",
      });
      setExpenses((data.expenses || []).map((expense) => ({
        id: expense.id || null,
        type: expense.type || "",
        amount: expense.amount || "",
        date: expense.date || "",
      })));
      setCoverPreview(data.vehicle.cover_image || null);
      setExistingImages(data.vehicle.images || []);
      setLoading(false);
    });
  }, [checkingAuth, number]);

  const updateExpense = (index, key, value) => {
    const next = [...expenses];
    next[index] = { ...next[index], [key]: value };
    setExpenses(next);
  };

  const addExpense = () => setExpenses([...expenses, { id: null, type: "", amount: "", date: "" }]);
  const removeExpense = (index) => {
    const next = [...expenses];
    if (next[index]?.id) next[index] = { id: next[index].id, type: "", amount: "", date: "" };
    else next.splice(index, 1);
    setExpenses(next);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    if (!file.type.startsWith("image/")) {
      URL.revokeObjectURL(url);
      alert("Upload a valid image file for the cover.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
      setCoverImage(file);
      setCoverPreview(url);
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

  const canNext = () => {
    if (step === 0) return vehicle?.vehicle_number?.trim() && vehicle?.brand?.trim() && vehicle?.model?.trim();
    return true;
  };

  const saveFinance = async (vehicleId) => {
    if (purchase.amount && purchase.date) {
      const payload = { vehicle: vehicleId, amount: parseFloat(purchase.amount), date: purchase.date };
      payload.seller_name = purchase.seller_name;
      payload.seller_phone = purchase.seller_phone;
      payload.seller_aadhaar = purchase.seller_aadhaar;
      if (purchase.id) await api.patch(`purchase/${purchase.id}/`, payload);
      else await api.post("purchase/", payload);
    }

    const hasSaleValue = sale.amount !== "" && Number(sale.amount) > 0;
    if (hasSaleValue) {
      const payload = { vehicle: vehicleId, amount: parseFloat(sale.amount), date: sale.date || new Date().toISOString().slice(0, 10) };
      payload.buyer_name = sale.buyer_name;
      payload.buyer_phone = sale.buyer_phone;
      payload.buyer_aadhaar = sale.buyer_aadhaar;
      if (sale.id) await api.patch(`sale/${sale.id}/`, payload);
      else await api.post("sale/", payload);
    } else if (sale.id) {
      await api.delete(`sale/${sale.id}/`);
    }

    for (const expense of expenses) {
      const isEmpty = !expense.type && !expense.amount && !expense.date;
      if (expense.id && isEmpty) await api.delete(`expense/${expense.id}/`);
      else if (!isEmpty && expense.type && expense.amount && expense.date) {
        const payload = { vehicle: vehicleId, type: expense.type, amount: parseFloat(expense.amount), date: expense.date };
        if (expense.id) await api.patch(`expense/${expense.id}/`, payload);
        else await api.post("expense/", payload);
      }
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("vehicle_number", vehicle.vehicle_number.trim().toUpperCase());
      formData.append("brand", vehicle.brand.trim());
      formData.append("model", vehicle.model.trim());
      formData.append("year", vehicle.year);
      formData.append("name", vehicle.name || `${vehicle.brand} ${vehicle.model}`);
      if (vehicle.km_driven !== "") formData.append("km_driven", vehicle.km_driven);
      if (coverImage) formData.append("cover_image", coverImage);
      extraImages.forEach((image) => formData.append("extra_images", image));

      const res = await api.patch(`vehicles/${vehicle.id}/`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      await saveFinance(res.data.id);
      clearPublicVehicleCache(number);
      clearPublicVehicleCache(res.data.vehicle_number);
      notifyVehiclesChanged({ vehicleNumber: res.data.vehicle_number });
      navigate(`/vehicle/${res.data.vehicle_number}`);
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "Unable to save vehicle.");
    } finally {
      setSaving(false);
    }
  };

  if (checkingAuth || loading || !vehicle) {
    return (
      <Layout>
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "80px 20px" }}>Loading editor...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 className="bebas" style={{ fontSize: "36px", letterSpacing: "2px", color: "var(--text)" }}>
            EDIT VEHICLE
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>{vehicle.vehicle_number}</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", marginBottom: "36px" }}>
          {STEPS.map((s, index) => {
            const isCompleted = index < step;
            const isActive = index === step;
            return (
              <div key={s.label} style={{ display: "flex", alignItems: "center", flex: index < STEPS.length - 1 ? 1 : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => index <= step && setStep(index)}
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      border: "1.5px solid",
                      borderColor: isCompleted ? "var(--success)" : isActive ? "var(--accent)" : "var(--border)",
                      background: isCompleted ? "rgba(34,197,94,0.1)" : isActive ? "var(--accent-dim)" : "var(--surface)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: index <= step ? "pointer" : "default",
                    }}
                  >
                    {isCompleted ? <FiCheck size={16} color="var(--success)" /> : <s.icon size={16} color={isActive ? "var(--accent)" : "var(--text-muted)"} />}
                  </button>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: isActive ? "var(--accent)" : "var(--text-muted)" }}>{s.label}</span>
                </div>
                {index < STEPS.length - 1 && <div style={{ flex: 1, height: "1px", marginBottom: "18px", background: index < step ? "var(--success)" : "var(--border)" }} />}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "18px", padding: "32px", marginBottom: "20px" }}
          >
            <div style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {(() => { const Icon = STEPS[step].icon; return <Icon size={16} color="var(--accent)" />; })()}
                </div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>{STEPS[step].label}</h2>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginLeft: "42px" }}>{STEPS[step].desc}</p>
            </div>

            {step === 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <FieldLabel required>Number Plate</FieldLabel>
                  <input className="input-base" value={vehicle.vehicle_number} onChange={(e) => setVehicle({ ...vehicle, vehicle_number: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <FieldLabel required>Brand</FieldLabel>
                  <input className="input-base" list="edit-vehicle-brand-options" value={vehicle.brand} onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })} />
                  <datalist id="edit-vehicle-brand-options">
                    {VEHICLE_BRANDS.map((brand) => <option key={brand} value={brand} />)}
                  </datalist>
                </div>
                <div>
                  <FieldLabel required>Model</FieldLabel>
                  <input className="input-base" list="edit-vehicle-model-options" value={vehicle.model} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} />
                  <datalist id="edit-vehicle-model-options">
                    {modelsForBrand(vehicle.brand).map((model) => <option key={model} value={model} />)}
                  </datalist>
                </div>
                <div>
                  <FieldLabel>Year</FieldLabel>
                  <input className="input-base" type="number" value={vehicle.year} onChange={(e) => setVehicle({ ...vehicle, year: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>KM Driven</FieldLabel>
                  <input className="input-base" type="number" value={vehicle.km_driven} onChange={(e) => setVehicle({ ...vehicle, km_driven: e.target.value })} />
                </div>
              </div>
            )}

            {step === 1 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <FieldLabel>Purchase Amount</FieldLabel>
                  <input className="input-base" type="number" value={purchase.amount} onChange={(e) => setPurchase({ ...purchase, amount: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Purchase Date</FieldLabel>
                  <input className="input-base" type="date" value={purchase.date || ""} onChange={(e) => setPurchase({ ...purchase, date: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Seller Name</FieldLabel>
                  <input className="input-base" value={purchase.seller_name} onChange={(e) => setPurchase({ ...purchase, seller_name: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Seller Phone</FieldLabel>
                  <input className="input-base" value={purchase.seller_phone} onChange={(e) => setPurchase({ ...purchase, seller_phone: e.target.value })} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <FieldLabel>Seller Aadhaar</FieldLabel>
                  <input className="input-base" value={purchase.seller_aadhaar} onChange={(e) => setPurchase({ ...purchase, seller_aadhaar: e.target.value })} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: "grid", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <FieldLabel>Sold Value</FieldLabel>
                    <input className="input-base" type="number" value={sale.amount} onChange={(e) => setSale({ ...sale, amount: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel>Sold Date</FieldLabel>
                    <input className="input-base" type="date" value={sale.date || ""} onChange={(e) => setSale({ ...sale, date: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel>Buyer Name</FieldLabel>
                    <input className="input-base" value={sale.buyer_name} onChange={(e) => setSale({ ...sale, buyer_name: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel>Buyer Phone</FieldLabel>
                    <input className="input-base" value={sale.buyer_phone} onChange={(e) => setSale({ ...sale, buyer_phone: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <FieldLabel>Buyer Aadhaar</FieldLabel>
                    <input className="input-base" value={sale.buyer_aadhaar} onChange={(e) => setSale({ ...sale, buyer_aadhaar: e.target.value })} />
                  </div>
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                  Sold value marks the vehicle as sold. Clear sold value to mark it unsold.
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                {expenses.map((expense, index) => (
                  <div key={expense.id || index} className="expense-edit-row" style={{ display: "grid", gridTemplateColumns: "minmax(220px, 2fr) minmax(120px, 1fr) minmax(140px, 1fr) auto", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
                    <input className="input-base" placeholder="Type" value={expense.type} onChange={(e) => updateExpense(index, "type", e.target.value)} />
                    <input className="input-base" type="number" placeholder="Amount" value={expense.amount} onChange={(e) => updateExpense(index, "amount", e.target.value)} />
                    <input className="input-base" type="date" value={expense.date || ""} onChange={(e) => updateExpense(index, "date", e.target.value)} />
                    <button className="btn-ghost" type="button" onClick={() => removeExpense(index)} style={{ padding: "10px", color: "var(--danger)", display: "flex" }}>
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                ))}
                <button className="btn-ghost" type="button" onClick={addExpense} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  <FiPlus size={14} /> Add Expense
                </button>
              </div>
            )}

            {step === 4 && (
              <div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
                <input ref={extraFileRef} type="file" accept="image/*,video/*" multiple onChange={handleExtraImagesChange} style={{ display: "none" }} />
                {coverPreview ? (
                  <div style={{ position: "relative" }}>
                    <img src={coverPreview} alt="" style={{ width: "100%", aspectRatio: "var(--vehicle-image-ratio)", objectFit: "cover", borderRadius: "12px", border: "1px solid var(--border)" }} />
                    <button
                      type="button"
                      onClick={() => { setCoverImage(null); setCoverPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                      style={{ position: "absolute", top: "12px", right: "12px", width: "32px", height: "32px", borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    style={{ width: "100%", border: "2px dashed var(--border)", borderRadius: "14px", padding: "60px 20px", textAlign: "center", cursor: "pointer", background: "transparent", color: "var(--text-muted)", fontFamily: "Outfit, sans-serif" }}
                  >
                    <FiUpload size={22} />
                    <div style={{ marginTop: "10px", color: "var(--text)" }}>Upload cover photo</div>
                    <div style={{ fontSize: "13px" }}>JPG, PNG, WEBP - any image shape is allowed</div>
                  </button>
                )}

                <div style={{ marginTop: "18px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                    <FieldLabel>Gallery Media</FieldLabel>
                    <button type="button" className="btn-ghost" onClick={() => extraFileRef.current?.click()} title="Add other photos" style={{ width: "36px", height: "36px", borderRadius: "50%", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FiPlus size={16} />
                    </button>
                  </div>
                  {(existingImages.length > 0 || extraPreviews.length > 0) && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: "10px", marginTop: "12px" }}>
                      {existingImages.map((image, index) => (
                        <div key={`${mediaPreview(image).url}-${index}`} style={{ position: "relative", aspectRatio: "var(--vehicle-image-ratio)", borderRadius: "10px", border: "1px solid var(--border)", overflow: "hidden", background: "var(--surface2)" }}>
                          <MediaPreview media={image} />
                          {mediaPreview(image).media_type === "video" && <span style={{ position: "absolute", right: "6px", bottom: "6px", padding: "2px 6px", borderRadius: "999px", background: "rgba(0,0,0,0.68)", color: "#fff", fontSize: "10px", fontWeight: 800 }}>VIDEO</span>}
                        </div>
                      ))}
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
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <FiArrowLeft size={14} />
            {step === 0 ? "Cancel" : "Back"}
          </button>

          {step < STEPS.length - 1 ? (
            <button className="btn-accent" onClick={() => setStep(step + 1)} disabled={!canNext()} style={{ display: "flex", alignItems: "center", gap: "6px", opacity: canNext() ? 1 : 0.4 }}>
              Continue
              <FiArrowRight size={14} />
            </button>
          ) : (
            <button className="btn-accent" onClick={handleSubmit} disabled={saving} style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "150px", justifyContent: "center" }}>
              {saving ? <FiRefreshCw size={14} /> : <FiCheck size={14} />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default EditVehicle;
