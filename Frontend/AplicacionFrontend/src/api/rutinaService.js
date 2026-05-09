import { API_BASE_URL } from "./config";

const API_URL = `${API_BASE_URL}/api`;

export const RutinaService = {
  
  /**
   * 1. GENERAR RUTINA CON IA
   */
  async generarRutinaAuto(requestData) {
    try {
      const response = await fetch(`${API_URL}/rutinas/generar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });
      if (!response.ok) throw new Error(await response.text());
      return await response.json(); 
    } catch (error) {
      console.error("Error IA:", error);
      throw error;
    }
  },

  /**
   * 2. CREAR RUTINA MANUAL (¡NUEVO!)
   * Envía la rutina diseñada a mano por el usuario.
   */
  async crearRutinaManual(rutinaData) {
    try {
      const response = await fetch(`${API_URL}/rutinas/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rutinaData),
      });
      if (!response.ok) throw new Error(await response.text());
      return await response.json(); 
    } catch (error) {
      console.error("Error Manual:", error);
      throw error;
    }
  },

  /**
   * 3. OBTENER RUTINAS DEL USUARIO
   */
  async obtenerRutinasUsuario(idCliente) {
    try {
      const response = await fetch(`${API_URL}/rutinas/cliente/${idCliente}`);
      if (!response.ok) return [];
      return await response.json(); 
    } catch (error) {
      return []; 
    }
  },

  /**
   * 4. OBTENER CATÁLOGO DE EJERCICIOS
   */
  async obtenerEjercicios() {
    try {
      const response = await fetch(`${API_URL}/ejercicios`);
      if (!response.ok) throw new Error("Error obteniendo ejercicios");
      return await response.json();
    } catch (error) {
      console.error(error);
      return [];
    }
  }
};
