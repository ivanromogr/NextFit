import { useEffect, useRef, useState } from 'react';
import { requestEmailChange } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

const messages = { INVALID_CURRENT_PASSWORD: 'Contraseña actual incorrecta', INVALID_EMAIL: 'Introduce un correo válido', EMAIL_ALREADY_IN_USE: 'Ese correo ya está asociado a otra cuenta' };
export default function CambiarEmail() {
  const { userId } = useAuth();
  return <EmailForm key={userId || 'anonymous'} />;
}

function EmailForm() {
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const request = useRef({ active: true, pending: false });
  useEffect(() => {
    const current = request.current;
    current.active = true;
    return () => { current.active = false; };
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    if (!request.current.active || request.current.pending) return;
    request.current.pending = true;
    setLoading(true);
    setMessage('');
    try {
      await requestEmailChange(currentPassword, newEmail.trim());
      if (!request.current.active) return;
      setCurrentPassword('');
      setMessage('Te hemos enviado un enlace de confirmación al nuevo correo.');
    } catch (error) {
      if (request.current.active) setMessage(messages[error.response?.data?.code] || 'No se pudo cambiar el correo. Inténtalo de nuevo.');
    } finally {
      request.current.pending = false;
      if (request.current.active) setLoading(false);
    }
  };
  return <form onSubmit={submit}><h2>Cambiar correo electrónico</h2>
    <label>Nuevo correo electrónico<input aria-label="Nuevo correo electrónico" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required /></label>
    <label>Contraseña actual<input aria-label="Contraseña actual" type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></label>
    <button type="submit" disabled={loading}>{loading ? 'Enviando…' : 'Cambiar correo'}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
