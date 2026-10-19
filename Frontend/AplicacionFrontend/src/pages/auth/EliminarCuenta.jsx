import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteAccount, deleteAccountWithGoogle, deleteAccountWithApple, getAuthIdentities } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import GoogleSignIn from '../../components/auth/GoogleSignIn';
import { appleConfig, startAppleSignIn } from '../../services/appleAuthWeb';

export default function EliminarCuenta() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const completed = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const { clearLocalSession } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError(false); setMessage('');
    getAuthIdentities().then(({ data }) => {
      if (active) {
        if (!Array.isArray(data) || !data.some(i => i.active && ['LOCAL', 'GOOGLE', 'APPLE'].includes(i.provider))) throw new Error('NO_METHOD');
        setIdentities(data);
      }
    }).catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);
  const has = provider => identities.some(i => i.active && i.provider === provider);
  const run = useCallback(async (operation) => {
    if (!mounted.current || lock.current || completed.current || loading || loadError) return;
    lock.current = true;
    if (!window.confirm('Se desactivará tu cuenta y se cerrarán todas tus sesiones. ¿Quieres continuar?')) { lock.current = false; return; }
    setBusy(true); setMessage('');
    try {
      await operation();
      completed.current = true;
      setPassword('');
      await clearLocalSession();
      navigate('/auth/login', { replace: true });
    } catch (error) {
      if (completed.current) setMessage('Tu cuenta ya está desactivada. Recarga la página para salir.');
      else if (!/cancelled|canceled/i.test(error?.message || '')) setMessage(error.response?.data?.code === 'INVALID_CURRENT_PASSWORD'
        ? 'La contraseña actual no es correcta.'
        : error.response?.data?.code === 'INVALID_REAUTH_TOKEN'
          ? 'Confirma tu identidad con una cuenta que esté vinculada a NextFit.'
          : 'No se pudo eliminar la cuenta. Inténtalo de nuevo.');
    } finally { lock.current = false; setBusy(false); }
  }, [loading, loadError, clearLocalSession, navigate]);
  const google = useCallback(credential => run(() => deleteAccountWithGoogle(credential)), [run]);
  const apple = () => run(async () => {
    const { identityToken, nonce } = await startAppleSignIn();
    if (!mounted.current) throw new Error('cancelled');
    await deleteAccountWithApple(identityToken, nonce);
  });
  const submit = event => {
    event.preventDefault();
    if (!password) return setMessage('Introduce tu contraseña actual.');
    run(() => deleteAccount(password));
  };
  const disabled = busy || completed.current;
  return <section aria-labelledby="delete-account-title">
    <h2 id="delete-account-title">Eliminar cuenta</h2>
    <p>Se desactivará tu cuenta y se cerrarán todas tus sesiones. Los registros históricos no se borran automáticamente.</p>
    {loading && <p role="status">Cargando métodos de verificación…</p>}
    {loadError && <div role="alert"><p>No se pudieron cargar tus métodos de acceso.</p><button type="button" onClick={() => setRetry(n => n + 1)}>Reintentar</button></div>}
    {!loading && !loadError && <>
      {has('LOCAL') && <form onSubmit={submit}>
        <label>Contraseña actual<input aria-label="Contraseña actual" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} disabled={disabled} required /></label>
        <button type="submit" disabled={disabled}>{busy ? 'Eliminando cuenta…' : 'Eliminar mi cuenta'}</button>
      </form>}
      {(has('GOOGLE') || has('APPLE')) && <div>
        <p>También puedes confirmar tu identidad con un método vinculado a tu cuenta.</p>
        {has('GOOGLE') && (import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID
          ? <GoogleSignIn onCredential={google} disabled={disabled} />
          : <p>Google no está disponible en esta instalación.</p>)}
        {has('APPLE') && (appleConfig().appleAuthEnabled
          ? <button type="button" disabled={disabled} onClick={apple}>Confirmar con Apple y eliminar cuenta</button>
          : <p>Apple no está disponible en esta instalación.</p>)}
      </div>}
    </>}
    {busy && <p role="status">Verificando y eliminando cuenta…</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
