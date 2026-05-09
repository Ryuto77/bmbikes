import axios from "axios";

let csrfToken = "";

const apiHost = window.location.hostname || "127.0.0.1";
const isLocalHost = ["localhost", "127.0.0.1"].includes(apiHost);
const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();
const fallbackBaseUrl = isLocalHost
  ? `http://${apiHost}:8000/api/`
  : "/api/";
const apiBaseUrl = configuredBaseUrl || fallbackBaseUrl;

if (!configuredBaseUrl && !isLocalHost) {
  console.error(
    "Missing VITE_API_BASE_URL. Using same-origin /api/ fallback; set VITE_API_BASE_URL to your Django API URL for Vercel + Render."
  );
}

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

api.interceptors.request.use((config) => {
  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken="))
    ?.split("=")[1];

  const headerToken = csrfToken || token;

  if (headerToken) {
    config.headers["X-CSRFToken"] = decodeURIComponent(headerToken);
  }

  return config;
});

function htmlErrorMessage(status) {
  return `Server error${status ? ` (${status})` : ""}. Check the backend logs for the full traceback.`;
}

api.interceptors.response.use((response) => {
  if (response.data?.csrf_token) {
    csrfToken = response.data.csrf_token;
  }

  if (typeof response.data === "string" && /<html|<!doctype html/i.test(response.data.slice(0, 200))) {
    return Promise.reject(
      new Error(
        "The frontend received HTML instead of API JSON. Check VITE_API_BASE_URL and make sure it points to Django."
      )
    );
  }

  return response;
}, (error) => {
  if (typeof error.response?.data === "string" && /<html|<!doctype html/i.test(error.response.data.slice(0, 200))) {
    error.response.data = { error: htmlErrorMessage(error.response.status) };
  }

  return Promise.reject(error);
});

export default api;
