import { useEffect, useReducer, useState } from 'react';
import { getEntrenador, obtenerClientesEntrenador, obtenerDashboardResumen } from '../api/endpoints';

function validateSummary(data) {
    if (!Array.isArray(data?.feedActividad) || !data?.stats
        || !['hoy', 'riesgo', 'records'].every(key => Number.isFinite(data.stats[key]))) {
        throw new Error('Invalid dashboard summary');
    }
    return data;
}

export default function useCoachDashboard(accountId) {
    const [revision, refresh] = useReducer(value => value + 1, 0);
    const [result, setResult] = useState(null);
    const key = JSON.stringify([accountId, revision]);
    useEffect(() => {
        if (!accountId) return;
        let active = true;
        let busy = true;
        let latestFeedId = null;
        let toastTimer;
        const update = transform => {
            if (active) setResult(previous => previous?.key === key ? transform(previous) : previous);
        };
        const poll = async () => {
            if (busy || !active) return;
            busy = true;
            try {
                const summary = validateSummary(await obtenerDashboardResumen(accountId));
                if (!active) return;
                const latest = summary.feedActividad[0];
                const notify = latest?.id && latestFeedId && latest.id !== latestFeedId;
                latestFeedId = latest?.id || null;
                update(previous => ({ ...previous, summary, failures: { ...previous.failures, summary: false },
                    ...(notify ? { toast: { clienteNombre: latest.clienteNombre, rutina: latest.rutina } } : {}) }));
                if (notify) {
                    clearTimeout(toastTimer);
                    toastTimer = setTimeout(() => update(previous => ({ ...previous, toast: null })), 4500);
                }
            } catch {
                update(previous => ({ ...previous, failures: { ...previous.failures, summary: true } }));
            } finally {
                busy = false;
            }
        };
        Promise.allSettled([
            Promise.resolve().then(() => obtenerClientesEntrenador(accountId)).then(data => {
                if (!Array.isArray(data)) throw new Error('Invalid athlete list');
                return data;
            }),
            Promise.resolve().then(() => obtenerDashboardResumen(accountId)).then(validateSummary),
            Promise.resolve().then(() => getEntrenador(accountId)).then(data => {
                const profile = data?.entrenador || data;
                if (!profile || typeof profile.nombre !== 'string') throw new Error('Invalid profile');
                return { nombre: profile.nombre || 'Coach', fotoPerfil: profile.fotoPerfil || '' };
            }),
        ]).then(([clients, summary, profile]) => {
            if (!active) return;
            latestFeedId = summary.status === 'fulfilled' ? summary.value.feedActividad[0]?.id || null : null;
            setResult({ key, clients: clients.status === 'fulfilled' ? clients.value : null,
                summary: summary.status === 'fulfilled' ? summary.value : null,
                profile: profile.status === 'fulfilled' ? profile.value : null,
                failures: { clients: clients.status === 'rejected', summary: summary.status === 'rejected',
                    profile: profile.status === 'rejected' }, toast: null });
            busy = false;
        });
        const interval = setInterval(poll, 8000);
        window.addEventListener('focus', poll);
        return () => {
            active = false;
            clearInterval(interval);
            clearTimeout(toastTimer);
            window.removeEventListener('focus', poll);
        };
    }, [accountId, key]);
    const current = result?.key === key ? result : null;
    return { ...current, loading: !current, refresh };
}
