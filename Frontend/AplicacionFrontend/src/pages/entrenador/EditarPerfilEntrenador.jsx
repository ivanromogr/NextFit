import AccountSecurityMenu from "../../components/account/AccountSecurityMenu";
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteProfileImage, getEntrenador, actualizarEntrenador } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  ChevronLeft,
  Camera,
  CheckCircle,
  AlertCircle,
  Briefcase,
  Mail,
  AlignLeft,
  Lock,
  Globe // Añadimos el icono para el Escaparate Público
} from 'lucide-react';


import GymButton from '../../components/ui/GymButton';
import GymInput from '../../components/ui/GymInput';
import GymSelectionCard from '../../components/ui/GymSelectionCard';
import ImageUpload from '../../components/ui/ImageUpload';

const EditarPerfilEntrenador = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const removePhoto = async () => { try { await deleteProfileImage(); handleChange('fotoPerfil', ''); } catch { showToast('No se pudo eliminar la foto', 'error'); } };

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    especialidad: [],
    aniosExperiencia: '',
    formacion: '',
    descripcionPerfil: '',
    modalidadTrabajo: '',
    genero: '',
    fotoPerfil: '',
    perfilPublico: false,
    tarifaMensual: ''
  });

  const [, setOriginalForm] = useState(null);
  const [saving, setSaving] = useState(false);

  
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

  const [visibleEspecialidades, setVisibleEspecialidades] = useState(LISTA_ESPECIALIDADES);

  useEffect(() => {
    const fetch = async () => {
      // Si no hay userId, vuelve al login
      if (!userId) {
        navigate('/auth/login');
        return;
      }

      try {
        console.log('Fetching entrenador con ID:', userId);
        const data = await getEntrenador(userId);
        console.log(' Datos recibidos:', data);

        const normalized = {
          nombre: data.nombre || '',
          apellido: data.apellido || '',
          email: data.email || '',
          especialidad: (() => {
            const raw = data.especialidad
              ? data.especialidad.split(',').map(s => s.trim()).filter(Boolean)
              : [];

            const normalize = s =>
              s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

            const mapped = raw.flatMap(r => {
              if (!r) return [];
              const parts = r.split(/[/|\\-]/).map(p => p.trim()).filter(Boolean);
              const results = [];

              parts.forEach(part => {
                let match = LISTA_ESPECIALIDADES.find(opt => normalize(opt) === normalize(part));
                if (!match) {
                  match = LISTA_ESPECIALIDADES.find(opt =>
                    normalize(part).includes(normalize(opt)) || normalize(opt).includes(normalize(part))
                  );
                }
                if (!match) {
                  match = LISTA_ESPECIALIDADES.find(opt => {
                    const optTokens = normalize(opt).split(' ');
                    return optTokens.some(tok => normalize(part).includes(tok));
                  });
                }
                results.push(match || part);
              });

              return results;
            }).filter((v, i, a) => v && a.indexOf(v) === i);

            const extras = mapped.filter(m =>
              !LISTA_ESPECIALIDADES.some(opt => opt.toLowerCase() === String(m).toLowerCase())
            );

            if (extras.length > 0) {
              setVisibleEspecialidades(prev => {
                const newOnes = extras.filter(e => !prev.some(p => p.toLowerCase() === String(e).toLowerCase()));
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
          perfilPublico: data.perfilPublico || false,
          tarifaMensual: data.tarifaMensual != null ? String(data.tarifaMensual) : ''
        };

        console.log(' Form normalizado:', normalized);
        setForm(normalized);
        setOriginalForm(normalized);
        setLoading(false);
      } catch (e) {
        console.error('❌ Error al cargar datos:', e);
        setLoading(false);
        showToast('Error al cargar datos del perfil', 'error');
      }
    };

    fetch();
  }, [userId]);

  const handleChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const toggleEspecialidad = (esp) => {
    setForm(prev => {
      const current = Array.isArray(prev.especialidad) ? prev.especialidad : [];
      const exists = current.some(e => String(e).toLowerCase() === String(esp).toLowerCase());
      if (exists) return { ...prev, especialidad: current.filter(e => String(e).toLowerCase() !== String(esp).toLowerCase()) };
      return { ...prev, especialidad: [...current, esp] };
    });
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 🔧 SIMPLIFICADO: Enviar todos los campos que se pueden editar
      // (excluyendo email, que se actualiza mediante su operación dedicada)
      const payload = {
        nombre: form.nombre || '',
        apellido: form.apellido || '',
        fotoPerfil: form.fotoPerfil || '',
        especialidad: Array.isArray(form.especialidad) ? form.especialidad.join(', ') : (form.especialidad || ''),
        aniosExperiencia: (form.aniosExperiencia === '' || form.aniosExperiencia === null) ? null : Number(form.aniosExperiencia),
        formacion: form.formacion || '',
        descripcionPerfil: form.descripcionPerfil || '',
        modalidadTrabajo: form.modalidadTrabajo || 'ONLINE',
        genero: form.genero || '',
        perfilPublico: Boolean(form.perfilPublico),
        tarifaMensual: (form.tarifaMensual === '' || form.tarifaMensual === null) ? null : Number(form.tarifaMensual)
      };

      console.log('📤 Enviando payload:', payload);

      await actualizarEntrenador(userId, payload);
      showToast('Perfil actualizado correctamente', 'success');

      // Actualizar el form original después de guardar exitosamente
      setOriginalForm(form);

      setTimeout(() => navigate('/entrenador/dashboard'), 1500);
    } catch (err) {
      console.error('❌ Error actualizando perfil:', err);
      const serverMsg = err.response && (err.response.data || err.response.statusText) 
        ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)) 
        : err.message;
      showToast(`Error al actualizar el perfil: ${serverMsg}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        background: '#09090b',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'rgba(255,255,255,0.55)',
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
      }}>
        Cargando datos...
      </div>
    );
  }

  const styles = {
    container: {
      minHeight: '100vh',
      background: '#09090b',
      color: 'white',
      fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      paddingBottom: '60px'
    },
    header: {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(9, 9, 11, 0.92)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      padding: '18px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px'
    },
    headerTitle: {
      color: 'rgba(255,255,255,0.55)',
      fontWeight: 900,
      fontSize: '0.8rem',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap'
    },
    content: { maxWidth: '1040px', margin: '34px auto', padding: '0 18px' },
    mainCard: {
      background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: '24px',
      padding: '34px',
      boxShadow: '0 18px 60px rgba(0,0,0,0.55)'
    },
    sectionTitle: {
      fontSize: '0.9rem',
      fontWeight: 900,
      color: 'white',
      margin: '22px 0 14px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
    divider: { height: 1, background: 'rgba(255,255,255,0.08)', margin: '22px 0' },
    photoSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      marginBottom: '20px',
      padding: '18px',
      background: 'rgba(0,0,0,0.25)',
      borderRadius: '18px',
      border: '1px solid rgba(255,255,255,0.08)'
    },
    avatarBox: {
      width: '92px',
      height: '92px',
      borderRadius: '18px',
      overflow: 'hidden',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.10)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    helper: { margin: '6px 0 0 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.55)' },
    fieldLabel: {
      display: 'block',
      marginBottom: '10px',
      color: 'rgba(255,255,255,0.55)',
      fontSize: '0.82rem',
      fontWeight: 800,
      letterSpacing: '0.9px',
      textTransform: 'uppercase',
    },
    select: {
      width: '100%',
      padding: '14px 14px',
      backgroundColor: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: '14px',
      color: '#ffffff',
      fontSize: '1rem',
      outline: 'none',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
      fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    },
    textareaWrap: { position: 'relative' },
    textareaIcon: { position: 'absolute', left: 14, top: 14, color: '#FACC15', pointerEvents: 'none' },
    textarea: {
      width: '100%',
      padding: '14px 14px',
      paddingLeft: '46px',
      backgroundColor: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: '14px',
      color: '#ffffff',
      fontSize: '1rem',
      outline: 'none',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
      minHeight: '120px',
      resize: 'vertical',
      fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    },
    toast: {
      position: 'fixed',
      top: '96px',
      right: '18px',
      zIndex: 9999,
      background: '#18181b',
      border: `1px solid ${toast.type === 'success' ? '#10B981' : '#EF4444'}`,
      padding: '14px 18px',
      borderRadius: '999px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      color: 'white',
      fontWeight: 700,
      fontSize: '0.92rem',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      transform: toast.show ? 'translateX(0)' : 'translateX(120px)',
      opacity: toast.show ? 1 : 0,
      transition: 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      pointerEvents: 'none'
    },
    especGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '12px'
    },
    dangerHint: {
      marginTop: 8,
      color: 'rgba(255,255,255,0.45)',
      fontSize: '0.9rem'
    },
    escaparateBox: {
      background: 'rgba(250, 204, 21, 0.03)', 
      border: '1px solid rgba(250, 204, 21, 0.2)', 
      borderRadius: '16px', 
      padding: '24px',
      marginTop: '10px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.toast}>
        {toast.type === 'success'
          ? <CheckCircle size={18} color="#10B981" />
          : <AlertCircle size={18} color="#EF4444" />
        }
        {toast.message}
      </div>

      <div style={styles.header}>
        <GymButton variant="secondary" onClick={() => navigate('/entrenador/dashboard')}>
          <ChevronLeft size={18} /> Cancelar
        </GymButton>
        <div style={styles.headerTitle}>Perfil profesional</div>
        <GymButton type="submit" loading={saving} onClick={handleSubmit}>
          Guardar cambios
        </GymButton>
      </div>

      <div style={styles.content}>
        <form onSubmit={handleSubmit}>
          <div style={styles.mainCard}>
            
            <div style={styles.photoSection}>
              <div style={styles.avatarBox}>
                {form.fotoPerfil
                  ? <img src={form.fotoPerfil} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <User size={34} color="rgba(255,255,255,0.35)" />
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: '1.05rem', marginBottom: '8px' }}>Foto de perfil</div>
                <p style={styles.helper}>Sube una imagen profesional o pega una URL.</p>
                
                {/* Componente de upload de imágenes */}
                <ImageUpload 
                  onUploadSuccess={(url) => handleChange('fotoPerfil', url)}
                  label="Seleccionar imagen"
                />
                {form.fotoPerfil && <button className="account-photo-remove" type="button" onClick={removePhoto}>Eliminar foto</button>}
              </div>
            </div>

            <div style={styles.sectionTitle}><User size={18} color="#FACC15" /> Datos personales</div>
            <div style={styles.grid2}>
              <GymInput label="Nombre" placeholder="Tu nombre" value={form.nombre} onChange={(e) => handleChange('nombre', e.target.value)} />
              <GymInput label="Apellido" placeholder="Tu apellido" value={form.apellido} onChange={(e) => handleChange('apellido', e.target.value)} />
            </div>
            <div style={{ marginTop: 14 }}>
              <GymInput label="Correo electrónico" placeholder="email@ejemplo.com" icon={Mail} value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
            </div>

            <div style={styles.divider} />

            {/* 👇 NUEVA SECCIÓN: ESCAPARATE PÚBLICO 👇 */}
            <div style={styles.sectionTitle}><Globe size={18} color="#FACC15" /> Escaparate Público (Marketplace)</div>
            <div style={styles.escaparateBox}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.perfilPublico ? '20px' : '0' }}>
                <div>
                  <div style={{ color: 'white', fontWeight: '800', fontSize: '1.05rem' }}>Aparecer en búsquedas</div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', marginTop: '4px' }}>Permite que nuevos clientes te encuentren y te contraten.</div>
                </div>
                
                {/* Custom Toggle Switch */}
                <label style={{ position: 'relative', display: 'inline-block', width: '52px', height: '28px' }}>
                  <input 
                    type="checkbox" 
                    style={{ opacity: 0, width: 0, height: 0 }}
                    checked={form.perfilPublico}
                    onChange={(e) => handleChange('perfilPublico', e.target.checked)}
                  />
                  <span style={{ 
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: form.perfilPublico ? '#FACC15' : 'rgba(255,255,255,0.1)', 
                    borderRadius: '34px', transition: '0.3s', border: '1px solid rgba(255,255,255,0.1)' 
                  }}>
                    <span style={{
                      position: 'absolute', height: '20px', width: '20px', 
                      left: form.perfilPublico ? '27px' : '3px', bottom: '3px', 
                      backgroundColor: form.perfilPublico ? '#000' : 'rgba(255,255,255,0.6)', 
                      borderRadius: '50%', transition: '0.3s'
                    }}></span>
                  </span>
                </label>
              </div>

              {form.perfilPublico && (
                <div style={{ marginTop: 14 }}>
                  <GymInput
                    label="Tarifa Mensual (€)"
                    type="number"
                    placeholder="Ej: 50"
                    value={form.tarifaMensual}
                    onChange={(e) => handleChange('tarifaMensual', e.target.value)}
                    suffix="€ / mes"
                  />
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', marginTop: '8px' }}>
                    Tus especialidades y biografía (configuradas abajo) se usarán como tu carta de presentación.
                  </div>
                </div>
              )}
            </div>

            <div style={styles.divider} />

            <div style={styles.sectionTitle}><Briefcase size={18} color="#FACC15" /> Perfil profesional</div>
            <div style={{ marginBottom: 12, color: 'rgba(255,255,255,0.55)', fontSize: '0.92rem' }}>Selecciona tus especialidades (puedes marcar varias).</div>
            <div style={styles.especGrid}>
              {visibleEspecialidades.map(opt => {
                const selected = Array.isArray(form.especialidad) && form.especialidad.some(e => String(e).toLowerCase() === String(opt).toLowerCase());
                return <GymSelectionCard key={opt} title={opt} selected={selected} onClick={() => toggleEspecialidad(opt)} />;
              })}
            </div>
            <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem' }}>
              {Array.isArray(form.especialidad) && form.especialidad.length > 0 ? `Seleccionadas: ${form.especialidad.join(', ')}` : 'Selecciona tus especialidades...'}
            </div>

            <div style={{ marginTop: 14 }}>
              <GymInput label="Años de experiencia" type="number" placeholder="Ej: 5" value={form.aniosExperiencia} onChange={(e) => handleChange('aniosExperiencia', e.target.value)} suffix="años" />
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={styles.fieldLabel}>Formación / Titulación</label>
              <select style={styles.select} value={form.formacion || ''} onChange={(e) => handleChange('formacion', e.target.value)}>
                <option value="">Selecciona tu titulación...</option>
                {LISTA_TITULACIONES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div style={{ marginTop: 14, ...styles.grid2 }}>
              <div>
                <label style={styles.fieldLabel}>Modalidad de trabajo</label>
                <select style={styles.select} value={form.modalidadTrabajo || ''} onChange={(e) => handleChange('modalidadTrabajo', e.target.value)}>
                  <option value="ONLINE">100% Online</option>
                  <option value="PRESENCIAL">Presencial</option>
                  <option value="MIXTO">Híbrido / Mixto</option>
                </select>
              </div>
              <div>
                <label style={styles.fieldLabel}>Género</label>
                <select style={styles.select} value={form.genero || ''} onChange={(e) => handleChange('genero', e.target.value)}>
                  <option value="">Selecciona...</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMENINO">Femenino</option>
                  <option value="NO_DECIR">Prefiero no decirlo</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={styles.fieldLabel}>Biografía pública</label>
              <div style={styles.textareaWrap}>
                <AlignLeft size={18} style={styles.textareaIcon} />
                <textarea
                  style={styles.textarea}
                  placeholder="Describe tu metodología, logros o filosofía de entrenamiento..."
                  value={form.descripcionPerfil}
                  onChange={(e) => handleChange('descripcionPerfil', e.target.value)}
                />
              </div>
            </div>

            <div style={styles.divider} />

            <div style={styles.sectionTitle}><Lock size={18} color="#EF4444" /> Seguridad</div>
            <AccountSecurityMenu role="entrenador" />
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarPerfilEntrenador;
