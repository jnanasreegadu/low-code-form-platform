import axios from "axios";

const api = axios.create({
  baseURL: "https://low-code-form-platform.onrender.com/api/",
});

export default api;