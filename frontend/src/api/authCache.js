const AUTH_CACHE_KEY = "bestmotors-auth";

export function getCachedAuthState() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(AUTH_CACHE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") {
      return { checked: false, is_authenticated: false, username: "" };
    }
    return {
      checked: Boolean(parsed.checked),
      is_authenticated: Boolean(parsed.is_authenticated),
      username: parsed.username || "",
      is_staff: Boolean(parsed.is_staff),
    };
  } catch {
    return { checked: false, is_authenticated: false, username: "" };
  }
}

export function setCachedAuthState(auth) {
  sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
    checked: true,
    is_authenticated: Boolean(auth?.is_authenticated),
    username: auth?.username || "",
    is_staff: Boolean(auth?.is_staff),
  }));
}

export function clearCachedAuthState() {
  sessionStorage.removeItem(AUTH_CACHE_KEY);
}
