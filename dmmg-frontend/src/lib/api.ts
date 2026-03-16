import axios from "axios";
import { getSessionToken } from "@/lib/session";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() || window.location.origin;

export const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = getSessionToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
