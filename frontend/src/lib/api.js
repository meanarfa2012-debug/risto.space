import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("resto_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      // Token invalid — clear local state
      localStorage.removeItem("resto_token");
      localStorage.removeItem("resto_user");
    }
    return Promise.reject(err);
  }
);

export const fileUrl = (path) => (path ? `${API}/files/${path}` : "");

export default api;
