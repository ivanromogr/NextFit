import { useState } from "react";
import { getDataExport } from "../../api/endpoints";

const filenameFromDisposition = (value) => {
  const match = value?.match(/filename="?([^";]+)"?/i);
  return match?.[1] || `nextfit-data-${new Date().toISOString().slice(0, 10)}.json`;
};

export default function ExportarDatos() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const download = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getDataExport();
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filenameFromDisposition(response.headers?.["content-disposition"]);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("No se pudieron descargar tus datos. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return <section aria-labelledby="data-export-title">
    <h2 id="data-export-title">Exportar mis datos</h2>
    <p>Descarga una copia de los datos asociados a tu cuenta.</p>
    <button type="button" onClick={download} disabled={loading}>
      {loading ? "Preparando descarga…" : "Descargar mis datos"}
    </button>
    {error && <p role="status">{error}</p>}
  </section>;
}
