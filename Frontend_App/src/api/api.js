import axios from 'axios';

// ✅ Quitamos el "/api" del final
const API_URL = 'http://192.168.1.62:8080/api'; 

export const api = axios.create({
    baseURL: API_URL,
    timeout: 10000, 
});

export default api;