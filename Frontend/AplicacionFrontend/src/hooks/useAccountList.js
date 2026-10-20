import { useEffect, useReducer, useState } from 'react';

// Scope both loaded data and retries to the authenticated account.
export default function useAccountList(accountId, load) {
    const [revision, refresh] = useReducer(value => value + 1, 0);
    const [result, setResult] = useState(null);
    const key = JSON.stringify([accountId, revision]);
    useEffect(() => {
        if (!accountId) return;
        let active = true;
        Promise.resolve().then(() => load(accountId)).then(data => {
            if (!Array.isArray(data)) throw new Error('Invalid list response');
            if (active) setResult({ key, data });
        }).catch(() => {
            if (active) setResult({ key, error: true });
        });
        return () => { active = false; };
    }, [accountId, key, load]);
    const current = result?.key === key ? result : null;
    const update = transform => setResult(previous => previous?.key === key && previous.data
        ? { ...previous, data: transform(previous.data) } : previous);
    return { data: current?.data || [], loading: !!accountId && !current,
        error: !!current?.error, refresh, update };
}
