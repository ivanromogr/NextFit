import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

const serverMessages = { INVALID_CURRENT_PASSWORD: 'La contraseña actual no es correcta.', INVALID_PASSWORD: 'La nueva contraseña no cumple los requisitos.', NEW_PASSWORD_MUST_BE_DIFFERENT: 'La nueva contraseña debe ser diferente de la actual.' };
export default function CambiarPassword() {
  const { userId, clearLocalSession } = useAuth();
  return <PasswordForm key={userId || 'anonymous'} clearLocalSession={clearLocalSession} />;
}

function PasswordForm({ clearLocalSession }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef({ active: true, pending: false, completed: false });
  const navigate = useNavigate();
  useEffect(() => {
    const current = request.current;
    current.active = true;
    return () => { current.active = false; };
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    if (!request.current.active || request.current.pending || request.current.completed) return;
    setMessage('');
    if (!currentPassword || !newPassword || !confirmPassword) return setMessage('Completa todos los campos.');
    if (newPassword.length < 8 || newPassword.length > 128) return setMessage('La nueva contraseña debe tener entre 8 y 128 caracteres.');
    if (newPassword !== confirmPassword) return setMessage('Las nuevas contraseñas no coinciden.');
    if (newPassword === currentPassword) return setMessage('La nueva contraseña debe ser diferente de la actual.');
    request.current.pending = true;
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      if (!request.current.active) return;
      request.current.completed = true;
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      await clearLocalSession();
      if (request.current.active) navigate('/auth/login', { replace: true });
    } catch (error) {
      if (request.current.active) setMessage(request.current.completed
        ? 'La contraseña ya se ha actualizado. Vuelve a iniciar sesión.'
        : serverMessages[error.response?.data?.code] || 'No se pudo actualizar la contraseña.');
    } finally {
      request.current.pending = false;
      if (request.current.active) setBusy(false);
    }
  };
  const disabled = busy || request.current.completed;
  return <form onSubmit={submit}>
    <h2>Cambiar contraseña</h2>
    <label>Contraseña actual<input aria-label="Contraseña actual" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={disabled} required /></label>
    <label>Nueva contraseña<input aria-label="Nueva contraseña" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={disabled} required /></label>
    <label>Confirmar nueva contraseña<input aria-label="Confirmar nueva contraseña" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={disabled} required /></label>
    <button type="submit" disabled={disabled}>{busy ? 'Actualizando…' : 'Actualizar contraseña'}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
