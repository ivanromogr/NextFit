import React, { useState } from 'react';
import { Upload, Check, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../../api/config';

const ImageUpload = ({ onUploadSuccess, label = 'Subir imagen' }) => {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setMessage('Por favor sube una imagen válida');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('La imagen no debe superar 5MB');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Imagen subida:', data.url);
      
      if (onUploadSuccess) {
        onUploadSuccess(data.url);
      }
      
      setMessage('Imagen subida correctamente');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('❌ Error subiendo imagen:', error);
      setMessage('Error al subir la imagen');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        border: '1px dashed rgba(250, 204, 21, 0.3)',
        borderRadius: '12px',
        cursor: uploading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        opacity: uploading ? 0.6 : 1
      }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
        {uploading ? (
          <>
            <div style={{
              width: 18,
              height: 18,
              border: '2px solid rgba(250, 204, 21, 0.5)',
              borderTop: '2px solid #FACC15',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ color: '#FACC15', fontWeight: 600, fontSize: '0.9rem' }}>Subiendo...</span>
          </>
        ) : (
          <>
            <Upload size={18} color="#FACC15" />
            <span style={{ color: '#FACC15', fontWeight: 600, fontSize: '0.9rem' }}>{label}</span>
          </>
        )}
      </label>

      {message && (
        <div style={{
          marginTop: 8,
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: message.includes('Error') || message.includes('Por favor') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          color: message.includes('Error') || message.includes('Por favor') ? '#EF4444' : '#10B981',
          border: `1px solid ${message.includes('Error') || message.includes('Por favor') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
        }}>
          {message.includes('Error') || message.includes('Por favor') ? (
            <AlertCircle size={16} />
          ) : (
            <Check size={16} />
          )}
          {message}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ImageUpload;
