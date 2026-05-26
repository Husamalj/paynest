"use client";

import axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 65000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
  localStorage.removeItem("paynest_logged_in");
  localStorage.removeItem("paynest_employee_id");
  if (window.location.pathname !== "/") window.location.href = "/";
}

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: any) => {
    const status = error.response?.status;
    const isTimeout = error.code === "ECONNABORT" || error.message?.includes("timeout");
    const message = isTimeout
      ? "Server is waking up, please try again in a moment."
      : (typeof error.response?.data?.error === "string" ? error.response.data.error : null) ||
        error.message ||
        "Request failed";

    console.error("API Error:", status, message);

    if (status === 401) {
      logoutUser();
      return Promise.reject(new Error("Session expired. Please login again."));
    }
    if (status === 403) {
      if (message.toLowerCase().includes("inactive") || message.toLowerCase().includes("forbidden")) {
        logoutUser();
      }
      return Promise.reject(new Error(message));
    }
    return Promise.reject(new Error(message));
  }
);

export const apiPostForm = (url: string, formData: FormData) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return fetch(`/api${url}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data;
  });
};

export default api;
