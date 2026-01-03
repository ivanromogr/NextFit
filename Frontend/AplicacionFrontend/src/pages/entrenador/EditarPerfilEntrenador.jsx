import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEntrenador, actualizarEntrenador } from '../../api/endpoints';
import { User, Save, ChevronLeft, Camera, CheckCircle, AlertCircle, Briefcase, Mail, AlignLeft } from 'lucide-react';

const EditarPerfilEntrenador = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Estado del formulario
  const [form, setForm] = useState({ 
    nombre: '', 
    apellido: '', 
    email: '', 
    // Ahora soportamos múltiples especialidades
    especialidad: [], 
    aniosExperiencia: '', 
    formacion: '', 
    descripcionPerfil: '', 
    modalidadTrabajo: '', 
    genero: '', 
    fotoPerfil: '', 
    contraseña: '' 
  });

  // Guardamos una copia con los valores originales para detectar cambios
  const [originalForm, setOriginalForm] = useState(null);

  const [saving, setSaving] = useState(false);
  
  // ✅ Estado para Toast (Notificaciones)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const LISTA_TITULACIONES = [
    "Grado en CAFD / INEF",
    "Doble Grado CAFD + Fisioterapia",
    "Técnico Superior (TSAF / TAFAD)",
    "Máster en Alto Rendimiento",
    "Certificación NSCA (CPT / CSCS)",
    "Certificación ACSM / NASM / ACE",
    "Entrenador Nacional (FEFF / IFBB)",
    "CrossFit Level 1 / 2",
    "Instructor de Yoga / Pilates",
    "Estudiante de CAFD",
    "Experiencia Propia / Autodidacta",
    "Otro"
  ];

  const LISTA_ESPECIALIDADES = [
    "Fuerza", "Hipertrofia", "Pérdida de Peso", "CrossFit", 
    "Cardio", "Movilidad", "Rehabilitación", "Funcional", "Calistenia"
  ];

  // Lista visible que incluye opciones canónicas + cualquier especialidad adicional encontrada en el perfil
  const [visibleEspecialidades, setVisibleEspecialidades] = useState(LISTA_ESPECIALIDADES);

  useEffect(() => {
    const fetch = async () => {
      const id = localStorage.getItem('entrenadorId');
      if (!id) return navigate('/auth/login');
      try {
        const data = await getEntrenador(id);
        // Inicializamos el formulario con los valores actuales
        const normalized = {
          nombre: data.nombre || '',
          apellido: data.apellido || '',
          email: data.email || '',
          // Convertimos la cadena a array si viene como 'A, B' y la normalizamos a las opciones canónicas
          especialidad: (() => {
            const raw = data.especialidad ? data.especialidad.split(',').map(s => s.trim()).filter(Boolean) : [];
            const normalize = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
            const mapped = raw.flatMap(r => {
              if (!r) return [];
              // separamos por '/', '|', '-', '\\' para tokens como 'HIIT / Funcional' o 'Yoga / Pilates'
              const parts = r.split(/[/|\\-]/).map(p => p.trim()).filter(Boolean);
              const results = [];
              parts.forEach(part => {
                // intentamos match exacto normalizado
                let match = LISTA_ESPECIALIDADES.find(opt => normalize(opt) === normalize(part));
                if (!match) {
                  // intento por inclusión (p.ej. 'HIIT / Funcional' -> 'Funcional')
                  match = LISTA_ESPECIALIDADES.find(opt => normalize(part).includes(normalize(opt)) || normalize(opt).includes(normalize(part)));
                }
                if (!match) {
                  // intento por token (palabras sueltas)
                  match = LISTA_ESPECIALIDADES.find(opt => {
                    const optTokens = normalize(opt).split(' ');
                    return optTokens.some(tok => normalize(part).includes(tok));
                  });
                }
                if (match) results.push(match);
                else results.push(part);
              });
              return results;
            }).filter((v,i,a)=>v && a.indexOf(v)===i);
            console.debug('Especialidades (raw -> mapped):', raw, mapped);
            // Añadimos cualquier especialidad extra que no esté en la lista canónica para que se muestre marcada
            const extras = mapped.filter(m => !LISTA_ESPECIALIDADES.some(opt => opt.toLowerCase() === m.toLowerCase()));
            if (extras.length > 0) {
              setVisibleEspecialidades(prev => {
                const newOnes = extras.filter(e => !prev.some(p => p.toLowerCase() === e.toLowerCase()));
                return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
              });
            }
            return mapped;
          })(),
          aniosExperiencia: data.aniosExperiencia != null ? String(data.aniosExperiencia) : '',
          formacion: data.formacion || '',
          descripcionPerfil: data.descripcionPerfil || '',
          modalidadTrabajo: data.modalidadTrabajo || 'ONLINE',
          genero: data.genero || '',
          fotoPerfil: data.fotoPerfil || '',
          contraseña: ''
        };
        setForm(normalized);
        setOriginalForm(normalized);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch();
  }, [navigate]);

  const handleChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // Permite activar/desactivar una especialidad en el array
  const toggleEspecialidad = (esp) => {
    setForm(prev => {
      const current = Array.isArray(prev.especialidad) ? prev.especialidad : [];
      if (current.includes(esp)) return { ...prev, especialidad: current.filter(e => e !== esp) };
      return { ...prev, especialidad: [...current, esp] };
    });
  };

  // --- HELPER TOAST ---
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const id = localStorage.getItem('entrenadorId');

      // Construimos payload con SOLO los campos que cambiaron (o se borraron explícitamente)
      const payload = {};
      Object.keys(form).forEach((k) => {
        // Password: sólo enviarla si se escribió algo
        if (k === 'contraseña') {
          if (form.contraseña && form.contraseña.trim() !== '') payload.contraseña = form.contraseña;
          return;
        }

        // Especialidad: comparamos y enviamos como string joinado
        if (k === 'especialidad') {
          const curr = Array.isArray(form.especialidad) ? form.especialidad.join(', ') : (form.especialidad || '');
          const orig = originalForm && Array.isArray(originalForm.especialidad) ? originalForm.especialidad.join(', ') : (originalForm ? (originalForm.especialidad || '') : '');
          if (curr !== orig) payload.especialidad = curr;
          return;
        }

        const orig = originalForm ? (originalForm[k] !== undefined ? originalForm[k] : '') : '';
        if (form[k] !== orig) {
          // Campos numéricos: convertir a número o null si vacío
          if (k === 'aniosExperiencia' || k === 'edad') {
            if (form[k] === '' || form[k] === null) payload[k] = null;
            else payload[k] = Number(form[k]);
          } else {
            payload[k] = form[k];
          }
        }
      });

      if (Object.keys(payload).length === 0) {
        showToast('No hay cambios para guardar', 'success');
        setSaving(false);
        return;
      }

      await actualizarEntrenador(id, payload);
      showToast('Perfil actualizado correctamente', 'success');

      // Actualizamos originalForm para reflejar lo guardado (mantenemos especialidad como array)
      setOriginalForm(prev => {
        const merged = { ...(prev || {}), ...payload };
        if (merged.especialidad && typeof merged.especialidad === 'string') {
          merged.especialidad = merged.especialidad.split(',').map(s => s.trim()).filter(Boolean);
        }
        return merged;
      });

      setTimeout(() => navigate('/entrenador/dashboard'), 1500);
    } catch (err) {
      console.error(err);
      showToast('Error al actualizar el perfil', 'error');
    } finally { 
      setSaving(false); 
    }
  };

  if (loading) return <div style={{height: '100vh', background: '#050505', display:'flex', justifyContent:'center', alignItems:'center', color:'#666'}}>Cargando datos...</div>;

  // --- ESTILOS TITÁN ---
  const styles = {
    container: { minHeight: '100vh', background: '#050505', color: 'white', fontFamily: "'Inter', sans-serif", paddingBottom: '50px' },
    
    // Header
    header: { 
        position: 'sticky', top: 0, zIndex: 50, 
        background: 'rgba(5, 5, 5, 0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #1a1a1a', padding: '20px 40px', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    backBtn: { background: 'transparent', border: '1px solid #333', color: '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize:'0.85rem', fontWeight:'700', padding:'10px 20px', borderRadius:'10px', transition:'all 0.2s' },
    saveBtn: { background: '#FACC15', color: 'black', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', display:'flex', alignItems:'center', gap:'10px', textTransform:'uppercase', letterSpacing:'1px', boxShadow:'0 0 25px rgba(250, 204, 21, 0.2)' },

    content: { maxWidth: '1000px', margin: '40px auto', padding: '0 20px' },
    
    mainCard: { background: '#0a0a0a', border: '1px solid #222', borderRadius: '24px', padding: '40px', position: 'relative', overflow:'hidden' },
    
    sectionTitle: { fontSize: '1.2rem', fontWeight: '800', color: 'white', marginBottom: '20px', display:'flex', alignItems:'center', gap:'10px', textTransform:'uppercase', letterSpacing:'1px' },
    
    // Grid System
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },
    grid1: { display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' },

    // Inputs
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { fontSize: '0.75rem', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' },
    input: { background: '#121212', border: '1px solid #333', color: 'white', padding: '14px', borderRadius: '12px', outline: 'none', fontSize: '0.95rem', transition: 'border 0.2s', width: '100%' },
    textarea: { background: '#121212', border: '1px solid #333', color: 'white', padding: '14px', borderRadius: '12px', outline: 'none', fontSize: '0.95rem', transition: 'border 0.2s', width: '100%', minHeight: '120px', resize: 'vertical', fontFamily: "'Inter', sans-serif" },

    // Foto Section
    photoSection: { display: 'flex', alignItems: 'center', gap: '25px', marginBottom: '40px', padding: '20px', background: '#111', borderRadius: '16px', border: '1px solid #222' },
    avatarBox: { width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', background: '#1a1a1a', border: '2px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    
    // Toast
    toast: {
        position: 'fixed', top: '100px', right: '40px', zIndex: 9999,
        background: toast.type === 'success' ? '#18181b' : '#18181b',
        border: `1px solid ${toast.type === 'success' ? '#10B981' : '#EF4444'}`,
        padding: '16px 24px', borderRadius: '50px',
        display: 'flex', alignItems: 'center', gap: '12px',
        color: 'white', fontWeight: '600', fontSize: '0.9rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        transform: toast.show ? 'translateX(0)' : 'translateX(100px)',
        opacity: toast.show ? 1 : 0,
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        pointerEvents: 'none'
    },
  };

  return (
    <div style={styles.container}>
        
        {/* TOAST */}
        <div style={styles.toast}>
            {toast.type === 'success' ? <CheckCircle size={20} color="#10B981"/> : <AlertCircle size={20} color="#EF4444"/>}
            {toast.message}
        </div>

        {/* HEADER */}
        <div style={styles.header}>
            <button style={styles.backBtn} onClick={() => navigate('/entrenador/dashboard')} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>
                <ChevronLeft size={18}/> CANCELAR
            </button>
            <div style={{color:'#666', fontWeight:'800', fontSize:'0.8rem', letterSpacing:'2px', textTransform:'uppercase'}}>PERFIL PROFESIONAL</div>
            <button style={styles.saveBtn} onClick={handleSubmit} disabled={saving}>
                {saving ? 'GUARDANDO...' : <><Save size={20}/> GUARDAR CAMBIOS</>}
            </button>
        </div>

        <div style={styles.content}>
            <div style={styles.mainCard}>
                
                {/* SECCIÓN FOTO */}
                <div style={styles.photoSection}>
                    <div style={styles.avatarBox}>
                        {form.fotoPerfil ? <img src={form.fotoPerfil} alt="avatar" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <User size={40} color="#555"/>}
                    </div>
                    <div style={{flex: 1}}>
                        <h3 style={{margin:'0 0 5px 0', fontSize:'1.1rem', fontWeight:'700'}}>Foto de Perfil</h3>
                        <p style={{margin:'0 0 15px 0', fontSize:'0.85rem', color:'#666'}}>Se mostrará a tus atletas en su panel.</p>
                        <div style={styles.inputGroup}>
                            <div style={{position:'relative'}}>
                                <Camera size={18} color="#666" style={{position:'absolute', left:'14px', top:'14px'}}/>
                                <input 
                                    style={{...styles.input, paddingLeft:'45px'}} 
                                    placeholder="Pegar URL de la imagen (https://...)" 
                                    value={form.fotoPerfil} 
                                    onChange={e => handleChange('fotoPerfil', e.target.value)} 
                                    onFocus={e => e.target.style.borderColor = '#FACC15'} 
                                    onBlur={e => e.target.style.borderColor = '#333'}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN PERSONAL */}
                <div style={styles.sectionTitle}><User size={20} color="#FACC15"/> Datos Personales</div>
                <div style={styles.grid2}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Nombre</label>
                        <input style={styles.input} placeholder="Tu nombre" value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} onFocus={e => e.target.style.borderColor = '#FACC15'} onBlur={e => e.target.style.borderColor = '#333'}/>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Apellido</label>
                        <input style={styles.input} placeholder="Tu apellido" value={form.apellido} onChange={e => handleChange('apellido', e.target.value)} onFocus={e => e.target.style.borderColor = '#FACC15'} onBlur={e => e.target.style.borderColor = '#333'}/>
                    </div>
                </div>
                <div style={styles.grid1}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Correo Electrónico</label>
                        <div style={{position:'relative'}}>
                            <Mail size={18} color="#666" style={{position:'absolute', left:'14px', top:'14px'}}/>
                            <input style={{...styles.input, paddingLeft:'45px'}} placeholder="email@ejemplo.com" value={form.email} onChange={e => handleChange('email', e.target.value)} onFocus={e => e.target.style.borderColor = '#FACC15'} onBlur={e => e.target.style.borderColor = '#333'}/>
                        </div>
                    </div>
                </div>

                <div style={{height:'30px'}}></div>

                {/* SECCIÓN PROFESIONAL */}
                <div style={styles.sectionTitle}><Briefcase size={20} color="#FACC15"/> Perfil Profesional</div>
                
                <div style={styles.grid2}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Especialidades</label>
                        <div style={{display:'flex', flexWrap:'wrap', gap:'10px'}}>
                            {visibleEspecialidades.map(opt => {
                                const selected = Array.isArray(form.especialidad) && form.especialidad.some(e => e.toLowerCase() === opt.toLowerCase());
                                return (
                                    <label key={opt} style={{display:'flex', alignItems:'center', gap:'8px', background: selected ? '#0f1720' : 'transparent', border: '1px solid #333', padding: '8px 12px', borderRadius: '12px', cursor: 'pointer'}}>
                                        <input type="checkbox" checked={selected} onChange={() => toggleEspecialidad(opt)} />
                                        <span style={{fontSize:'0.9rem', color:'#ccc'}}>{opt}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <div style={{marginTop:'8px', fontSize:'0.85rem', color:'#666'}}>{Array.isArray(form.especialidad) && form.especialidad.length > 0 ? form.especialidad.join(', ') : 'Selecciona tus especialidades...'}</div>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Años de Experiencia</label>
                        <input type="number" style={styles.input} placeholder="Ej: 5" value={form.aniosExperiencia} onChange={e => handleChange('aniosExperiencia', e.target.value)} onFocus={e => e.target.style.borderColor = '#FACC15'} onBlur={e => e.target.style.borderColor = '#333'}/>
                    </div>
                </div>

                <div style={styles.grid1}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Formación / Titulación</label>
                        <select style={styles.input} value={form.formacion || ''} onChange={e => handleChange('formacion', e.target.value)} onFocus={e => e.target.style.borderColor = '#FACC15'} onBlur={e => e.target.style.borderColor = '#333'}>
                            <option value="">Selecciona tu titulación...</option>
                            {LISTA_TITULACIONES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                </div>

                <div style={styles.grid2}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Modalidad de Trabajo</label>
                        <select style={styles.input} value={form.modalidadTrabajo || ''} onChange={e => handleChange('modalidadTrabajo', e.target.value)} onFocus={e => e.target.style.borderColor = '#FACC15'} onBlur={e => e.target.style.borderColor = '#333'}>
                            <option value="ONLINE">100% Online</option>
                            <option value="PRESENCIAL">Presencial</option>
                            <option value="MIXTO">Híbrido / Mixto</option>
                        </select>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Género</label>
                        <select style={styles.input} value={form.genero || ''} onChange={e => handleChange('genero', e.target.value)} onFocus={e => e.target.style.borderColor = '#FACC15'} onBlur={e => e.target.style.borderColor = '#333'}>
                            <option value="">Selecciona...</option>
                            <option value="MASCULINO">Masculino</option>
                            <option value="FEMENINO">Femenino</option>
                            <option value="NO_DECIR">Prefiero no decirlo</option>
                        </select>
                    </div>
                </div>

                <div style={styles.grid1}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Biografía Pública</label>
                        <div style={{position:'relative'}}>
                            <AlignLeft size={18} color="#666" style={{position:'absolute', left:'14px', top:'14px'}}/>
                            <textarea 
                                style={{...styles.textarea, paddingLeft:'45px'}} 
                                placeholder="Describe tu metodología, logros o filosofía de entrenamiento..." 
                                value={form.descripcionPerfil} 
                                onChange={e => handleChange('descripcionPerfil', e.target.value)} 
                                onFocus={e => e.target.style.borderColor = '#FACC15'} 
                                onBlur={e => e.target.style.borderColor = '#333'}
                            />
                        </div>
                    </div>
                </div>

                <div style={{height:'30px', borderTop:'1px solid #222', margin:'20px 0'}}></div>

                {/* SEGURIDAD */}
                <div style={styles.sectionTitle}><User size={20} color="#ef4444"/> Seguridad</div>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Cambiar Contraseña</label>
                    <input 
                        type="password" 
                        style={styles.input} 
                        placeholder="Escribe para cambiar (déjalo vacío para mantener la actual)" 
                        value={form.contraseña} 
                        onChange={e => handleChange('contraseña', e.target.value)} 
                        onFocus={e => e.target.style.borderColor = '#ef4444'} 
                        onBlur={e => e.target.style.borderColor = '#333'}
                    />
                </div>

            </div>
        </div>
    </div>
  );
};

export default EditarPerfilEntrenador;