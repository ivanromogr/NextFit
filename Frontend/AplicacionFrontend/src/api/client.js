import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:8080",  // 👈 el puerto en el que tienes Spring Boot
  withCredentials: true,             // opcional, pero no molesta
});
