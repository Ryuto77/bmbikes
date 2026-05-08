import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowUpRight, FiRefreshCw } from "react-icons/fi";

function VehicleCard({ vehicle, canManage = false, onStatusChange, statusUpdating = false }) {
  const navigate = useNavigate();

  const isSold = vehicle.status === "sold";

  return (
    <motion.div
      onClick={() => navigate(`/vehicle/${vehicle.vehicle_number}`)}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        cursor: "pointer",
        overflow: "hidden",
        position: "relative",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-accent)";
        e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Image */}
      <div
        style={{
          width: "100%",
          aspectRatio: "var(--vehicle-image-ratio)",
          background: "var(--surface2)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {vehicle.cover_image ? (
          <img
            src={vehicle.cover_image}
            alt={vehicle.vehicle_number}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.4s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, var(--surface2), var(--surface))",
            }}
          >
            <span style={{ fontSize: "40px", opacity: 0.15 }}>🚗</span>
          </div>
        )}

        {/* Status badge */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (canManage && onStatusChange) {
              onStatusChange(vehicle, isSold ? "unsold" : "sold");
            }
          }}
          disabled={!canManage || statusUpdating}
          title={canManage ? `Mark as ${isSold ? "in stock" : "sold"}` : undefined}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            background: isSold ? "var(--sold-bg)" : "var(--unsold-bg)",
            color: isSold ? "var(--success)" : "var(--danger)",
            border: `1px solid ${isSold ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
            backdropFilter: "blur(8px)",
            cursor: canManage ? "pointer" : "default",
            fontFamily: "Outfit, sans-serif",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            opacity: statusUpdating ? 0.75 : 1,
          }}
        >
          {statusUpdating && <FiRefreshCw size={10} />}
          {isSold ? "Sold" : "In Stock"}
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div
              className="bebas"
              style={{
                fontSize: "20px",
                letterSpacing: "1.5px",
                color: "var(--text)",
                lineHeight: 1.1,
                marginBottom: "4px",
              }}
            >
              {vehicle.vehicle_number}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>{vehicle.brand}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{vehicle.model}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{vehicle.year}</span>
            </div>
          </div>

          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginLeft: "8px",
            }}
          >
            <FiArrowUpRight size={13} color="var(--text-muted)" />
          </div>
        </div>

        {/* KM driven */}
        <div
          style={{
            marginTop: "10px",
            fontSize: "12px",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            minHeight: "18px",
          }}
        >
          {vehicle.km_driven ? (
            <>
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  display: "inline-block",
                  opacity: 0.7,
                }}
              />
              {vehicle.km_driven.toLocaleString()} km
            </>
          ) : (
            <span style={{ opacity: 0.65 }}>KM not set</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default VehicleCard;
