import { useState } from 'react';
import { requestEmailChange } from '../../api/endpoints';

const messages = { INVALID_CURRENT_PASSWORD: 'Contraseña actual incorrecta', INVALID_EMAIL: 'Introduce un correo válido', EMAIL_ALREADY_IN_USE: 'Ese correo ya está asociado a otra cuenta' };
export default function CambiarEmail() {
  const [newEmail, setNewEmail] = useState(''); const [currentPassword, setCurrentPassword] = useState(''); const [message, setMessage] = useState('');
  const submit = async (event) => { event.preventDefault(); setMessage(''); try { await requestEmailChange(currentPassword, newEmail); setCurrentPassword(''); setMessage('Te hemos enviado un enlace de confirmación al nuevo correo.'); } catch (error) { setMessage(messages[error.response?.data?.code] || 'No se pudo cambiar el correo'); } };
  return <form onSubmit={submit}><h2>Cambiar correo electrónico</h2><label>Nuevo correo electrónico<input aria-label="Nuevo correo electrónico" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required /></label><label>Contraseña actual<input aria-label="Contraseña actual" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></label><button type="submit">Cambiar correo</button>{message && <p role="status">{message}</p>}</form>;
}
