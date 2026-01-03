import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCliente } from '../../api/endpoints'; // Asegúrate de que esta importación es correcta
import { User, Save, ChevronLeft, Camera, Mail, Lock, CheckCircle, AlertCircle } from 'lucide-react';

const EditarPerfil = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estado del formulario
  const [form, setForm] = useState({ 
    nombre: '', 
    apellido: '', 
    email: '', 
    fotoPerfil: '', 
    contraseña: '' 
  });

  // ✅ Estado para Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    const fetchData = async () => {
      const id = localStorage.getItem('clienteId');
      if (!id) return navigate('/auth/login');
      try {
        const data = await getCliente(id);
        setForm({
          nombre: data.nombre || '',
          apellido: data.apellido || '',
          email: data.email || '',
          fotoPerfil: data.fotoPerfil || '',
          contraseña: ''
        });
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchData();
  }, [navigate]);

  const handleChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // --- HELPER TOAST ---
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const id = localStorage.getItem('clienteId');
      
      // Mantenemos tu fetch original si no tienes el endpoint creado aún en la librería
      await fetch(`http://localhost:8080/api/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      showToast('Perfil actualizado correctamente', 'success');
      setTimeout(() => navigate('/cliente/dashboard'), 1500);
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

    content: { maxWidth: '800px', margin: '40px auto', padding: '0 20px' },
    
    mainCard: { background: '#0a0a0a', border: '1px solid #222', borderRadius: '24px', padding: '40px', position: 'relative', overflow:'hidden' },
    
    sectionTitle: { fontSize: '1.2rem', fontWeight: '800', color: 'white', marginBottom: '20px', display:'flex', alignItems:'center', gap:'10px', textTransform:'uppercase', letterSpacing:'1px' },
    
    // Grid System
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },
    grid1: { display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' },

    // Inputs
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { fontSize: '0.75rem', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' },
    input: { background: '#121212', border: '1px solid #333', color: 'white', padding: '14px', borderRadius: '12px', outline: 'none', fontSize: '0.95rem', transition: 'border 0.2s', width: '100%' },

    // Foto Section
    photoSection: { display: 'flex', alignItems: 'center', gap: '25px', marginBottom: '40px', padding: '20px', background: '#111', borderRadius: '16px', border: '1px solid #222' },
    avatarBox: { width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: '#1a1a1a', border: '2px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    
    // Toast
    toast: {
        position: 'fixed', top: '100px', right: '40px', zIndex: 9999,
        background: '#18181b',
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
            <button style={styles.backBtn} onClick={() => navigate('/cliente/dashboard')} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>
                <ChevronLeft size={18}/> CANCELAR
            </button>
            <div style={{color:'#666', fontWeight:'800', fontSize:'0.8rem', letterSpacing:'2px', textTransform:'uppercase'}}>PERFIL ATLETA</div>
            <button style={styles.saveBtn} onClick={handleSubmit} disabled={saving}>
                {saving ? 'GUARDANDO...' : <><Save size={20}/> GUARDAR</>}
            </button>
        </div>

        <div style={styles.content}>
            <div style={styles.mainCard}>
                
                {/* SECCIÓN FOTO */}
                <div style={styles.photoSection}>
                    <div style={styles.avatarBox}>
                        {form.fotoPerfil ? <img src={form.fotoPerfil} alt="avatar" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <User size={35} color="#555"/>}
                    </div>
                    <div style={{flex: 1}}>
                        <h3 style={{margin:'0 0 5px 0', fontSize:'1.1rem', fontWeight:'700'}}>Avatar</h3>
                        <p style={{margin:'0 0 15px 0', fontSize:'0.85rem', color:'#666'}}>Personaliza tu cuenta con una foto.</p>
                        <div style={styles.inputGroup}>
                            <div style={{position:'relative'}}>
                                <Camera size={18} color="#666" style={{position:'absolute', left:'14px', top:'14px'}}/>
                                <input 
                                    style={{...styles.input, paddingLeft:'45px'}} 
                                    placeholder="Pegar URL de la imagen..." 
                                    value={form.fotoPerfil} 
                                    onChange={e => handleChange('fotoPerfil', e.target.value)} 
                                    onFocus={e => e.target.style.borderColor = '#FACC15'} 
                                    onBlur={e => e.target.style.borderColor = '#333'}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* DATOS PERSONALES */}
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

                {/* CUENTA */}
                <div style={styles.grid1}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Correo Electrónico</label>
                        <div style={{position:'relative'}}>
                            <Mail size={18} color="#666" style={{position:'absolute', left:'14px', top:'14px'}}/>
                            <input style={{...styles.input, paddingLeft:'45px'}} placeholder="email@ejemplo.com" value={form.email} onChange={e => handleChange('email', e.target.value)} onFocus={e => e.target.style.borderColor = '#FACC15'} onBlur={e => e.target.style.borderColor = '#333'}/>
                        </div>
                    </div>
                </div>

                <div style={{height:'30px', borderTop:'1px solid #222', margin:'20px 0'}}></div>

                {/* SEGURIDAD */}
                <div style={styles.sectionTitle}><Lock size={20} color="#ef4444"/> Seguridad</div>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Nueva Contraseña</label>
                    <input 
                        type="password" 
                        style={styles.input} 
                        placeholder="Déjalo en blanco si no quieres cambiarla" 
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

export default EditarPerfil;