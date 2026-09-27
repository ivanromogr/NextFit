import { useState } from 'react';
import { changeEmail } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

const messages = { INVALID_CURRENT_PASSWORD: 'Contraseña actual incorrecta', INVALID_EMAIL: 'Introduce un correo válido', EMAIL_ALREADY_IN_USE: 'Ese correo ya está asociado a otra cuenta' };
export default function CambiarEmail() {
  const { login } = useAuth();
  const [newEmail, setNewEmail] = useState(''); const [currentPassword, setCurrentPassword] = useState(''); const [message, setMessage] = useState('');
  const submit = async (event) => { event.preventDefault(); setMessage(''); try { const response = await changeEmail(currentPassword, newEmail); login(response.data); setNewEmail(response.data.user.email); setCurrentPassword(''); setMessage('Correo actualizado correctamente'); } catch (error) { setMessage(messages[error.response?.data?.code] || 'No se pudo cambiar el correo'); } };
  return <form onSubmit={submit}><h2>Cambiar correo electrónico</h2><label>Nuevo correo electrónico<input aria-label="Nuevo correo electrónico" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required /></label><label>Contraseña actual<input aria-label="Contraseña actual" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></label><button type="submit">Cambiar correo</button>{message && <p role="status">{message}</p>}</form>;
}
