import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

const serverMessages = { INVALID_CURRENT_PASSWORD: 'La contraseña actual no es correcta.', INVALID_PASSWORD: 'La nueva contraseña no cumple los requisitos.', NEW_PASSWORD_MUST_BE_DIFFERENT: 'La nueva contraseña debe ser diferente de la actual.' };
export default function CambiarPassword() {
  const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState(''); const [message, setMessage] = useState('');
  const { clearLocalSession } = useAuth(); const navigate = useNavigate();
  const submit = async (event) => {
    event.preventDefault(); setMessage('');
    if (!currentPassword || !newPassword || !confirmPassword) return setMessage('Completa todos los campos.');
    if (newPassword.length < 8 || newPassword.length > 128) return setMessage('La nueva contraseña debe tener entre 8 y 128 caracteres.');
    if (newPassword !== confirmPassword) return setMessage('Las nuevas contraseñas no coinciden.');
    if (newPassword === currentPassword) return setMessage('La nueva contraseña debe ser diferente de la actual.');
    try { await changePassword(currentPassword, newPassword); clearLocalSession(); navigate('/auth/login', { replace: true }); }
    catch (error) { setMessage(serverMessages[error.response?.data?.code] || 'No se pudo actualizar la contraseña.'); }
  };
  return <form onSubmit={submit}><h2>Cambiar contraseña</h2><label>Contraseña actual<input aria-label="Contraseña actual" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></label><label>Nueva contraseña<input aria-label="Nueva contraseña" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></label><label>Confirmar nueva contraseña<input aria-label="Confirmar nueva contraseña" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></label><button type="submit">Actualizar contraseña</button>{message && <p role="status">{message}</p>}</form>;
}
