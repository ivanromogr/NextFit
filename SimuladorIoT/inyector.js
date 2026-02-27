
const axios = require("axios");

const CONFIG = {
  baseUrl: "http://localhost:8080",
  frecuenciaEnvioMs: 5000,
  tipoSensor: "GARMIN_FORERUNNER_965",

  usuarioSimulado: {
    username: "cliente1@gmail.com",
    password: "123456",
  },

 
  idCliente: null,

  
  endpoints: {
    login: "/login",

    // Para cargar ejercicios
    ejercicios: "/api/ejercicios",

    // Para enviar la "rutina" / "lectura" simulada
    insertar: "/api/rutinas/manual",

    
    resolverCliente: {
      meCliente: "/api/clientes/me",
      meUsuario: "/api/usuarios/me",
      listaClientes: "/api/clientes",
      buscarClientePorEmail: "/api/clientes/buscar", // se llamará con ?email=
    },
  },
};

// ===== Variables globales =====
let sessionCookie = null;
let ejerciciosCache = [];

// ===== Helpers =====
function getAxiosConfigConCookie() {
  const config = { headers: { "Content-Type": "application/json" } };
  if (sessionCookie) config.headers["Cookie"] = sessionCookie;
  return config;
}

function printResponseError(prefix, error) {
  const status = error?.response?.status ?? "DESCONOCIDO";
  console.error(`${prefix} (status ${status})`);

  if (error?.response?.data) {
    const body =
      typeof error.response.data === "string"
        ? error.response.data
        : JSON.stringify(error.response.data);
    console.error("   Body:", body);
  } else {
    console.error("   Error:", error.message);
  }
}


async function autenticarSensor() {
  try {
    console.log(`\n[CONECTANDO] Iniciando sesión para: ${CONFIG.usuarioSimulado.username}...`);

    const params = new URLSearchParams();
    params.append("username", CONFIG.usuarioSimulado.username);
    params.append("password", CONFIG.usuarioSimulado.password);

    const response = await axios.post(`${CONFIG.baseUrl}${CONFIG.endpoints.login}`, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const cookies = response.headers["set-cookie"];
    if (cookies && cookies.length > 0) {
      sessionCookie = cookies[0];
    }

    console.log("LOGIN CORRECTO. Sesión establecida.");

    // ✅ Resolver idCliente automáticamente (si no está definido)
    if (!CONFIG.idCliente) {
      CONFIG.idCliente = await resolverIdClientePorApi();
    }

    if (!CONFIG.idCliente) {
      console.log("\n NO SE PUDO RESOLVER idCliente.");
      console.log("Soluciones:");
      console.log(" - (1) Revisa qué endpoint real devuelve el cliente logueado y ajústalo en CONFIG.endpoints.resolverCliente.");
      console.log(" - (2) O usa el UUID real de la tabla Cliente y ponlo en CONFIG.idCliente.");
      return;
    }

    console.log(`idCliente resuelto: ${CONFIG.idCliente}`);

    // Cargar ejercicios
    await cargarEjercicios();
    if (!ejerciciosCache.length) {
      console.log("No hay ejercicios cargados. No enviaré datos para evitar 400.");
      return;
    }

    console.log(`Iniciando inyección de datos cada ${CONFIG.frecuenciaEnvioMs / 1000} segundos.\n`);
    iniciarBucleInyeccion();
  } catch (error) {
    console.error("ERROR CRÍTICO EN LOGIN.");
    printResponseError("   Login falló", error);
  }
}


async function resolverIdClientePorApi() {
  const config = getAxiosConfigConCookie();
  const email = CONFIG.usuarioSimulado.username;

  // ---- Intento A: /api/clientes/me
  try {
    const res = await axios.get(`${CONFIG.baseUrl}${CONFIG.endpoints.resolverCliente.meCliente}`, config);
    // posibles formas: {id: "..."} o {clienteId:"..."} etc
    const id = res?.data?.id || res?.data?.clienteId || res?.data?.idCliente;
    if (id) {
      console.log("idCliente obtenido desde /api/clientes/me");
      return id;
    }
  } catch (e) {
    // no pasa nada, probamos siguiente
  }

  // ---- Intento B: /api/usuarios/me (a veces el usuario incluye cliente.id)
  try {
    const res = await axios.get(`${CONFIG.baseUrl}${CONFIG.endpoints.resolverCliente.meUsuario}`, config);
    const d = res?.data;

    const id =
      d?.cliente?.id ||
      d?.clienteId ||
      d?.idCliente ||
      null;

    if (id) {
      console.log("idCliente obtenido desde /api/usuarios/me");
      return id;
    }
  } catch (e) {}

  // ---- Intento C: listar clientes y filtrar por email
  try {
    const res = await axios.get(`${CONFIG.baseUrl}${CONFIG.endpoints.resolverCliente.listaClientes}`, config);
    if (Array.isArray(res.data)) {
      const encontrado = res.data.find((c) => {
        const mail = (c.email || c.username || "").toLowerCase();
        return mail === email.toLowerCase();
      });

      const id = encontrado?.id || encontrado?.clienteId || encontrado?.idCliente;
      if (id) {
        console.log("idCliente obtenido desde /api/clientes (filtrado por email)");
        return id;
      }
    }
  } catch (e) {}

  // ---- Intento D: buscar por email /api/clientes/buscar?email=...
  try {
    const res = await axios.get(
      `${CONFIG.baseUrl}${CONFIG.endpoints.resolverCliente.buscarClientePorEmail}?email=${encodeURIComponent(email)}`,
      config
    );

    const id = res?.data?.id || res?.data?.clienteId || res?.data?.idCliente;
    if (id) {
      console.log("idCliente obtenido desde /api/clientes/buscar?email=");
      return id;
    }
  } catch (e) {}

  console.log("  No pude resolver idCliente automáticamente con los endpoints configurados.");
  return null;
}


async function cargarEjercicios() {
  try {
    const config = getAxiosConfigConCookie();
    const res = await axios.get(`${CONFIG.baseUrl}${CONFIG.endpoints.ejercicios}`, config);

    if (Array.isArray(res.data)) {
      ejerciciosCache = res.data;
      console.log(`Ejercicios cargados: ${ejerciciosCache.length}`);
      return;
    }

    console.log(" /api/ejercicios respondió pero no devolvió un array.");
  } catch (error) {
    console.log("No se pudieron cargar ejercicios.");
    printResponseError("   Error cargando ejercicios", error);
  }
}


function generarLecturaSensor() {
  const pulsaciones = Math.floor(Math.random() * (185 - 60) + 60);
  const calorias = Math.floor(Math.random() * (25 - 5) + 5);

  const ex = ejerciciosCache[Math.floor(Math.random() * ejerciciosCache.length)];

  return {
    idCliente: CONFIG.idCliente,
    creador: "CLIENTE",

    nombre: `Actividad: ${CONFIG.tipoSensor}`,
    descripcion: `[AUTO-SYNC] Ritmo: ${pulsaciones} ppm | Energía: ${calorias} kcal`,
    objetivo: "Resistencia",

    //  Mandamos 1 ejercicio real (evita validaciones típicas)
    ejercicios: [
      {
        idEjercicio: ex.id,
        series: 1,
        repeticiones: 1,
        peso: 0,
        rpe: 8,
        notas: `[IOT] BPM=${pulsaciones} | kcal=${calorias}`,
      },
    ],
  };
}


async function enviarDato() {
  const datos = generarLecturaSensor();

  try {
    const config = getAxiosConfigConCookie();
    await axios.post(`${CONFIG.baseUrl}${CONFIG.endpoints.insertar}`, datos, config);

    const hora = new Date().toLocaleTimeString();
    console.log(`[ ENVIADO - ${hora}] idCliente=${CONFIG.idCliente} | ${datos.descripcion}`);
  } catch (error) {
    const status = error?.response?.status ?? "DESCONOCIDO";
    console.error(`[FALLO (${status})] No se pudo enviar dato.`);
    if (error?.response?.data) {
      const body =
        typeof error.response.data === "string"
          ? error.response.data
          : JSON.stringify(error.response.data);
      console.error("   Body:", body);
    } else {
      console.error("   Error:", error.message);
    }

    if (status === 400) {
      console.error("   -> 400: El backend rechaza el payload (idCliente inexistente o validación).");
      console.error("   -> Si sigue pasando: revisa qué ID exacto espera el backend (Cliente vs Usuario).");
    }
  }
}

function iniciarBucleInyeccion() {
  enviarDato();
  setInterval(enviarDato, CONFIG.frecuenciaEnvioMs);
}


console.log("--- NEXTFIT IOT SIMULATOR v2.2 (CLIENT ID AUTO) ---");
autenticarSensor();
