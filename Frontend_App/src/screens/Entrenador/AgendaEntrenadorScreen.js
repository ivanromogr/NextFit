import React, { useState, useCallback, useEffect } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, 
    ActivityIndicator, SafeAreaView, StatusBar, Modal, FlatList, Alert 
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { 
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, 
    User, Dumbbell, CheckCircle2, Bell, Plus, X, Search, Check
} from 'lucide-react-native';

// Endpoints y Auth
import { obtenerClientesEntrenador, obtenerEventosCalendario, getEntrenador } from '../../api/endpoints';
import { useAuth } from '../../components/context/AuthContext';

const diasNombres = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function AgendaEntrenadorScreen() {
    const navigation = useNavigation();
    const { userId, user } = useAuth();
    const entrenadorId = userId || user?.id; 
    
    const [perfil, setPerfil] = useState({ nombre: 'Coach', fotoPerfil: '' });
    const [eventos, setEventos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [fechaActual, setFechaActual] = useState(new Date());
    const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());

    // Estado para el Modal de añadir entrenamiento
    const [modalAddVisible, setModalAddVisible] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (entrenadorId) cargarAgenda();
        }, [fechaActual, entrenadorId])
    );

    const cargarAgenda = async () => {
        setLoading(true);
        try {
            const dataPerfil = await getEntrenador(entrenadorId).catch(() => null);
            if (dataPerfil) {
                const info = dataPerfil.entrenador || dataPerfil;
                setPerfil({ nombre: info.nombre || 'Coach', fotoPerfil: info.fotoPerfil || '' });
            }

            const dataClientes = await obtenerClientesEntrenador(entrenadorId).catch(() => []);
            setClientes(dataClientes.map(c => c.cliente || c));
            
            const primerDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1).toISOString().split('T')[0];
            const ultimoDia = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).toISOString().split('T')[0];

            let todosLosEventos = [];
            const promesas = dataClientes.map(async (item) => {
                const cInfo = item.cliente || item;
                if (!cInfo.id) return;
                try {
                    const evs = await obtenerEventosCalendario(cInfo.id, primerDia, ultimoDia);
                    todosLosEventos = [...todosLosEventos, ...evs.map(ev => ({
                        ...ev,
                        clienteNombre: `${cInfo.nombre} ${cInfo.apellido}`,
                        clienteFoto: cInfo.fotoPerfil,
                        clienteId: cInfo.id 
                    }))];
                } catch (e) { console.log("Error fetch ev"); }
            });

            await Promise.all(promesas);
            setEventos(todosLosEventos);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Lógica Visual de Días ---
    const getDayInfo = (dia) => {
        const evs = eventos.filter(ev => new Date(ev.fecha).toDateString() === dia.toDateString());
        if (evs.length === 0) return { hasEvents: false };

        const completados = evs.filter(ev => ev.estado === 'COMPLETADO').length;
        const total = evs.length;
        const color = completados === total ? '#4ade80' : (completados > 0 ? '#fbbf24' : '#52525b');
        
        return { hasEvents: true, color, isDone: completados === total, count: total };
    };

    const getDiasDelMes = () => {
        const year = fechaActual.getFullYear();
        const month = fechaActual.getMonth();
        const primerDiaStr = new Date(year, month, 1).getDay();
        const diasEnMes = new Date(year, month + 1, 0).getDate();
        const primerDia = primerDiaStr === 0 ? 6 : primerDiaStr - 1; 
        let dias = [];
        for (let i = 0; i < primerDia; i++) dias.push(null); 
        for (let i = 1; i <= diasEnMes; i++) dias.push(new Date(year, month, i));
        return dias;
    };

    const eventosDelDia = eventos.filter(ev => {
        const d = new Date(ev.fecha);
        return d.getDate() === fechaSeleccionada.getDate() && d.getMonth() === fechaSeleccionada.getMonth();
    });

    const handleAddTraining = (atleta) => {
        setModalAddVisible(false);
        // Navegamos a CrearRutina pasando el atleta y la fecha seleccionada
        navigation.navigate('CrearRutina', { 
            atletaId: atleta.id, 
            fechaPredefinida: fechaSeleccionada.toISOString() 
        });
    };

    if (loading) return (
        <View style={styles.center}><ActivityIndicator size="large" color="#FACC15" /></View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>AGENDA GLOBAL</Text>
                        <Text style={styles.headerSub}>Control de rendimiento diario</Text>
                    </View>
                    <TouchableOpacity style={styles.profileBox}>
                        {perfil.fotoPerfil ? 
                            <Image source={{uri: perfil.fotoPerfil}} style={styles.avatar}/> : 
                            <View style={styles.avatarEmpty}><User color="#FACC15" size={20}/></View>
                        }
                    </TouchableOpacity>
                </View>

                {/* CALENDARIO DE ALTO IMPACTO */}
                <View style={styles.calCard}>
                    <View style={styles.calNav}>
                        <Text style={styles.monthText}>{mesesNombres[fechaActual.getMonth()]} {fechaActual.getFullYear()}</Text>
                        <View style={styles.navBtns}>
                            <TouchableOpacity onPress={() => setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth()-1, 1))} style={styles.navBtn}><ChevronLeft color="white" size={20}/></TouchableOpacity>
                            <TouchableOpacity onPress={() => setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth()+1, 1))} style={styles.navBtn}><ChevronRight color="white" size={20}/></TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.weekDays}>
                        {diasNombres.map(d => <Text key={d} style={styles.weekDayText}>{d}</Text>)}
                    </View>

                    <View style={styles.daysGrid}>
                        {getDiasDelMes().map((dia, i) => {
                            if (!dia) return <View key={i} style={styles.dayCell} />;
                            const info = getDayInfo(dia);
                            const isSelected = dia.toDateString() === fechaSeleccionada.toDateString();
                            const isToday = dia.toDateString() === new Date().toDateString();

                            return (
                                <TouchableOpacity 
                                    key={i} 
                                    onPress={() => setFechaSeleccionada(dia)}
                                    style={[styles.dayCell, isSelected && styles.daySelected]}
                                >
                                    <View style={[
                                        styles.dayRing, 
                                        info.hasEvents && { borderColor: isSelected ? 'black' : info.color, borderWidth: 2.5 }
                                    ]}>
                                        <Text style={[
                                            styles.dayText, 
                                            isSelected && { color: 'black', fontWeight: '900' },
                                            isToday && !isSelected && { color: '#FACC15' }
                                        ]}>
                                            {dia.getDate()}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* TIMELINE DE ATLETAS */}
                <View style={styles.timelineHeader}>
                    <View style={styles.timelineInfo}>
                        <CalendarIcon color="#FACC15" size={20} />
                        <Text style={styles.timelineTitle}>
                            {eventosDelDia.length} SESIONES · {fechaSeleccionada.getDate()} {mesesNombres[fechaSeleccionada.getMonth()]}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.btnAddSmall} onPress={() => setModalAddVisible(true)}>
                        <Plus color="black" size={20} />
                    </TouchableOpacity>
                </View>

                {eventosDelDia.length > 0 ? (
                    eventosDelDia.map(ev => (
                        <TouchableOpacity 
                            key={ev.id} 
                            style={[styles.eventCard, ev.estado === 'COMPLETADO' && styles.eventDone]}
                            onPress={() => navigation.navigate('ProgresoCliente', { id: ev.clienteId })}
                        >
                            <View style={styles.eventProfile}>
                                {ev.clienteFoto ? 
                                    <Image source={{uri: ev.clienteFoto}} style={styles.eventImg}/> : 
                                    <View style={styles.eventImgEmpty}><User color="#52525b" size={18}/></View>
                                }
                                <View>
                                    <Text style={styles.eventName}>{ev.clienteNombre}</Text>
                                    <Text style={styles.eventRoutine}>{ev.rutinaNombre || 'Sin nombre'}</Text>
                                </View>
                            </View>
                            {ev.estado === 'COMPLETADO' ? 
                                <CheckCircle2 color="#4ade80" size={22} /> : 
                                <Clock color="#52525b" size={22} />
                            }
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Día libre para el equipo</Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalAddVisible(true)}>
                            <Text style={styles.emptyBtnText}>Asignar entrenamiento</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* MODAL: SELECCIONAR ATLETA PARA AÑADIR */}
            <Modal visible={modalAddVisible} animationType="slide" transparent>
                <View style={styles.modalBack}>
                    <View style={styles.modalCont}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>¿Para quién es la rutina?</Text>
                            <TouchableOpacity onPress={() => setModalAddVisible(false)}><X color="white"/></TouchableOpacity>
                        </View>
                        <FlatList 
                            data={clientes}
                            keyExtractor={item => item.id}
                            renderItem={({item}) => (
                                <TouchableOpacity style={styles.clientItem} onPress={() => handleAddTraining(item)}>
                                    <User color="#71717a" size={20} style={{marginRight: 15}}/>
                                    <Text style={styles.clientName}>{item.nombre} {item.apellido}</Text>
                                    <ChevronRight color="#333" size={20} />
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* BOTÓN FLOTANTE RÁPIDO */}
            <TouchableOpacity style={styles.fab} onPress={() => setModalAddVisible(true)}>
                <Plus color="black" size={30} />
            </TouchableOpacity>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' },
    scrollContent: { padding: 20, paddingBottom: 100 },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    headerTitle: { color: 'white', fontSize: 26, fontWeight: '900', fontStyle: 'italic' },
    headerSub: { color: '#52525b', fontSize: 13, fontWeight: '600' },
    avatar: { width: 45, height: 45, borderRadius: 22, borderWeight: 2, borderColor: '#FACC15' },
    avatarEmpty: { width: 45, height: 45, borderRadius: 22, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center' },

    // Calendario
    calCard: { backgroundColor: '#111113', borderRadius: 30, padding: 20, borderWidth: 1, borderColor: '#1f1f22' },
    calNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    monthText: { color: 'white', fontSize: 18, fontWeight: '800', textTransform: 'uppercase' },
    navBtns: { flexDirection: 'row', gap: 10 },
    navBtn: { backgroundColor: '#18181b', padding: 8, borderRadius: 12 },
    weekDays: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    weekDayText: { color: '#3f3f46', fontSize: 11, fontWeight: '900', width: '13%', textAlign: 'center' },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    dayCell: { width: '13%', aspectRatio: 1, marginBottom: 8, justifyContent: 'center', alignItems: 'center' },
    dayRing: { width: '100%', height: '100%', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderColor: 'transparent' },
    daySelected: { backgroundColor: '#FACC15', borderRadius: 15 },
    dayText: { color: '#a1a1aa', fontSize: 15, fontWeight: '700' },

    // Timeline
    timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 35, marginBottom: 20 },
    timelineInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    timelineTitle: { color: '#FACC15', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
    btnAddSmall: { backgroundColor: '#FACC15', padding: 6, borderRadius: 8 },

    eventCard: { backgroundColor: '#18181b', borderRadius: 22, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#FACC15' },
    eventDone: { borderLeftColor: '#4ade80', opacity: 0.8 },
    eventProfile: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    eventImg: { width: 45, height: 45, borderRadius: 14 },
    eventImgEmpty: { width: 45, height: 45, borderRadius: 14, backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center' },
    eventName: { color: 'white', fontWeight: '800', fontSize: 16 },
    eventRoutine: { color: '#52525b', fontSize: 13, fontWeight: '600' },

    emptyState: { alignItems: 'center', marginTop: 20, padding: 30, backgroundColor: '#111113', borderRadius: 25, borderStyle: 'dashed', borderWidth: 1, borderColor: '#333' },
    emptyText: { color: '#52525b', fontWeight: '700', marginBottom: 15 },
    emptyBtn: { backgroundColor: '#18181b', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    emptyBtnText: { color: 'white', fontWeight: '800', fontSize: 12 },

    // Modal
    modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
    modalCont: { backgroundColor: '#111113', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: '900' },
    clientItem: { flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: '#18181b', borderRadius: 18, marginBottom: 10 },
    clientName: { color: 'white', flex: 1, fontWeight: '700' },

    fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#FACC15', width: 65, height: 65, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#FACC15', shadowOpacity: 0.4, shadowRadius: 10 }
});
