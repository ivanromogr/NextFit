import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
    SafeAreaView,
    StatusBar
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { 
    Search, 
    Filter, 
    User, 
    Euro, 
    MapPin, 
    Award, 
    ChevronRight,
    X
} from "lucide-react-native";
import { api } from "../../api/endpoints";

const LISTA_ESPECIALIDADES = [
    "Fuerza", "Hipertrofia", "Pérdida de Peso", "CrossFit",
    "Cardio", "Movilidad", "Rehabilitación", "Funcional", "Calistenia"
];

export default function ExplorarEntrenadores() {
    const navigation = useNavigation();
    const [entrenadores, setEntrenadores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // --- ESTADOS DE LOS FILTROS ---
    const [busqueda, setBusqueda] = useState("");
    const [filtroEspecialidad, setFiltroEspecialidad] = useState("");
    const [modalidad, setModalidad] = useState("");
    const [tarifaMax, setTarifaMax] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    const cargarEntrenadores = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filtroEspecialidad) params.especialidad = filtroEspecialidad;
            if (modalidad) params.modalidad = modalidad;
            if (tarifaMax) params.tarifaMax = tarifaMax;

            const res = await api.get("/entrenador/publicos", { params });
            setEntrenadores(res.data);
        } catch (error) {
            console.error("Error cargando el marketplace", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        cargarEntrenadores();
    }, [filtroEspecialidad, modalidad]); // Se recarga automáticamente al cambiar estos

    const entrenadoresFiltrados = entrenadores.filter(ent => {
        const nombreCompleto = `${ent.nombre} ${ent.apellido}`.toLowerCase();
        const coincideTexto = 
            nombreCompleto.includes(busqueda.toLowerCase()) || 
            (ent.descripcionPerfil && ent.descripcionPerfil.toLowerCase().includes(busqueda.toLowerCase()));
        return coincideTexto;
    });

    const renderEntrenador = ({ item }) => (
        <TouchableOpacity 
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('EntrenadorPerfil', { id: item.id })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.avatarContainer}>
                    {item.fotoPerfil ? (
                        <Image source={{ uri: item.fotoPerfil }} style={styles.avatar} />
                    ) : (
                        <User size={30} color="#71717a" />
                    )}
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.name}>{item.nombre} {item.apellido}</Text>
                    <View style={styles.row}>
                        <MapPin size={12} color="#FACC15" />
                        <Text style={styles.modalityText}>{item.modalidadTrabajo || "Mixto"}</Text>
                    </View>
                </View>
                <ChevronRight size={20} color="#3f3f46" />
            </View>

            <View style={styles.cardBody}>
                <Text style={styles.bio} numberOfLines={2}>
                    {item.descripcionPerfil || "Listo para ayudarte a conseguir tus objetivos."}
                </Text>
                <View style={styles.tagContainer}>
                    {item.especialidad?.split(',').slice(0, 3).map((esp, i) => (
                        <View key={i} style={styles.tag}>
                            <Text style={styles.tagText}>{esp.trim()}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.cardFooter}>
                <View>
                    <Text style={styles.priceLabel}>Tarifa mensual</Text>
                    <Text style={styles.priceValue}>{item.tarifaMensual ? `${item.tarifaMensual}€` : "A consultar"}</Text>
                </View>
                <View style={styles.btnVerPerfil}>
                    <Text style={styles.btnText}>Ver Perfil</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* --- HEADER Y BÚSQUEDA --- */}
            <View style={styles.topHeader}>
                <Text style={styles.screenTitle}>Explorar</Text>
                <View style={styles.searchBar}>
                    <Search size={20} color="#71717a" />
                    <TextInput 
                        style={styles.input}
                        placeholder="Buscar por nombre o bio..."
                        placeholderTextColor="#71717a"
                        value={busqueda}
                        onChangeText={setBusqueda}
                    />
                    <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterBtn}>
                        <Filter size={20} color={showFilters ? "#FACC15" : "#71717a"} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* --- FILTROS EXTENDIDOS --- */}
            {showFilters && (
                <View style={styles.filtersSection}>
                    <Text style={styles.filterLabel}>Especialidad</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                        <TouchableOpacity 
                            style={[styles.chip, filtroEspecialidad === "" && styles.chipActive]}
                            onPress={() => setFiltroEspecialidad("")}
                        >
                            <Text style={[styles.chipText, filtroEspecialidad === "" && styles.chipTextActive]}>Todas</Text>
                        </TouchableOpacity>
                        {LISTA_ESPECIALIDADES.map(esp => (
                            <TouchableOpacity 
                                key={esp} 
                                style={[styles.chip, filtroEspecialidad === esp && styles.chipActive]}
                                onPress={() => setFiltroEspecialidad(esp)}
                            >
                                <Text style={[styles.chipText, filtroEspecialidad === esp && styles.chipTextActive]}>{esp}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.filterRow}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.filterLabel}>Modalidad</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {["ONLINE", "PRESENCIAL", "MIXTO"].map(m => (
                                    <TouchableOpacity 
                                        key={m} 
                                        style={[styles.chip, modalidad === m && styles.chipActive]}
                                        onPress={() => setModalidad(modalidad === m ? "" : m)}
                                    >
                                        <Text style={[styles.chipText, modalidad === m && styles.chipTextActive]}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                        <View style={{ width: 100 }}>
                            <Text style={styles.filterLabel}>Precio Máx</Text>
                            <View style={styles.priceInputContainer}>
                                <Euro size={14} color="#71717a" />
                                <TextInput 
                                    style={styles.priceInput}
                                    keyboardType="numeric"
                                    placeholder="€"
                                    placeholderTextColor="#71717a"
                                    value={tarifaMax}
                                    onChangeText={setTarifaMax}
                                    onEndEditing={cargarEntrenadores}
                                />
                            </View>
                        </View>
                    </View>
                </View>
            )}

            {/* --- LISTADO --- */}
            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#FACC15" />
                </View>
            ) : (
                <FlatList
                    data={entrenadoresFiltrados}
                    renderItem={renderEntrenador}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    onRefresh={() => { setRefreshing(true); cargarEntrenadores(); }}
                    refreshing={refreshing}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Search size={50} color="#27272a" />
                            <Text style={styles.emptyTitle}>No hay resultados</Text>
                            <Text style={styles.emptySub}>Prueba a cambiar los filtros de búsqueda.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#09090b" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    topHeader: { padding: 20, backgroundColor: "#09090b" },
    screenTitle: { fontSize: 28, fontWeight: "900", color: "#fff", marginBottom: 15, letterSpacing: -1 },
    searchBar: { 
        flexDirection: "row", 
        alignItems: "center", 
        backgroundColor: "#18181b", 
        borderRadius: 15, 
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: "#27272a"
    },
    input: { flex: 1, color: "#fff", fontSize: 16, marginLeft: 10 },
    filterBtn: { padding: 5, marginLeft: 5 },
    
    // Filtros
    filtersSection: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: "#09090b" },
    filterLabel: { color: "#71717a", fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 10, marginTop: 5 },
    chipScroll: { marginBottom: 15 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#18181b", marginRight: 8, borderWidth: 1, borderColor: "#27272a" },
    chipActive: { backgroundColor: "#FACC15", borderColor: "#FACC15" },
    chipText: { color: "#a1a1aa", fontSize: 13, fontWeight: "600" },
    chipTextActive: { color: "#000" },
    filterRow: { flexDirection: "row", alignItems: "flex-end" },
    priceInputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#18181b", borderRadius: 12, paddingHorizontal: 10, height: 40, borderWidth: 1, borderColor: "#27272a" },
    priceInput: { color: "#fff", flex: 1, marginLeft: 5, fontSize: 14 },

    // Tarjetas
    listContent: { padding: 20, paddingTop: 0 },
    card: { 
        backgroundColor: "#121214", 
        borderRadius: 20, 
        borderWidth: 1, 
        borderColor: "#27272a", 
        marginBottom: 16, 
        overflow: "hidden" 
    },
    cardHeader: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#1f1f22" },
    avatarContainer: { width: 50, height: 50, borderRadius: 12, backgroundColor: "#27272a", justifyContent: "center", alignItems: "center", overflow: "hidden" },
    avatar: { width: "100%", height: "100%" },
    headerInfo: { flex: 1, marginLeft: 12 },
    name: { color: "#fff", fontSize: 17, fontWeight: "800" },
    row: { flexDirection: "row", alignItems: "center", marginTop: 2 },
    modalityText: { color: "#FACC15", fontSize: 12, fontWeight: "600", marginLeft: 4 },
    
    cardBody: { padding: 16 },
    bio: { color: "#a1a1aa", fontSize: 14, lineHeight: 20 },
    tagContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 12 },
    tag: { backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginRight: 6, marginBottom: 6 },
    tagText: { color: "#d4d4d8", fontSize: 11, fontWeight: "600" },
    
    cardFooter: { 
        flexDirection: "row", 
        alignItems: "center", 
        justifyContent: "space-between", 
        padding: 16, 
        backgroundColor: "rgba(0,0,0,0.2)",
        borderTopWidth: 1,
        borderTopColor: "#1f1f22"
    },
    priceLabel: { color: "#71717a", fontSize: 11, fontWeight: "600" },
    priceValue: { color: "#fff", fontSize: 18, fontWeight: "900" },
    btnVerPerfil: { backgroundColor: "#FACC15", paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
    btnText: { color: "#000", fontWeight: "700", fontSize: 14 },

    emptyContainer: { alignItems: "center", marginTop: 60 },
    emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 15 },
    emptySub: { color: "#71717a", fontSize: 14, marginTop: 5 }
});