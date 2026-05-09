import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
  Image,
  KeyboardAvoidingView,
  useWindowDimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ChevronLeft,
  Sparkles,
  Edit3,
  Brain,
  CheckCircle2,
  Dumbbell,
  Flame,
  Trophy,
  Search,
  Plus,
  Trash2,
  Save,
  Image as ImageIcon
} from 'lucide-react-native';

import {
  generarRutinaAuto,
  guardarRutinaManual,
  obtenerEjercicios,
  actualizarRutina
} from '../../api/endpoints';
import { useAuth } from '../../components/context/AuthContext';

const MUSCULOS = ["Todos", "Pecho", "Espalda", "Piernas", "Hombros", "Brazos", "Abdominales"];

const normalizarTexto = (texto = "") =>
  texto
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const obtenerEquivalenciasMusculo = (musculo) => {
  const m = normalizarTexto(musculo);

  const mapa = {
    pecho: ["pecho", "pectoral", "pectorales", "chest"],
    espalda: ["espalda", "dorsal", "dorsales", "back", "lat", "lats", "trap", "traps", "trapecio", "trapecios", "rhomboids", "spine"],
    piernas: ["pierna", "piernas", "legs", "leg", "quads", "quad", "cuadriceps", "hamstrings", "isquiotibiales", "glutes", "gluteos", "gluteo", "calves", "calf", "gemelos"],
    hombros: ["hombro", "hombros", "shoulder", "shoulders", "delt", "delts", "deltoides"],
    brazos: ["brazo", "brazos", "arm", "arms", "biceps", "triceps", "forearm", "forearms", "antebrazo", "antebrazos"],
    abdominales: ["abdominal", "abdominales", "abdomen", "abs", "core", "waist", "serratus anterior"]
  };

  return mapa[m] || [m];
};

const coincideBusquedaEjercicio = (ejercicio, busqueda, filtroMusculo) => {
  const textoBusqueda = normalizarTexto(busqueda);

  const nombre = normalizarTexto(ejercicio.nombre || "");
  const nombreTraducido = normalizarTexto(ejercicio.nombreTraducido || "");
  const grupo = normalizarTexto(ejercicio.grupoMuscular || "");
  const grupoTraducido = normalizarTexto(ejercicio.grupoMuscularTraducido || "");
  const parteCuerpo = normalizarTexto(ejercicio.parteCuerpo || "");
  const parteCuerpoTraducida = normalizarTexto(ejercicio.parteCuerpoTraducida || "");
  const equipamiento = normalizarTexto(ejercicio.equipamiento || "");

  const textoCompleto = [
    nombre,
    nombreTraducido,
    grupo,
    grupoTraducido,
    parteCuerpo,
    parteCuerpoTraducida,
    equipamiento
  ].join(" ");

  const cumpleBusqueda =
    !textoBusqueda ||
    textoCompleto.includes(textoBusqueda) ||
    obtenerEquivalenciasMusculo(textoBusqueda).some(alias =>
      textoCompleto.includes(normalizarTexto(alias))
    );

  const cumpleMusculo =
    filtroMusculo === "Todos" ||
    !filtroMusculo ||
    obtenerEquivalenciasMusculo(filtroMusculo).some(alias => {
      const eq = normalizarTexto(alias);
      return grupo.includes(eq) || grupoTraducido.includes(eq) || textoCompleto.includes(eq);
    });

  return cumpleBusqueda && cumpleMusculo;
};

export default function CrearRutinaScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();

  const { userId, user } = useAuth();
  const { clienteIdProp, atletaId, rutinaInicial, isTemplate: inicialIsTemplate = false } = route.params || {};

  const esEntrenador =
    user?.role === 'ENTRENADOR' ||
    user?.rol === 'ENTRENADOR' ||
    !!atletaId ||
    !!clienteIdProp;

  const [viewMode, setViewMode] = useState(
    esEntrenador || rutinaInicial || inicialIsTemplate ? 'manual' : 'selector'
  );

  const isMobile = width < 768;

  useEffect(() => {
    if (esEntrenador && viewMode !== 'manual') {
      setViewMode('manual');
    }
  }, [esEntrenador, viewMode]);

  const [loadingIA, setLoadingIA] = useState(false);

  const [aiObjetivo, setAiObjetivo] = useState(null);
  const [aiNivel, setAiNivel] = useState(null);
  const [aiDias, setAiDias] = useState(null);

  const [nombreRutina, setNombreRutina] = useState(rutinaInicial?.nombre || "");
  const [descripcionRutina, setDescripcionRutina] = useState(rutinaInicial?.descripcion || "");
  const [ejerciciosSeleccionados, setEjerciciosSeleccionados] = useState([]);
  const [isTemplate, setIsTemplate] = useState(inicialIsTemplate);

  const [busqueda, setBusqueda] = useState("");
  const [filtroMusculo, setFiltroMusculo] = useState("Todos");
  const [todosEjercicios, setTodosEjercicios] = useState([]);
  const [loadingEjercicios, setLoadingEjercicios] = useState(false);
  const [mostrarBiblioteca, setMostrarBiblioteca] = useState(true);

  useEffect(() => {
    const cargarEjercicios = async () => {
      if (viewMode !== 'manual') return;

      try {
        setLoadingEjercicios(true);
        console.log('[CrearRutinaScreen] 🏋️ Cargando ejercicios para modo manual...');
        
        const data = await obtenerEjercicios();
        
        console.log('[CrearRutinaScreen] ✅ Ejercicios cargados exitosamente:', {
          cantidad: data?.length || 0,
          tipoData: Array.isArray(data) ? 'array' : typeof data,
          primero: data?.[0]?.nombre,
        });
        
        const ejerciciosValidos = Array.isArray(data) ? data : [];
        
        if (ejerciciosValidos.length === 0) {
          console.warn('[CrearRutinaScreen] ⚠️ ADVERTENCIA: Se recibió array vacío de ejercicios');
        }
        
        setTodosEjercicios(ejerciciosValidos);
      } catch (error) {
        console.error('[CrearRutinaScreen] ❌ Error cargando ejercicios:', {
          message: error.message,
          status: error.response?.status,
          errorData: error.response?.data,
          stack: error.stack,
        });
        
        // Mostrar alerta visual al usuario en móvil
        Alert.alert(
          'Error de conexión',
          'No se pudieron cargar los ejercicios. Verifica que el backend esté disponible.',
          [{ text: 'OK', onPress: () => console.log('Alert cerrada') }]
        );
        
        setTodosEjercicios([]);
      } finally {
        setLoadingEjercicios(false);
      }
    };

    cargarEjercicios();
  }, [viewMode]);

  useEffect(() => {
    if (rutinaInicial?.detalles?.length) {
      const detallesMapeados = rutinaInicial.detalles.map((detalle) => ({
        idEjercicio: detalle?.ejercicio?.id || detalle?.idEjercicio,
        nombre:
          detalle?.ejercicio?.nombreTraducido ||
          detalle?.ejercicio?.nombre ||
          detalle?.nombre ||
          "Ejercicio",
        musculo:
          detalle?.ejercicio?.grupoMuscularTraducido ||
          detalle?.ejercicio?.grupoMuscular ||
          detalle?.musculo ||
          "",
        imagen: detalle?.ejercicio?.imagenUrl || detalle?.imagenUrl || null,
        series: String(detalle?.series ?? 3),
        reps: String(detalle?.repeticiones ?? 12),
        peso: String(detalle?.peso ?? 0),
        rpe: String(detalle?.rpe ?? 8),
        notas: detalle?.notas || "",
        tempId: Math.random().toString(36).substr(2, 9)
      }));

      setEjerciciosSeleccionados(detallesMapeados);
    }
  }, [rutinaInicial]);

  const listaEjercicios = useMemo(() => {
    return todosEjercicios.filter((ex) =>
      coincideBusquedaEjercicio(ex, busqueda, filtroMusculo)
    );
  }, [todosEjercicios, busqueda, filtroMusculo]);

  const handleGenerarIA = async () => {
    if (!aiObjetivo || !aiNivel || !aiDias) {
      return Alert.alert(
        "Faltan datos",
        "Por favor, selecciona todas las opciones para que la IA pueda diseñar tu plan."
      );
    }

    setLoadingIA(true);
    try {
      const payload = {
        idCliente: userId,
        clienteId: userId,
        objetivo: aiObjetivo,
        nivel: aiNivel,
        diasSemana: aiDias,
        dias: aiDias
      };

      await generarRutinaAuto(payload);

      Alert.alert("¡Plan Creado! 🧠", "La IA ha diseñado tu rutina con éxito.", [
        { text: "Ver mis rutinas", onPress: () => navigation.navigate("Rutinas") }
      ]);
    } catch (error) {
      const mensajeErrorJava =
        error.response?.data?.message ||
        JSON.stringify(error.response?.data) ||
        error.message;

      Alert.alert(
        "Error del Servidor (400)",
        typeof mensajeErrorJava === 'string'
          ? mensajeErrorJava
          : "Error desconocido, revisa la consola."
      );
    } finally {
      setLoadingIA(false);
    }
  };

  const agregarAlWorkout = (ej) => {
    const yaExiste = ejerciciosSeleccionados.some((item) => item.idEjercicio === ej.id);
    if (yaExiste) {
      Alert.alert("Ejercicio ya añadido", "Ese ejercicio ya está en la rutina.");
      return;
    }

    const nuevo = {
      idEjercicio: ej.id,
      nombre: ej.nombreTraducido || ej.nombre,
      musculo: ej.grupoMuscularTraducido || ej.grupoMuscular,
      imagen: ej.imagenUrl,
      series: "3",
      reps: "12",
      peso: "0",
      rpe: "8",
      notas: "",
      tempId: Math.random().toString(36).substr(2, 9)
    };

    setEjerciciosSeleccionados((prev) => [...prev, nuevo]);
  };

  const actualizarCampo = (tempId, campo, valor) => {
    setEjerciciosSeleccionados((prev) =>
      prev.map((e) => (e.tempId === tempId ? { ...e, [campo]: valor } : e))
    );
  };

  const eliminarEjercicio = (tempId) => {
    setEjerciciosSeleccionados((prev) => prev.filter((e) => e.tempId !== tempId));
  };

  const finalizarGuardado = async () => {
    if (!nombreRutina.trim()) {
      return Alert.alert("Falta información", "Dale un nombre a tu rutina.");
    }

    if (ejerciciosSeleccionados.length === 0) {
      return Alert.alert("Rutina vacía", "Añade al menos un ejercicio.");
    }

    const isEditing = rutinaInicial && rutinaInicial.id;

    const formatoCrear = ejerciciosSeleccionados.map((e) => ({
      idEjercicio: e.idEjercicio,
      series: parseInt(e.series, 10) || 0,
      repeticiones: parseInt(e.reps, 10) || 0,
      peso: parseFloat(e.peso) || 0,
      rpe: parseInt(e.rpe, 10) || 0,
      notas: e.notas || "",
      dias: 1
    }));

    const formatoEditar = ejerciciosSeleccionados.map((e) => ({
      ejercicio: { id: e.idEjercicio },
      idEjercicio: e.idEjercicio,
      series: parseInt(e.series, 10) || 0,
      repeticiones: parseInt(e.reps, 10) || 0,
      peso: parseFloat(e.peso) || 0,
      rpe: parseInt(e.rpe, 10) || 0,
      notas: e.notas || ""
    }));

    const payload = {
      nombre: nombreRutina,
      descripcion: descripcionRutina,
      objetivo: isTemplate ? "Plantilla Maestra" : "Personalizado",
      creador: isTemplate || clienteIdProp || atletaId ? "ENTRENADOR" : "CLIENTE",
      esPlantilla: isTemplate,
      entrenadorId: isTemplate ? userId : undefined,
      idCliente: !isTemplate ? (clienteIdProp || atletaId || userId) : undefined,
      ejercicios: isEditing ? formatoEditar : formatoCrear,
      detalles: isEditing ? formatoEditar : undefined
    };

    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

    try {
      if (isEditing) {
        await actualizarRutina(rutinaInicial.id, payload);
        Alert.alert("¡Actualizada!", "La rutina se ha modificado correctamente.", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        await guardarRutinaManual(payload);
        Alert.alert("¡Hecho!", "Rutina creada con éxito", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error("Error al guardar rutina:", error);
      Alert.alert("Error al guardar", "Revisa tu conexión.");
    }
  };

  const renderLibraryItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.libItem}
      onPress={() => agregarAlWorkout(item)}
      activeOpacity={0.85}
    >
      {item.imagenUrl ? (
        <Image source={{ uri: item.imagenUrl }} style={styles.libImg} />
      ) : (
        <View style={styles.libImgPlaceholder}>
          <ImageIcon color="#444" size={20} />
        </View>
      )}

      <View style={styles.libTextWrap}>
        <Text style={styles.libName} numberOfLines={2}>
          {item.nombreTraducido || item.nombre}
        </Text>
        <Text style={styles.libMuscle} numberOfLines={1}>
          {item.grupoMuscularTraducido || item.grupoMuscular}
        </Text>
      </View>

      <View style={styles.libAddIcon}>
        <Plus color="#FACC15" size={18} />
      </View>
    </TouchableOpacity>
  );

  const renderExerciseCard = (item) => (
    <View key={item.tempId} style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        {item.imagen ? (
          <Image source={{ uri: item.imagen }} style={styles.exerciseImg} />
        ) : (
          <View style={styles.exerciseImgPlaceholder}>
            <ImageIcon color="#333" size={22} />
          </View>
        )}

        <View style={styles.exerciseHeaderText}>
          <Text style={styles.exerciseName} numberOfLines={2}>{item.nombre}</Text>
          <Text style={styles.exerciseMuscle} numberOfLines={1}>{item.musculo}</Text>
        </View>

        <TouchableOpacity onPress={() => eliminarEjercicio(item.tempId)} style={styles.trashBtn}>
          <Trash2 color="#EF4444" size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputsGrid}>
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>SERIES</Text>
          <TextInput
            style={styles.gridInput}
            keyboardType="numeric"
            value={item.series}
            onChangeText={(v) => actualizarCampo(item.tempId, 'series', v)}
          />
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>REPS</Text>
          <TextInput
            style={styles.gridInput}
            keyboardType="numeric"
            value={item.reps}
            onChangeText={(v) => actualizarCampo(item.tempId, 'reps', v)}
          />
        </View>

        <View style={styles.inputWrap}>
          <Text style={[styles.inputLabel, { color: '#FACC15' }]}>PESO</Text>
          <TextInput
            style={[styles.gridInput, { color: '#FACC15' }]}
            keyboardType="numeric"
            value={item.peso}
            onChangeText={(v) => actualizarCampo(item.tempId, 'peso', v)}
          />
        </View>

        <View style={styles.inputWrap}>
          <Text style={[styles.inputLabel, { color: '#60A5FA' }]}>RPE</Text>
          <TextInput
            style={[styles.gridInput, { color: '#60A5FA' }]}
            keyboardType="numeric"
            value={item.rpe}
            onChangeText={(v) => actualizarCampo(item.tempId, 'rpe', v)}
          />
        </View>
      </View>

      <TextInput
        style={styles.notasInput}
        placeholder="Notas técnicas..."
        placeholderTextColor="#444"
        value={item.notas}
        onChangeText={(v) => actualizarCampo(item.tempId, 'notas', v)}
      />
    </View>
  );

  if (viewMode === 'selector' && !esEntrenador) {
    return (
      <View style={styles.container}>
        <View style={styles.topBarSimple}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ChevronLeft color="white" size={28} />
          </TouchableOpacity>
        </View>

        <View style={styles.centerContent}>
          <Text style={styles.mainTitle}>CREAR NUEVA RUTINA</Text>
          <Text style={styles.subTitle}>¿Cómo quieres empezar hoy?</Text>

          <TouchableOpacity style={styles.optionCard} onPress={() => setViewMode('ia')}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(250, 204, 21, 0.1)' }]}>
              <Sparkles size={32} color="#FACC15" />
            </View>
            <Text style={styles.optionTitle}>GENERAR CON IA</Text>
            <Text style={styles.optionDesc}>Plan personalizado automático e inteligente.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={() => setViewMode('manual')}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
              <Edit3 size={32} color="white" />
            </View>
            <Text style={styles.optionTitle}>DISEÑAR MANUAL</Text>
            <Text style={styles.optionDesc}>Crea tu rutina ejercicio a ejercicio desde cero.</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (viewMode === 'ia' && !esEntrenador) {
    return (
      <View style={styles.container}>
        <View style={styles.topBarSimple}>
          <TouchableOpacity onPress={() => setViewMode('selector')} style={styles.iconBtn}>
            <ChevronLeft color="white" size={28} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <View style={styles.iaHeader}>
            <View style={styles.iaIconBubble}>
              <Brain size={36} color="#FACC15" />
            </View>
            <Text style={styles.iaTitle}>
              ARQUITECTO <Text style={{ color: '#FACC15' }}>IA</Text>
            </Text>
            <Text style={styles.iaSub}>Diseña tu plan de entrenamiento inteligente en segundos.</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.circleNumber}>
                <Text style={styles.numberText}>1</Text>
              </View>
              <Text style={styles.sectionTitle}>SELECCIONA TU OBJETIVO PRINCIPAL</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 15, paddingRight: 20 }}>
              <TouchableOpacity
                style={[styles.iaCardLarge, aiObjetivo === 'HIPERTROFIA' && styles.iaCardActive]}
                onPress={() => setAiObjetivo('HIPERTROFIA')}
              >
                <Dumbbell size={32} color={aiObjetivo === 'HIPERTROFIA' ? '#FACC15' : '#777'} style={{ marginBottom: 15 }} />
                <Text style={[styles.iaCardTitle, aiObjetivo === 'HIPERTROFIA' && styles.iaTextActive]}>HIPERTROFIA</Text>
                <Text style={styles.iaCardSub}>Volumen Muscular</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iaCardLarge, aiObjetivo === 'FUERZA' && styles.iaCardActive]}
                onPress={() => setAiObjetivo('FUERZA')}
              >
                <Trophy size={32} color={aiObjetivo === 'FUERZA' ? '#FACC15' : '#777'} style={{ marginBottom: 15 }} />
                <Text style={[styles.iaCardTitle, aiObjetivo === 'FUERZA' && styles.iaTextActive]}>FUERZA</Text>
                <Text style={styles.iaCardSub}>Powerlifting / 5x5</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iaCardLarge, aiObjetivo === 'DEFINICION' && styles.iaCardActive]}
                onPress={() => setAiObjetivo('DEFINICION')}
              >
                <Flame size={32} color={aiObjetivo === 'DEFINICION' ? '#FACC15' : '#777'} style={{ marginBottom: 15 }} />
                <Text style={[styles.iaCardTitle, aiObjetivo === 'DEFINICION' && styles.iaTextActive]}>DEFINICIÓN</Text>
                <Text style={styles.iaCardSub}>Metabólico / Cardio</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.circleNumber}>
                <Text style={styles.numberText}>2</Text>
              </View>
              <Text style={styles.sectionTitle}>TU EXPERIENCIA</Text>
            </View>

            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={[styles.iaCardRow, aiNivel === 'PRINCIPIANTE' && styles.iaCardActive]}
                onPress={() => setAiNivel('PRINCIPIANTE')}
              >
                <View>
                  <Text style={[styles.iaCardTitleRow, aiNivel === 'PRINCIPIANTE' && styles.iaTextActive]}>PRINCIPIANTE</Text>
                  <Text style={styles.iaCardSub}>0-1 año</Text>
                </View>
                {aiNivel === 'PRINCIPIANTE' && <CheckCircle2 size={20} color="#FACC15" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iaCardRow, aiNivel === 'INTERMEDIO' && styles.iaCardActive]}
                onPress={() => setAiNivel('INTERMEDIO')}
              >
                <View>
                  <Text style={[styles.iaCardTitleRow, aiNivel === 'INTERMEDIO' && styles.iaTextActive]}>INTERMEDIO</Text>
                  <Text style={styles.iaCardSub}>1-3 años</Text>
                </View>
                {aiNivel === 'INTERMEDIO' && <CheckCircle2 size={20} color="#FACC15" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iaCardRow, aiNivel === 'AVANZADO' && styles.iaCardActive]}
                onPress={() => setAiNivel('AVANZADO')}
              >
                <View>
                  <Text style={[styles.iaCardTitleRow, aiNivel === 'AVANZADO' && styles.iaTextActive]}>AVANZADO</Text>
                  <Text style={styles.iaCardSub}>+3 años</Text>
                </View>
                {aiNivel === 'AVANZADO' && <CheckCircle2 size={20} color="#FACC15" />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.circleNumber}>
                <Text style={styles.numberText}>3</Text>
              </View>
              <Text style={styles.sectionTitle}>DISPONIBILIDAD SEMANAL</Text>
            </View>

            <View style={styles.gridContainer}>
              <TouchableOpacity style={[styles.iaCardGrid, aiDias === 3 && styles.iaCardActive]} onPress={() => setAiDias(3)}>
                <View>
                  <Text style={[styles.iaCardTitleRow, aiDias === 3 && styles.iaTextActive]}>3 DÍAS</Text>
                  <Text style={styles.iaCardSub}>Full Body</Text>
                </View>
                {aiDias === 3 && <CheckCircle2 size={20} color="#FACC15" />}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.iaCardGrid, aiDias === 4 && styles.iaCardActive]} onPress={() => setAiDias(4)}>
                <View>
                  <Text style={[styles.iaCardTitleRow, aiDias === 4 && styles.iaTextActive]}>4 DÍAS</Text>
                  <Text style={styles.iaCardSub}>Torso/Pierna</Text>
                </View>
                {aiDias === 4 && <CheckCircle2 size={20} color="#FACC15" />}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.iaCardGrid, aiDias === 5 && styles.iaCardActive]} onPress={() => setAiDias(5)}>
                <View>
                  <Text style={[styles.iaCardTitleRow, aiDias === 5 && styles.iaTextActive]}>5 DÍAS</Text>
                  <Text style={styles.iaCardSub}>Híbrida</Text>
                </View>
                {aiDias === 5 && <CheckCircle2 size={20} color="#FACC15" />}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.iaCardGrid, aiDias === 6 && styles.iaCardActive]} onPress={() => setAiDias(6)}>
                <View>
                  <Text style={[styles.iaCardTitleRow, aiDias === 6 && styles.iaTextActive]}>6 DÍAS</Text>
                  <Text style={styles.iaCardSub}>PPL</Text>
                </View>
                {aiDias === 6 && <CheckCircle2 size={20} color="#FACC15" />}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomFixed}>
          <TouchableOpacity style={styles.btnGenerar} onPress={handleGenerarIA} disabled={loadingIA}>
            {loadingIA ? (
              <ActivityIndicator color="black" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Sparkles size={20} color="black" />
                <Text style={styles.btnGenerarText}>GENERAR PLAN INTELIGENTE</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (esEntrenador || rutinaInicial) {
              navigation.goBack();
            } else {
              setViewMode('selector');
            }
          }}
          style={styles.iconBtn}
        >
          <ChevronLeft color="white" size={28} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{isTemplate ? "PLANTILLA" : "NUEVA RUTINA"}</Text>

        {!isMobile && (
          <TouchableOpacity onPress={finalizarGuardado} style={styles.saveBtn}>
            <Save color="#0A0A0A" size={20} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.mainContent}>
            <View style={styles.cardInfo}>
              <TextInput
                style={styles.inputNombre}
                placeholder="Nombre del entrenamiento"
                placeholderTextColor="#555"
                value={nombreRutina}
                onChangeText={setNombreRutina}
              />

              <TextInput
                style={styles.inputDesc}
                placeholder="Añade una descripción u objetivo..."
                placeholderTextColor="#555"
                multiline
                value={descripcionRutina}
                onChangeText={setDescripcionRutina}
              />

              {esEntrenador && (
                <TouchableOpacity
                  style={[styles.templateToggle, isTemplate && styles.templateToggleActive]}
                  onPress={() => setIsTemplate(!isTemplate)}
                >
                  <View style={[styles.radio, isTemplate && styles.radioActive]} />
                  <Text style={styles.templateText}>Guardar como Plantilla Maestra</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.sectionBlock}>
              <View style={styles.sectionBlockHeader}>
                <Text style={styles.sectionBlockTitle}>BIBLIOTECA DE EJERCICIOS</Text>
                <TouchableOpacity
                  style={styles.sectionToggleBtn}
                  onPress={() => setMostrarBiblioteca(!mostrarBiblioteca)}
                >
                  <Text style={styles.sectionToggleText}>
                    {mostrarBiblioteca ? 'OCULTAR' : 'MOSTRAR'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.searchBoxInline}>
                <TextInput
                  style={styles.searchInputInline}
                  placeholder="Buscar ejercicio..."
                  placeholderTextColor="#666"
                  value={busqueda}
                  onChangeText={setBusqueda}
                />
                <Search color="#666" size={18} />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersRow}
              >
                {MUSCULOS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.filterPill, filtroMusculo === m && styles.filterPillActive]}
                    onPress={() => setFiltroMusculo(m)}
                  >
                    <Text style={[styles.filterPillText, filtroMusculo === m && styles.filterPillTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.resultsCount}>
                {loadingEjercicios ? 'Cargando ejercicios...' : `${listaEjercicios.length} ejercicios`}
              </Text>

              {mostrarBiblioteca && (
                <View style={styles.libraryInlineArea}>
                  {loadingEjercicios ? (
                    <ActivityIndicator color="#FACC15" style={{ marginTop: 24 }} />
                  ) : listaEjercicios.length === 0 ? (
                    <View style={styles.emptyLibraryBox}>
                      <Text style={styles.emptyLibraryText}>No se encontraron ejercicios</Text>
                    </View>
                  ) : (
                    listaEjercicios.slice(0, 30).map(renderLibraryItem)
                  )}
                </View>
              )}
            </View>

            <View style={styles.workoutArea}>
              <Text style={styles.workspaceTitle}>TU RUTINA ({ejerciciosSeleccionados.length})</Text>

              {ejerciciosSeleccionados.length === 0 ? (
                <View style={styles.emptyWorkspace}>
                  <Dumbbell color="#1A1A1A" size={56} />
                  <Text style={styles.emptyWorkspaceTitle}>AÚN NO HAS AÑADIDO EJERCICIOS</Text>
                  <Text style={styles.emptyWorkspaceSub}>
                    Busca y añade ejercicios desde la biblioteca superior.
                  </Text>
                </View>
              ) : (
                ejerciciosSeleccionados.map(renderExerciseCard)
              )}
            </View>
          </ScrollView>

          {isMobile && (
            <View style={styles.mobileBottomBar}>
              <TouchableOpacity style={styles.mobileSaveBtn} onPress={finalizarGuardado}>
                <Save color="#0A0A0A" size={18} />
                <Text style={styles.mobileSaveBtnText}>
                  {rutinaInicial?.id ? 'ACTUALIZAR RUTINA' : 'GUARDAR RUTINA'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },

  topBarSimple: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#050505'
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A'
  },

  iconBtn: { padding: 5 },
  headerTitle: { color: 'white', fontWeight: '800', fontSize: 16, letterSpacing: 0.5, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  saveBtn: { backgroundColor: '#FACC15', padding: 8, borderRadius: 20 },
  scroll: { flex: 1 },

  mainContent: {
    paddingBottom: 120
  },

  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: -50 },
  mainTitle: { color: 'white', fontSize: 24, fontWeight: '900', textTransform: 'uppercase', marginBottom: 5, letterSpacing: 1, textAlign: 'center' },
  subTitle: { color: '#888', fontSize: 16, marginBottom: 40, textAlign: 'center' },

  optionCard: {
    backgroundColor: '#121214',
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222'
  },
  iconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  optionTitle: { color: 'white', fontSize: 20, fontWeight: '900', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' },
  optionDesc: { color: '#777', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },

  iaHeader: { alignItems: 'center', marginBottom: 40, marginTop: 10 },
  iaIconBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.3)'
  },
  iaTitle: { color: 'white', fontSize: 28, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
  iaSub: { color: '#aaa', fontSize: 14, textAlign: 'center', marginTop: 5 },

  section: { marginBottom: 35 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10, flexWrap: 'wrap' },
  circleNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center'
  },
  numberText: { color: '#FACC15', fontSize: 12, fontWeight: '900' },
  sectionTitle: { color: '#FACC15', fontSize: 13, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', flexShrink: 1 },
  iaCardActive: { borderColor: '#FACC15', backgroundColor: 'rgba(250, 204, 21, 0.05)' },
  iaTextActive: { color: '#FACC15' },
  iaCardSub: { color: '#777', fontSize: 12, marginTop: 2 },

  iaCardLarge: {
    backgroundColor: '#121214',
    width: 160,
    height: 160,
    borderRadius: 24,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#222'
  },
  iaCardTitle: { color: 'white', fontWeight: '900', fontSize: 16, textTransform: 'uppercase', textAlign: 'center' },

  iaCardRow: {
    backgroundColor: '#121214',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#222'
  },
  iaCardTitleRow: { color: 'white', fontWeight: '900', fontSize: 16, textTransform: 'uppercase' },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  iaCardGrid: {
    backgroundColor: '#121214',
    borderRadius: 20,
    padding: 20,
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#222'
  },

  bottomFixed: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: 'rgba(5,5,5,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A'
  },
  btnGenerar: {
    backgroundColor: '#FACC15',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: "#FACC15",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5
  },
  btnGenerarText: { color: '#0A0A0A', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },

  cardInfo: { padding: 16 },
  inputNombre: { color: 'white', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  inputDesc: { color: '#888', fontSize: 14, minHeight: 60, marginBottom: 15, textAlignVertical: 'top' },

  templateToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 5, opacity: 0.7 },
  templateToggleActive: { opacity: 1 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#444', marginRight: 10 },
  radioActive: { backgroundColor: '#FACC15', borderColor: '#FACC15' },
  templateText: { color: 'white', fontWeight: '600', fontSize: 13, flexShrink: 1 },

  sectionBlock: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#0B0B0D',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    padding: 16
  },
  sectionBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  sectionBlockTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8
  },
  sectionToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#151515'
  },
  sectionToggleText: {
    color: '#FACC15',
    fontSize: 11,
    fontWeight: '800'
  },

  searchBoxInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121214',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 14
  },

  searchInputInline: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    marginRight: 8
  },

  filtersRow: {
    paddingBottom: 10,
    gap: 10
  },

  resultsCount: {
    color: '#666',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8
  },

  libraryInlineArea: {
    marginTop: 12
  },

  emptyLibraryBox: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },

  emptyLibraryText: {
    color: '#777',
    fontSize: 14
  },

  workoutArea: { paddingHorizontal: 16, paddingBottom: 40 },
  workspaceTitle: {
    color: '#555',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 16,
    marginTop: 4
  },

  emptyWorkspace: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
    paddingHorizontal: 16
  },

  emptyWorkspaceTitle: {
    color: 'white',
    fontWeight: '900',
    fontSize: 20,
    marginTop: 16,
    textAlign: 'center'
  },

  emptyWorkspaceSub: {
    color: '#777',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20
  },

  exerciseCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1A1A1A'
  },

  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14
  },

  exerciseImg: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#111',
    marginRight: 12
  },

  exerciseImgPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#111',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },

  exerciseHeaderText: { flex: 1, paddingRight: 8 },
  exerciseName: { color: 'white', fontWeight: '700', fontSize: 15, marginBottom: 2 },
  exerciseMuscle: { color: '#888', fontSize: 12 },
  trashBtn: { padding: 4 },

  inputsGrid: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 10,
    gap: 5
  },

  inputWrap: { flex: 1, alignItems: 'center' },
  inputLabel: { color: '#555', fontSize: 9, fontWeight: '800', marginBottom: 4 },
  gridInput: { color: 'white', fontSize: 17, fontWeight: '800', textAlign: 'center', padding: 0, minWidth: 28 },
  notasInput: {
    color: '#888',
    fontSize: 14,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    paddingTop: 12
  },

  filterPill: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#222'
  },

  filterPillActive: {
    backgroundColor: '#27272A',
    borderColor: '#444'
  },

  filterPillText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 13
  },

  filterPillTextActive: {
    color: 'white'
  },

  libItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111'
  },

  libImg: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#111',
    marginRight: 14
  },

  libImgPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },

  libTextWrap: {
    flex: 1,
    paddingRight: 10
  },

  libName: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4
  },

  libMuscle: {
    color: '#888',
    fontSize: 12
  },

  libAddIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(250, 204, 21, 0.1)'
  },

  mobileBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: 'rgba(5,5,5,0.97)',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A'
  },
  mobileSaveBtn: {
    backgroundColor: '#FACC15',
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8
  },
  mobileSaveBtnText: {
    color: '#0A0A0A',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5
  }
});
