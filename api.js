import axios from "axios";

export const axiosIPv4 = axios.create({
  timeout: 10000,
  proxy: false,
  // IPv4-only
  family: 4,
});
