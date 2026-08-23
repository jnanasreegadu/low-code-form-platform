import axios from "axios";

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL;
    return url.endsWith("/") ? url : `${url}/`;
  }

  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  if (isLocalhost) {
    return "http://127.0.0.1:8000/api/";
  }

  return "https://low-code-form-platform.onrender.com/api/";
};

const api = axios.create({
  baseURL: getBaseURL(),
});


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;