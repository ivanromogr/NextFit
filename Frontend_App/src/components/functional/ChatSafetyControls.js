import React, { useEffect, useRef, useState } from 'react';
import { AppState, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../../api/endpoints';

const reasons = [['HARASSMENT', 'Acoso o amenazas'], ['SPAM', 'Spam o publicidad'], ['INAPPROPRIATE', 'Contenido inapropiado'], ['OTHER', 'Otro motivo']];

export default function ChatSafetyControls({ otherId, onStateChange, reportMessageId, onCloseReport, revision = 0 }) {
    const [state, setState] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirmBlock, setConfirmBlock] = useState(false);
    const [reason, setReason] = useState('HARASSMENT');
    const generation = useRef(0);
    const requests = useRef(0);
    const saving = useRef(false);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        let active = true;
        generation.current += 1;
        setState(null); setError(''); setNotice(''); setBusy(false); setConfirmBlock(false);
        onStateChange(null);
        const load = () => {
            if (saving.current) return;
            const request = ++requests.current;
            return api.get(`/chat/safety/${otherId}`).then(({ data }) => {
            if (active && request === requests.current) { setState(data); onStateChange(data); setError(''); }
        }).catch(() => { if (active && request === requests.current) { setState(null); setError('No se pudo comprobar el estado del chat.'); onStateChange(null); } });
        };
        load();
        const subscription = AppState.addEventListener('change', value => { if (value === 'active') load(); });
        return () => { active = false; generation.current += 1; subscription.remove(); };
    }, [otherId, onStateChange, revision, retry]);
    const close = () => { if (!busy) { setConfirmBlock(false); onCloseReport(); } };
    const submit = async () => {
        const current = generation.current;
        requests.current += 1; saving.current = true;
        setBusy(true); setError('');
        try {
            if (reportMessageId) {
                await api.post(`/chat/messages/${reportMessageId}/reports`, { reason });
                if (current === generation.current) { setNotice('Denuncia registrada. Puedes bloquear el chat si necesitas dejar de recibir mensajes.'); onCloseReport(); }
            } else {
                const { data } = await api[state?.blockedByMe ? 'delete' : 'put'](`/chat/blocks/${otherId}`);
                if (current === generation.current) { setState(data); onStateChange(data); setConfirmBlock(false); setNotice(data.blockedByMe ? 'Chat bloqueado. El historial se conserva.' : 'Has desbloqueado el chat.'); }
            }
        } catch { if (current === generation.current) setError('No se pudo guardar el cambio. Inténtalo de nuevo.'); }
        finally { saving.current = false; if (current === generation.current) setBusy(false); }
    };
    return <View style={styles.bar}>
        <View style={styles.row}>
            <Text style={styles.label}>Seguridad del chat</Text>
            <TouchableOpacity accessibilityRole="button" disabled={!state || busy} onPress={() => setConfirmBlock(true)} style={styles.button}>
                <Text style={styles.buttonText}>{state?.blockedByMe ? 'Desbloquear' : 'Bloquear chat'}</Text>
            </TouchableOpacity>
        </View>
        {state && !state.canSend && <Text style={styles.text}>{state.blockedByMe ? 'Has bloqueado este chat.' : 'Esta conversación no admite nuevos mensajes.'}</Text>}
        {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!!error && !state && <TouchableOpacity accessibilityRole="button" onPress={() => setRetry(value => value + 1)} style={styles.button}><Text style={styles.buttonText}>Reintentar</Text></TouchableOpacity>}
        <Modal visible={confirmBlock || !!reportMessageId} transparent animationType="fade" onRequestClose={close}>
            <View style={styles.overlay}><View style={styles.dialog} accessibilityViewIsModal>
                <Text accessibilityRole="header" style={styles.title}>{reportMessageId ? 'Denunciar mensaje' : state?.blockedByMe ? 'Desbloquear chat' : 'Bloquear chat'}</Text>
                <Text style={styles.text}>{reportMessageId ? 'Selecciona el motivo. La denuncia queda registrada sin avisar a la otra persona.' : state?.blockedByMe ? 'Podrás volver a intercambiar mensajes si la conversación sigue disponible.' : 'Ninguno de los dos podrá enviar nuevos mensajes. El historial se conserva y puedes desbloquear el chat cuando quieras.'}</Text>
                {!!reportMessageId && reasons.map(([value, label]) => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ checked: reason === value }} disabled={busy} onPress={() => setReason(value)} style={[styles.reason, reason === value && styles.selected]}>
                    <Text style={styles.buttonText}>{label}</Text>
                </TouchableOpacity>)}
                {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
                <View style={styles.actions}>
                    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={close} style={styles.button}><Text style={styles.buttonText}>Cancelar</Text></TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={submit} style={[styles.button, styles.primary]}><Text style={styles.primaryText}>{busy ? 'Guardando…' : reportMessageId ? 'Enviar denuncia' : 'Confirmar'}</Text></TouchableOpacity>
                </View>
            </View></View>
        </Modal>
    </View>;
}
const styles = StyleSheet.create({
    bar: { backgroundColor:'#101012', padding:12, borderBottomColor:'#27272a', borderBottomWidth:1 },
    row: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:8 },
    label: { color:'#a1a1aa', fontSize:12 },
    button: { borderColor:'#3f3f46', borderWidth:1, borderRadius:10, padding:12, minHeight:44, justifyContent:'center' },
    buttonText: { color:'#e4e4e7', fontSize:13 },
    text: { color:'#bcbcc5', fontSize:14, lineHeight:21, marginVertical:12 },
    notice: { color:'#fde047', marginTop:10, lineHeight:20 },
    error: { color:'#fca5a5', marginTop:10 },
    overlay: { flex:1, backgroundColor:'rgba(0,0,0,.8)', justifyContent:'center', padding:20 },
    dialog: { backgroundColor:'#141416', padding:24, borderRadius:18, borderWidth:1, borderColor:'#3f3f46' },
    title: { color:'#fafafa', fontSize:20, fontWeight:'700' },
    reason: { padding:12, minHeight:44, borderWidth:1, borderColor:'#3f3f46', borderRadius:8, marginBottom:8 },
    selected: { borderColor:'#facc15', backgroundColor:'rgba(250,204,21,.08)' },
    actions: { flexDirection:'row', justifyContent:'flex-end', gap:10, marginTop:20, flexWrap:'wrap' },
    primary: { backgroundColor:'#facc15', borderColor:'#facc15' },
    primaryText: { color:'#09090b', fontWeight:'700', fontSize:13 },
});
