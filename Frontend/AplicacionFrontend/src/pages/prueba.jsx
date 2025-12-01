import { useEffect, useState } from "react";
import { getClientes } from "../api/endpoints";

export default function Prueba() {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getClientes()
      .then(r => setData(r.data))
      .catch(err => setError(err.message));
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h2>Prueba conexión API (GET /api/clientes)</h2>
      {error && <p style={{color:"red"}}>{error}</p>}
      <ul>
        {data.map((c, i) => (
          <li key={c.id || c.uuid || i}>
            {(c.nombre || c.name || "Cliente")} – {(c.id || c.uuid || "sin id")}
          </li>
        ))}
      </ul>
    </main>
  );
}
