import axios, { AxiosRequestConfig } from "axios";

// Create instance focusing relative requests to the same server
const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Configure token injection interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("well_dropp_jwt");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Graceful global error handler helper
export function extractErrorMessage(error: any): string {
  if (error.response && error.response.data) {
    const data = error.response.data;
    if (data.error) {
      if (typeof data.error === "string") return data.error;
      if (typeof data.error === "object") {
        if (data.error.message && typeof data.error.message === "string") return data.error.message;
        return JSON.stringify(data.error);
      }
    }
    if (data.message && typeof data.message === "string") {
      return data.message;
    }
  }
  return error.message || "An unexpected error occurred. Please try again.";
}

export default api;
