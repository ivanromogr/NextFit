import React from "react";
import { Upload, Image as ImageIcon } from "lucide-react";
import { API_BASE_URL } from "../../api/config";

export default function ImageUploadLocal({ onUploadSuccess }) {
    
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validar que sea una imagen
            if (!file.type.startsWith('image/')) {
                alert("Por favor, selecciona un archivo de imagen válido.");
                return;
            }

            // FileReader para convertir a Base64
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result;
                
               
                try {
                    const response = await fetch(`${API_BASE_URL}/api/upload/base64`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ base64: base64String })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        alert(`Error al subir imagen: ${errorData.error || 'Error desconocido'}`);
                        return;
                    }

                    const data = await response.json();
                    // Devolver la URL pública al componente padre
                    onUploadSuccess(data.url);
                } catch (error) {
                    console.error('Error subiendo imagen:', error);
                    alert('Error al subir la imagen al servidor');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            {/* Input oculto que abre el selector de archivos */}
            <input
                type="file"
                id="fileInput"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            
            {/* Botón visual profesional */}
            <label 
                htmlFor="fileInput"
                style={{
                    border: "2px dashed #27272a",
                    borderRadius: "20px",
                    padding: "30px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    background: "rgba(255,255,255,0.02)",
                    display: "block"
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#FACC15";
                    e.currentTarget.style.background = "rgba(250, 204, 21, 0.05)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#27272a";
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                }}
            >
                <div style={{
                    background: "#FACC15",
                    width: "50px",
                    height: "50px",
                    borderRadius: "15px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 15px auto"
                }}>
                    <Upload color="black" size={24} />
                </div>
                <p style={{ margin: 0, fontWeight: "800", fontSize: "0.9rem", color: "white" }}>
                    CARGAR DESDE PC
                </p>
                <p style={{ margin: "5px 0 0 0", color: "#71717a", fontSize: "0.75rem" }}>
                    Selecciona una foto de tu carpeta
                </p>
            </label>
        </div>
    );
}
