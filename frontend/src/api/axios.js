import axios from "axios";

const apiHost = window.location.hostname || "127.0.0.1";
const isLocalHost = ["localhost", "127.0.0.1"].includes(apiHost);
const fallbackBaseUrl = isLocalHost
  ? `http://${apiHost}:8000/api/`
  : `${window.location.origin}/api/`;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || fallbackBaseUrl,
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

api.interceptors.request.use((config) => {
  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken="))
    ?.split("=")[1];

  if (token) {
    config.headers["X-CSRFToken"] = decodeURIComponent(token);
  }

  return config;
});

export default api;
