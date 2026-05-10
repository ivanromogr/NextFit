import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Image, Modal, ActivityIndicator, Platform, Alert, KeyboardAvoidingView,
  Vibration, Linking
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ChevronLeft, Check, Clock, Save, Plus, Info, Trash2, X,
  MessageSquare, Dumbbell, Activity, Trophy, Youtube, Image as ImageIcon, Eye
} from 'lucide-react-native';

// 🔥 IMPORTAMOS obtenerRutinasAsignadasPorEntrenador PARA QUE NO DE ERROR
import { 
  obtenerRutinasCliente, 
  guardarSesionRealizada, 
  obtenerUltimaSesionRutina, 
  obtenerRutinasAsignadasPorEntrenador 
} from '../../api/endpoints';
import { useAuth } from '../../components/context/AuthContext';

const obtenerYoutubeId = (url = "") => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&/]+)/);
  return match?.[1] || null;
};

const obtenerYoutubeThumbnail = (url = "") => {
  const videoId = obtenerYoutubeId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
};

const obtenerYoutubeEmbedUrl = (url = "") => {
  const videoId = obtenerYoutubeId(url);
  if (!videoId) return null;

  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    loop: "1",
    playlist: videoId,
    controls: "0",
    rel: "0",
    modestbranding: "1",
    playsinline: "1"
  });

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
};

const esVideoDirecto = (url = "") => /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);

const ExerciseThumb = ({ imageUrl, videoUrl, style, placeholder }) => {
  const thumbnail = imageUrl || obtenerYoutubeThumbnail(videoUrl);

  if (thumbnail) return <Image source={{ uri: thumbnail }} style={style} />;

  if (esVideoDirecto(videoUrl)) {
    return (
      <Video
        source={{ uri: videoUrl }}
        style={style}
        resizeMode={ResizeMode.COVER}
        shouldPlay={false}
        isMuted
        useNativeControls={false}
      />
    );
  }

  return placeholder;
};

const ExerciseVideo = ({ videoUrl, style }) => {
  const youtubeEmbedUrl = obtenerYoutubeEmbedUrl(videoUrl);

  if (youtubeEmbedUrl) {
    return (
      <WebView
        source={{ uri: youtubeEmbedUrl }}
        style={style}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        scrollEnabled={false}
      />
    );
  }

  if (!esVideoDirecto(videoUrl)) return null;

  return (
    <Video
      source={{ uri: videoUrl }}
      style={style}
      resizeMode={ResizeMode.COVER}
      shouldPlay
      isLooping
      isMuted
      useNativeControls={false}
    />
  );
};

export default function PantallaSesionEntrenamiento() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId } = useAuth();

  const { rutinaId, eventoIdCalendario, nombre, isReadOnly, clienteId: coachClienteId } = route.params || {};
  
  // Si estamos en modo Coach, usamos el ID del cliente que nos pasan. Si no, nuestro propio ID.
  const targetUserId = isReadOnly && coachClienteId ? coachClienteId : userId;

  const [rutina, setRutina] = useState(null);
  const [loading, setLoading] = useState(true);

  const [datosSesion, setDatosSesion] = useState({});
  const [notasSesion, setNotasSesion] = useState({});
  const [historialPrevio, setHistorialPrevio] = useState({});
  const [editandoNotaId, setEditandoNotaId] = useState(null);

  const [infoExercise, setInfoExercise] = useState(null);
  const [showFinishModal, setShowFinishModal] = useState(false);

  const [tiempo, setTiempo] = useState(0);
  const [timerActivo, setTimerActivo] = useState(!isReadOnly); 
  const timerRef = useRef(null);

  // --- CARGA DE DATOS ---
  useEffect(() => {
    const cargar = async () => {
      if (!targetUserId || !rutinaId) {
        Alert.alert("Error", "No se encontró la información de la rutina.");
        navigation.goBack();
        return;
      }

      try {
        // 1. Buscamos en las rutinas del cliente
        let todas = await obtenerRutinasCliente(targetUserId);
        let actual = todas.find(r => r.id === rutinaId);

        // 2. 🔥 SI NO ESTÁ, BUSCAMOS EN LAS RUTINAS ASIGNADAS POR EL ENTRENADOR
        if (!actual) {
          try {
            const asignadas = await obtenerRutinasAsignadasPorEntrenador(targetUserId);
            actual = asignadas.find(r => r.id === rutinaId);
          } catch (errorBusqueda) {
            console.log("No se encontraron rutinas asignadas.");
          }
        }

        if (actual) {
          setRutina(actual);

          let mapaHistorial = {};
          try {
            const lastSession = await obtenerUltimaSesionRutina(targetUserId, rutinaId);
            if (lastSession) {
               if(isReadOnly && lastSession.duracionSegundos) {
                  setTiempo(lastSession.duracionSegundos);
               }
               if (lastSession.series) {
                 mapaHistorial = generarMapaHistorial(lastSession.series);
                 setHistorialPrevio(mapaHistorial);
               }
            }
          } catch (err) {
            console.log("No hay historial para esta rutina.");
          }

          inicializarSesion(actual.detalles || [], mapaHistorial, isReadOnly);
        } else {
          Alert.alert("Aviso", "Rutina no encontrada. Comprueba la conexión o si la rutina fue borrada.");
          navigation.goBack();
        }
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "No se pudo cargar el entrenamiento.");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [rutinaId, targetUserId, isReadOnly]);

  const generarMapaHistorial = (seriesPasadas) => {
    const mapa = {};
    seriesPasadas.forEach(serie => {
      const ejId = serie.ejercicioId || serie.ejercicio?.id;
      if (!ejId) return;
      if (!mapa[ejId]) mapa[ejId] = [];
      const idx = serie.setIndex;
      mapa[ejId][idx] = { peso: serie.peso, reps: serie.reps, rpe: serie.rpe };
    });
    return mapa;
  };

  const inicializarSesion = (ejercicios, historial = {}, readOnly = false) => {
    const estructura = {};
    ejercicios.forEach(ej => {
      const exerciseId = ej.ejercicio.id;
      const datosPreviosEjercicio = historial[exerciseId] || [];
      const numSeries = readOnly && datosPreviosEjercicio.length > 0 ? datosPreviosEjercicio.length : (ej.series || 3);

      estructura[exerciseId] = Array(numSeries).fill(0).map((_, index) => {
        const setPrevio = datosPreviosEjercicio[index];
        return {
          peso: setPrevio ? setPrevio.peso.toString() : ej.peso?.toString() || "0",
          reps: setPrevio ? setPrevio.reps.toString() : ej.repeticiones?.toString() || "0",
          rpe: setPrevio ? setPrevio.rpe?.toString() : ej.rpe?.toString() || "8",
          hecho: readOnly ? (setPrevio != null) : false 
        };
      });
    });
    setDatosSesion(estructura);
  };

  useEffect(() => {
    if (timerActivo && !isReadOnly) {
      timerRef.current = setInterval(() => setTiempo(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActivo, isReadOnly]);

  const formatoTiempo = (segundos) => {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const updateSet = (idEjercicio, index, campo, valor) => {
    if (isReadOnly) return;
    const newSets = [...datosSesion[idEjercicio]];
    newSets[index][campo] = valor;
    setDatosSesion({ ...datosSesion, [idEjercicio]: newSets });
  };

  const toggleCheck = (idEjercicio, index) => {
    if (isReadOnly) return;
    const newSets = [...datosSesion[idEjercicio]];
    newSets[index].hecho = !newSets[index].hecho;
    setDatosSesion({ ...datosSesion, [idEjercicio]: newSets });
    if (newSets[index].hecho) Vibration.vibrate(40);
  };

  const addSet = (idEjercicio) => {
    if (isReadOnly) return;
    const newSets = [...datosSesion[idEjercicio]];
    const ultimo = newSets[newSets.length - 1] || { peso: "0", reps: "0", rpe: "8" };
    newSets.push({ ...ultimo, hecho: false });
    setDatosSesion({ ...datosSesion, [idEjercicio]: newSets });
  };

  const removeSet = (idEjercicio, index) => {
    if (isReadOnly) return;
    const newSets = datosSesion[idEjercicio].filter((_, i) => i !== index);
    setDatosSesion({ ...datosSesion, [idEjercicio]: newSets });
  };

  const calcularVolumenTotal = () => {
    let volumen = 0;
    Object.values(datosSesion).forEach(sets => {
      sets.forEach(s => {
        if (isReadOnly || s.hecho) {
          volumen += (parseFloat(s.peso) || 0) * (parseFloat(s.reps) || 0);
        }
      });
    });
    return volumen;
  };

  const handleTerminarClick = () => {
    if (isReadOnly) return;
    setTimerActivo(false);
    setShowFinishModal(true);
  };

  const confirmFinish = async () => {
    try {
      const notasUnificadas = Object.entries(notasSesion)
        .map(([id, texto]) => texto ? `Nota: ${texto}` : '')
        .filter(t => t !== '')
        .join(" | ");

      const seriesLimpias = [];
      Object.entries(datosSesion).forEach(([ejercicioId, sets]) => {
        sets.forEach((set, index) => {
          if (set.hecho || parseFloat(set.peso) > 0 || parseInt(set.reps) > 0) {
            seriesLimpias.push({
              ejercicioId: ejercicioId,
              setIndex: index,
              peso: parseFloat(set.peso) || 0.0,
              reps: parseInt(set.reps, 10) || 0,
              rpe: parseInt(set.rpe, 10) || 0,
              hecho: set.hecho === true
            });
          }
        });
      });

      const payload = {
        clienteId: userId,
        rutinaId: rutinaId,
        duracionSegundos: tiempo,
        notasGenerales: notasUnificadas || "Sesión finalizada.",
        eventoCalendarioId: eventoIdCalendario || null,
        series: seriesLimpias
      };

      await guardarSesionRealizada(payload);

      Alert.alert("¡Enhorabuena! 🔥", "Entrenamiento guardado correctamente.", [
        { text: "OK", onPress: () => navigation.navigate("ClienteTabs") }
      ]);

    } catch (error) {
      console.error("Error al guardar sesión:", error);
      Alert.alert("Error", "Hubo un error al guardar la sesión.");
      setTimerActivo(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color="white" size={28} />
        </TouchableOpacity>
        
        <View style={{flex: 1, marginHorizontal: 15}}>
          <Text style={styles.headerTitle} numberOfLines={1}>{rutina?.nombre || nombre}</Text>
          {isReadOnly && (
             <View style={{flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4}}>
               <Eye size={12} color="#FACC15"/>
               <Text style={{color: '#FACC15', fontSize: 10, fontWeight: '800', letterSpacing: 1}}>MODO OBSERVADOR</Text>
             </View>
          )}
        </View>

        {!isReadOnly && (
          <TouchableOpacity style={styles.finishBtn} onPress={handleTerminarClick}>
            <Text style={styles.finishBtnText}>TERMINAR</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Clock size={18} color="#FACC15" />
          <Text style={styles.statValue}>{formatoTiempo(tiempo)}</Text>
        </View>
        <View style={styles.statItem}>
          <Activity size={18} color="#FACC15" />
          <Text style={styles.statValue}>
            {isReadOnly ? Object.values(datosSesion).flat().length : Object.values(datosSesion).flat().filter(s => s.hecho).length} sets
          </Text>
        </View>
        <View style={styles.statItem}>
          <Dumbbell size={18} color="#FACC15" />
          <Text style={styles.statValue}>{calcularVolumenTotal()} kg</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : null} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {rutina?.detalles?.map((ej) => {
            const exerciseId = ej.ejercicio.id;
            const sets = datosSesion[exerciseId] || [];
            const notaActual = notasSesion[exerciseId] || "";
            const editando = editandoNotaId === exerciseId;

            return (
              <View key={ej.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <ExerciseThumb
                    imageUrl={ej.ejercicio.imagenUrl}
                    videoUrl={ej.ejercicio.videoUrl}
                    style={styles.imgBox}
                    placeholder={(
                      <View style={[styles.imgBox, { justifyContent: 'center', alignItems: 'center' }]}>
                        <ImageIcon color="#555" size={28} />
                      </View>
                    )}
                  />

                  <View style={{ flex: 1, paddingLeft: 15 }}>
                    <Text style={styles.exTitle}>{ej.ejercicio.nombreTraducido}</Text>
                    
                    {editando && !isReadOnly ? (
                      <View style={styles.noteInputWrap}>
                        <TextInput
                          style={styles.noteInput}
                          placeholder="Añadir nota..."
                          placeholderTextColor="#777"
                          value={notaActual}
                          onChangeText={(v) => setNotasSesion({ ...notasSesion, [exerciseId]: v })}
                          autoFocus
                          onBlur={() => setEditandoNotaId(null)}
                        />
                        <TouchableOpacity style={styles.btnSaveNote} onPress={() => setEditandoNotaId(null)}>
                          <Check size={14} color="black" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.noteDisplay} 
                        onPress={() => !isReadOnly && setEditandoNotaId(exerciseId)}
                        disabled={isReadOnly}
                      >
                        <MessageSquare size={14} color={notaActual ? "#FACC15" : "#777"} />
                        <Text style={[styles.noteText, { color: notaActual ? "#ccc" : "#777" }]}>
                          {notaActual || (isReadOnly ? "Sin notas" : "Añadir nota")}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity style={styles.infoBtn} onPress={() => setInfoExercise(ej.ejercicio)}>
                    <Info size={24} color="#888" />
                  </TouchableOpacity>
                </View>

               <View style={styles.tableHeader}>
                  <Text style={[styles.thText, { width: 30 }]}>SET</Text>
                  {!isReadOnly && <Text style={[styles.thText, { width: 60, textAlign: 'center' }]}>PREV</Text>}
                  <Text style={[styles.thText, { flex: 1 }]}>KG</Text>
                  <Text style={[styles.thText, { flex: 1 }]}>REPS</Text>
                  <Text style={[styles.thText, { width: 65, textAlign: 'center' }]}>OK</Text>
                </View>

                {sets.map((set, i) => {
                  const datoAnterior = historialPrevio[exerciseId]?.[i];

                  return (
                    <View key={i} style={[styles.tableRow, (set.hecho || isReadOnly) && styles.tableRowHecho]}>
                      <Text style={[styles.tdIndex, (set.hecho || isReadOnly) && { color: '#FACC15' }]}>{i + 1}</Text>

                      {!isReadOnly && (
                        <View style={{ width: 60, alignItems: 'center', justifyContent: 'center' }}>
                          {datoAnterior ? (
                            <View style={{ alignItems: 'center' }}>
                              <Text style={styles.tdPrevBold}>{datoAnterior.peso}kg</Text>
                              <Text style={styles.tdPrevReps}>x{datoAnterior.reps}</Text>
                            </View>
                          ) : (
                            <Text style={styles.tdPrev}>-</Text>
                          )}
                        </View>
                      )}

                      <View style={{ flex: 1, paddingHorizontal: 6 }}>
                        <TextInput
                          style={[styles.inputGrid, (set.hecho || isReadOnly) && styles.inputGridHecho]}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#444"
                          value={set.peso}
                          onChangeText={(v) => updateSet(exerciseId, i, 'peso', v)}
                          editable={!isReadOnly} 
                        />
                      </View>

                      <View style={{ flex: 1, paddingHorizontal: 6 }}>
                        <TextInput
                          style={[styles.inputGrid, (set.hecho || isReadOnly) && styles.inputGridHecho]}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#444"
                          value={set.reps}
                          onChangeText={(v) => updateSet(exerciseId, i, 'reps', v)}
                          editable={!isReadOnly} 
                        />
                      </View>

                      <View style={{ width: 65, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        {!set.hecho && sets.length > 1 && !isReadOnly ? (
                          <TouchableOpacity onPress={() => removeSet(exerciseId, i)} style={{ padding: 2 }}>
                            <Trash2 size={18} color="#ef4444" opacity={0.8} />
                          </TouchableOpacity>
                        ) : (
                           <View style={{ width: 22 }} />
                        )}

                        {set.hecho || isReadOnly ? (
                          <TouchableOpacity style={styles.checkBtnActive} onPress={() => toggleCheck(exerciseId, i)} disabled={isReadOnly}>
                            <Check size={20} color="black" strokeWidth={3} />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity style={styles.checkBtn} onPress={() => toggleCheck(exerciseId, i)} disabled={isReadOnly}>
                            <View style={styles.checkInner} />
                          </TouchableOpacity>
                        )}
                      </View>

                    </View>
                  );
                })}

                {!isReadOnly && (
                  <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(exerciseId)}>
                    <Plus size={18} color="#FACC15" />
                    <Text style={styles.addSetText}>AÑADIR SERIE</Text>
                  </TouchableOpacity>
                )}

              </View>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!infoExercise} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalCard}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setInfoExercise(null)}>
              <X size={20} color="white" />
            </TouchableOpacity>

            <View style={styles.modalTag}><Activity size={14} color="#FACC15" /><Text style={styles.modalTagText}>TÉCNICA</Text></View>
            <Text style={styles.infoTitle}>{infoExercise?.nombre}</Text>

            {infoExercise?.videoUrl && (esVideoDirecto(infoExercise.videoUrl) || obtenerYoutubeEmbedUrl(infoExercise.videoUrl)) && (
              <ExerciseVideo videoUrl={infoExercise.videoUrl} style={styles.exerciseVideo} />
            )}

            <ScrollView style={{ maxHeight: 200, marginBottom: 20 }}>
              <Text style={styles.infoText}>
                {infoExercise?.instrucciones || "No hay instrucciones detalladas para este ejercicio."}
              </Text>
            </ScrollView>

            {infoExercise?.videoUrl && !esVideoDirecto(infoExercise.videoUrl) && !obtenerYoutubeEmbedUrl(infoExercise.videoUrl) && (
              <TouchableOpacity style={styles.ytBtn} onPress={() => Linking.openURL(infoExercise.videoUrl)}>
                <Youtube size={22} color="black" />
                <Text style={styles.ytBtnText}>VER TUTORIAL</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showFinishModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.finishModalCard}>
            <View style={styles.trophyWrap}>
              <Trophy size={40} color="#FACC15" />
            </View>
            <Text style={styles.finishTitle}>¡Sesión Completada!</Text>
            <Text style={styles.finishSub}>Gran trabajo hoy. Resumen de tu entreno:</Text>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Tiempo</Text>
                <Text style={styles.summaryValue}>{formatoTiempo(tiempo)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Volumen</Text>
                <Text style={styles.summaryValue}>{calcularVolumenTotal()}kg</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Series</Text>
                <Text style={styles.summaryValue}>{Object.values(datosSesion).flat().filter(s => s.hecho).length}</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setShowFinishModal(false); setTimerActivo(true); }}>
                <Text style={styles.btnCancelText}>SEGUIR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={confirmFinish}>
                <Save size={18} color="black" style={{ marginRight: 6 }} />
                <Text style={styles.btnConfirmText}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 20,
    backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: '#1A1A1A'
  },
  backBtn: { padding: 5 },
  headerTitle: { color: 'white', fontWeight: '900', fontSize: 18, textTransform: 'uppercase', letterSpacing: 0.5 },
  finishBtn: { backgroundColor: '#FACC15', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20 },
  finishBtnText: { color: '#0A0A0A', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },

  statsBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: '#111' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statValue: { color: 'white', fontWeight: '800', fontSize: 15 },

  scrollContent: { padding: 20, paddingBottom: 50 },

  card: { backgroundColor: '#0A0A0A', borderRadius: 24, marginBottom: 25, borderWidth: 1, borderColor: '#1A1A1A', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', padding: 20, borderBottomWidth: 1, borderBottomColor: '#111', alignItems: 'center' },
  imgBox: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#111' },
  exTitle: { color: '#FACC15', fontSize: 18, fontWeight: '900', textTransform: 'uppercase', marginBottom: 5 },
  infoBtn: { padding: 5 },

  noteDisplay: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, backgroundColor: '#111', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, alignSelf: 'flex-start' },
  noteText: { fontSize: 13 },
  noteInputWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 8 },
  noteInput: { flex: 1, backgroundColor: '#111', color: 'white', padding: 10, borderRadius: 10, fontSize: 13 },
  btnSaveNote: { backgroundColor: '#FACC15', padding: 8, borderRadius: 8 },

  tableHeader: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#111', alignItems: 'center' },
  thText: { color: '#777', fontSize: 11, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase' },

  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#111' },
  tableRowHecho: { backgroundColor: 'rgba(250, 204, 21, 0.05)' },
  tdIndex: { width: 30, color: '#555', fontWeight: '900', fontSize: 16, textAlign: 'center' },
  tdPrev: { color: '#666', fontSize: 12, fontStyle: 'italic' },
  tdPrevBold: { color: '#FACC15', fontSize: 13, fontWeight: '800' },
  tdPrevReps: { color: '#888', fontSize: 11 },

  inputGrid: { backgroundColor: '#111', color: 'white', borderRadius: 10, textAlign: 'center', fontWeight: '800', fontSize: 17, paddingVertical: 12, borderWidth: 1, borderColor: 'transparent' },
  inputGridHecho: { color: '#FACC15', backgroundColor: '#1a1a00', borderColor: 'rgba(250, 204, 21, 0.3)' },

  checkBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  checkInner: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#333' },
  checkBtnActive: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FACC15', alignItems: 'center', justifyContent: 'center' },

  addSetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, borderTopWidth: 1, borderTopColor: '#111' },
  addSetText: { color: '#FACC15', fontWeight: '900', fontSize: 13, letterSpacing: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  infoModalCard: { backgroundColor: '#111', width: '100%', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#222' },
  closeBtn: { position: 'absolute', top: 15, right: 15, zIndex: 10, padding: 5, backgroundColor: '#222', borderRadius: 15 },
  modalTag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, backgroundColor: 'rgba(250,204,21,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 15 },
  modalTagText: { color: '#FACC15', fontSize: 10, fontWeight: '900' },
  infoTitle: { color: 'white', fontSize: 22, fontWeight: '900', marginBottom: 15, textTransform: 'uppercase' },
  infoText: { color: '#aaa', fontSize: 14, lineHeight: 22 },
  exerciseVideo: { width: '100%', height: 260, borderRadius: 16, backgroundColor: '#000', marginBottom: 18 },
  ytBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FACC15', padding: 14, borderRadius: 12, marginTop: 10 },
  ytBtnText: { color: '#0A0A0A', fontWeight: '900', fontSize: 14 },

  finishModalCard: { backgroundColor: '#111', width: '100%', borderRadius: 24, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  trophyWrap: { backgroundColor: 'rgba(250,204,21,0.1)', padding: 15, borderRadius: 40, marginBottom: 15 },
  finishTitle: { color: 'white', fontSize: 22, fontWeight: '900', marginBottom: 5 },
  finishSub: { color: '#888', fontSize: 13, marginBottom: 25 },
  summaryGrid: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', backgroundColor: '#0a0a0a', padding: 15, borderRadius: 16, marginBottom: 25 },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { color: '#666', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { color: '#FACC15', fontSize: 18, fontWeight: '900' },
  modalActions: { flexDirection: 'row', width: '100%', gap: 10 },
  btnCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  btnCancelText: { color: 'white', fontWeight: '800', fontSize: 13 },
  btnConfirm: { flex: 1, flexDirection: 'row', backgroundColor: '#FACC15', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnConfirmText: { color: '#0A0A0A', fontWeight: '800', fontSize: 13 }
});
