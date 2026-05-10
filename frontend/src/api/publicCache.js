const VEHICLES_CACHE_KEY = "bestmotors-public-vehicles";
const VEHICLE_DETAIL_PREFIX = "bestmotors-public-vehicle:";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

function now() {
  return Date.now();
}

function readCache(key) {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    if (!cached || cached.expiresAt < now()) {
      localStorage.removeItem(key);
      return null;
    }
    return cached.value;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ value, expiresAt: now() + CACHE_TTL_MS }));
  } catch {
    // localStorage can fail in private browsing or when storage is full.
  }
}

export function publicVehicle(vehicle) {
  if (!vehicle || typeof vehicle !== "object") return vehicle;
  return { ...vehicle };
}

export function publicVehicleDetail(data) {
  if (!data?.vehicle) return data;
  return { ...data, vehicle: publicVehicle(data.vehicle) };
}

export function getCachedVehicles() {
  return readCache(VEHICLES_CACHE_KEY);
}

export function setCachedVehicles(vehicles) {
  writeCache(VEHICLES_CACHE_KEY, (vehicles || []).map(publicVehicle));
}

export function clearCachedVehicles() {
  try {
    localStorage.removeItem(VEHICLES_CACHE_KEY);
  } catch {
    // localStorage can fail in private browsing or when storage is full.
  }
}

export function getCachedVehicleDetail(number) {
  const cached = readCache(`${VEHICLE_DETAIL_PREFIX}${String(number || "").toUpperCase()}`);
  return cached?.cached_public ? null : cached;
}

export function setCachedVehicleDetail(number, data) {
  writeCache(`${VEHICLE_DETAIL_PREFIX}${String(number || "").toUpperCase()}`, publicVehicleDetail(data));
}

export function clearCachedVehicleDetail(number) {
  try {
    localStorage.removeItem(`${VEHICLE_DETAIL_PREFIX}${String(number || "").toUpperCase()}`);
  } catch {
    // localStorage can fail in private browsing or when storage is full.
  }
}

export function clearPublicVehicleCache(number) {
  clearCachedVehicles();
  if (number) clearCachedVehicleDetail(number);
}

export function notifyVehiclesChanged(detail = {}) {
  window.dispatchEvent(new CustomEvent("vehicles-changed", { detail }));
}
