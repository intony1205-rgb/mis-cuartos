import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

// ── Helpers ──────────────────────────────────────────────────────────
function parseDate(str) {
  if (!str) return null
  const [d, m, y] = str.split('/')
  if (!d || !m || !y) return null
  return new Date(Number(y), Number(m) - 1, Number(d))
}

function diasDesde(dateStr) {
  const fecha = parseDate(dateStr)
  if (!fecha) return null
  return Math.floor((new Date() - fecha) / (1000 * 60 * 60 * 24))
}

function isAlDia(ultimoPago) {
  const dias = diasDesde(ultimoPago)
  return dias !== null && dias <= 30
}

function mascaraFecha(val) {
  let v = val.replace(/\D/g, '').slice(0, 8)
  if (v.length >= 5) v = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4)
  else if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2)
  return v
}

// ── Summary Row (ahora con 4 tarjetas) ───────────────────────────────
function SummaryRow({ total, alDia, deuda, totalMeses }) {
  return (
    <div className="summary-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      <div className="summary-card total">
        <div className="summary-num">{total}</div>
        <div className="summary-lbl">Inquilinos</div>
      </div>
      <div className="summary-card ok">
        <div className="summary-num">{alDia}</div>
        <div className="summary-lbl">Al día</div>
      </div>
      <div className="summary-card warn">
        <div className="summary-num">{deuda}</div>
        <div className="summary-lbl">Adeudan</div>
      </div>
      <div className="summary-card" style={{ borderTop: '3px solid #7c3aed' }}>
        <div className="summary-num" style={{ color: '#7c3aed' }}>{totalMeses}</div>
        <div className="summary-lbl">Pagos totales</div>
      </div>
    </div>
  )
}

// ── Inquilino Card ────────────────────────────────────────────────────
function InquilinoCard({ inq, onEdit, onDelete }) {
  const aldia = isAlDia(inq.ultimo_pago)
  const dias  = diasDesde(inq.ultimo_pago)
  const meses = inq.total_pagos || 0

  return (
    <div className="card">
      <div className="card-top">
        <span className="room-tag">Cuarto {inq.cuarto}</span>
        <span className={`status-badge ${aldia ? 'status-ok' : 'status-warn'}`}>
          {aldia ? '✓ Al día' : '✗ Adeuda'}
        </span>
      </div>

      <div className="card-name">{inq.nombre}</div>

      {/* Badge de meses */}
      <div style={{ marginBottom: 12 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#f5f3ff', color: '#7c3aed',
          fontSize: 12, fontWeight: 700,
          padding: '5px 12px', borderRadius: 99,
          border: '1px solid #ddd6fe'
        }}>
          📅 {meses} {meses === 1 ? 'mes alquilado' : 'meses alquilados'}
        </span>
      </div>

      <div className="card-meta">
        <div className="meta-row">
          <span className="meta-label">Monto mensual</span>
          <span className="meta-val amount">S/ {Number(inq.monto).toFixed(2)}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Total acumulado</span>
          <span className="meta-val" style={{ color: '#7c3aed', fontWeight: 700 }}>
            S/ {(Number(inq.monto) * meses).toFixed(2)}
          </span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Último pago</span>
          <span className="meta-val">{inq.ultimo_pago || '—'}</span>
        </div>
        {dias !== null && (
          <div className="meta-row">
            <span className="meta-label">Días transcurridos</span>
            <span className={`meta-val ${aldia ? 'ok' : 'overdue'}`}>
              {dias} día{dias !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <div className="card-actions">
        <button className="btn-card btn-edit" onClick={() => onEdit(inq)}>
          ✏️ Registrar pago
        </button>
        <button className="btn-card btn-delete" onClick={() => onDelete(inq)}>
          🚪 Dar de baja
        </button>
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────
function EmptyState({ vista }) {
  const msgs = {
    todos: { icon: '🏘️', title: 'Sin inquilinos aún', sub: 'Agrega el primer inquilino con el botón de arriba.' },
    aldia: { icon: '✅', title: 'Nadie al día por ahora', sub: 'Los que pagaron en los últimos 30 días aparecerán aquí.' },
    deuda: { icon: '🎉', title: '¡Todo en orden!', sub: 'No hay inquilinos con pagos vencidos. ¡Excelente!' },
  }
  const m = msgs[vista] || msgs.todos
  return (
    <div className="empty">
      <div className="empty-icon">{m.icon}</div>
      <div className="empty-title">{m.title}</div>
      <div className="empty-sub">{m.sub}</div>
    </div>
  )
}

// ── Form Panel ────────────────────────────────────────────────────────
function FormPanel({ initial, onSave, onCancel, saving }) {
  const blank = { cuarto: '', nombre: '', monto: '', ultimo_pago: '' }
  const [form, setForm] = useState(
    initial
      ? { cuarto: initial.cuarto, nombre: initial.nombre, monto: String(initial.monto), ultimo_pago: initial.ultimo_pago }
      : blank
  )
  const [errors, setErrors] = useState({})
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.cuarto.trim())  e.cuarto      = 'Ingresa el número de cuarto'
    if (!form.nombre.trim())  e.nombre      = 'Ingresa el nombre completo'
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0)
                              e.monto       = 'Ingresa un monto válido'
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.ultimo_pago))
                              e.ultimo_pago = 'Formato: dd/mm/aaaa'
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave({ ...form, monto: Number(form.monto) })
  }

  const esEdicion = !!initial

  return (
    <div className="form-panel">
      <div className="form-title">
        {esEdicion ? '✏️ Registrar nuevo pago' : '➕ Nuevo inquilino'}
      </div>

      {esEdicion && (
        <div style={{
          background: '#f5f3ff', border: '1px solid #ddd6fe',
          borderRadius: 10, padding: '10px 14px', marginBottom: 20,
          fontSize: 13, color: '#6d28d9', display: 'flex', alignItems: 'center', gap: 8
        }}>
          📅 Al guardar, se sumará <strong>+1 mes</strong> al contador de <strong>{initial.nombre}</strong>
          {' '}(actualmente: {initial.total_pagos || 0} {(initial.total_pagos || 0) === 1 ? 'mes' : 'meses'})
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">N° de cuarto *</label>
          <input className="form-input mono" placeholder="101"
            value={form.cuarto} onChange={e => set('cuarto', e.target.value)} />
          {errors.cuarto && <p className="hint" style={{ color: '#dc2626' }}>{errors.cuarto}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Monto mensual (S/) *</label>
          <input className="form-input mono" placeholder="350" type="number" min="0"
            value={form.monto} onChange={e => set('monto', e.target.value)} />
          {errors.monto && <p className="hint" style={{ color: '#dc2626' }}>{errors.monto}</p>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Nombre completo *</label>
        <input className="form-input" placeholder="Ej: Ana Torres Quispe"
          value={form.nombre} onChange={e => set('nombre', e.target.value)} />
        {errors.nombre && <p className="hint" style={{ color: '#dc2626' }}>{errors.nombre}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">Fecha del pago *</label>
        <input className="form-input mono" placeholder="dd/mm/aaaa"
          value={form.ultimo_pago}
          onChange={e => set('ultimo_pago', mascaraFecha(e.target.value))}
          maxLength={10} />
        {errors.ultimo_pago
          ? <p className="hint" style={{ color: '#dc2626' }}>{errors.ultimo_pago}</p>
          : <p className="hint">Formato: día/mes/año — Ej: 15/03/2025</p>}
      </div>

      <div className="form-actions">
        <button className="btn-cancel" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button className="btn-submit" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Guardando...' : esEdicion ? '✓ Confirmar pago (+1 mes)' : 'Registrar inquilino'}
        </button>
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────
function Modal({ inquilino, onConfirm, onCancel, deleting }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-icon">🚪</div>
        <div className="modal-title">Dar de baja al inquilino</div>
        <div className="modal-body">
          ¿Confirmas que <span className="modal-highlight">{inquilino.nombre}</span> del
          cuarto <span className="modal-highlight">{inquilino.cuarto}</span> dejó la habitación?
          Esta acción eliminará su registro permanentemente.
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel} disabled={deleting}>Cancelar</button>
          <button className="btn-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Eliminando...' : 'Sí, dar de baja'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Toast({ msg, tipo }) {
  return <div className={`toast ${tipo}`}>{msg}</div>
}

function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#64748b', fontSize: 14 }}>Cargando inquilinos...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────
export default function App() {
  const [inquilinos, setInquilinos]     = useState([])
  const [vista, setVista]               = useState('todos')
  const [editData, setEditData]         = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast]               = useState(null)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [deleting, setDeleting]         = useState(false)
  const [error, setError]               = useState(null)

  const notify = useCallback((msg, tipo = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Cargar desde Supabase ──
  const cargarInquilinos = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('inquilinos')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      setError('No se pudo conectar. Revisa tu conexión a internet.')
      console.error(error)
    } else {
      setInquilinos(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { cargarInquilinos() }, [cargarInquilinos])

  // ── Guardar ──
  const handleSave = async (formData) => {
    setSaving(true)

    if (editData && editData.id) {
      // Registrar pago → suma 1 mes automáticamente
      const nuevoTotal = (editData.total_pagos || 0) + 1
      const { error } = await supabase
        .from('inquilinos')
        .update({
          cuarto:      formData.cuarto,
          nombre:      formData.nombre,
          monto:       formData.monto,
          ultimo_pago: formData.ultimo_pago,
          total_pagos: nuevoTotal,
        })
        .eq('id', editData.id)

      if (error) { notify('❌ Error al actualizar. Intenta de nuevo.', 'err') }
      else {
        notify(`✓ Pago registrado — ${nuevoTotal} ${nuevoTotal === 1 ? 'mes' : 'meses'} acumulados`)
        await cargarInquilinos()
        setEditData(null)
        setVista('todos')
      }
    } else {
      // Nuevo inquilino → empieza en 1 mes
      const { error } = await supabase
        .from('inquilinos')
        .insert([{
          cuarto:      formData.cuarto,
          nombre:      formData.nombre,
          monto:       formData.monto,
          ultimo_pago: formData.ultimo_pago,
          total_pagos: 1,
        }])

      if (error) { notify('❌ Error al registrar. Intenta de nuevo.', 'err') }
      else {
        notify('✓ Inquilino registrado (1er mes)')
        await cargarInquilinos()
        setEditData(null)
        setVista('todos')
      }
    }
    setSaving(false)
  }

  // ── Eliminar ──
  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase.from('inquilinos').delete().eq('id', deleteTarget.id)
    if (error) { notify('❌ Error al eliminar. Intenta de nuevo.', 'err') }
    else { notify(`🚪 ${deleteTarget.nombre} fue dado de baja`); await cargarInquilinos() }
    setDeleting(false)
    setDeleteTarget(null)
  }

  const openEdit   = (inq) => { setEditData(inq); setVista('form') }
  const openNew    = ()    => { setEditData(null); setVista('form') }
  const cancelForm = ()    => { setEditData(null); setVista('todos') }

  // ── Stats ──
  const total      = inquilinos.length
  const alDia      = inquilinos.filter(i => isAlDia(i.ultimo_pago)).length
  const deuda      = total - alDia
  const totalMeses = inquilinos.reduce((acc, i) => acc + (i.total_pagos || 0), 0)

  const listaMostrada = inquilinos.filter(i => {
    if (vista === 'aldia') return  isAlDia(i.ultimo_pago)
    if (vista === 'deuda') return !isAlDia(i.ultimo_pago)
    return true
  })

  const tabs = [
    { key: 'todos', label: 'Todos',   icon: '👥', badge: total, badgeCls: '' },
    { key: 'aldia', label: 'Al día',  icon: '✅', badge: alDia, badgeCls: '' },
    { key: 'deuda', label: 'Adeudan', icon: '⚠️', badge: deuda, badgeCls: 'warn' },
  ]

  return (
    <div className="app-shell">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon">🏠</div>
            <div>
              <div className="brand-name">MisCuartos</div>
              <div className="brand-tagline">Gestión de inquilinos</div>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-pill"><span className="stat-dot" style={{ background: '#4ade80' }} />{alDia} al día</div>
            <div className="stat-pill"><span className="stat-dot" style={{ background: '#f87171' }} />{deuda} adeudan</div>
            <div className="stat-pill"><span className="stat-dot" style={{ background: '#a78bfa' }} />{totalMeses} pagos</div>
          </div>
        </div>
      </header>

      <nav className="nav">
        <div className="nav-inner">
          {tabs.map(t => (
            <button key={t.key} className={`nav-btn ${vista === t.key ? 'active' : ''}`}
              onClick={() => { setEditData(null); setVista(t.key) }}>
              <span>{t.icon}</span><span>{t.label}</span>
              <span className={`nav-badge ${t.badgeCls}`}>{t.badge}</span>
            </button>
          ))}
          <button className={`nav-btn ${vista === 'form' ? 'active' : ''}`} onClick={openNew}>
            <span>➕</span><span>{editData ? 'Editando' : 'Registrar'}</span>
          </button>
        </div>
      </nav>

      <main className="main">
        {vista === 'form' && (
          <FormPanel initial={editData} onSave={handleSave} onCancel={cancelForm} saving={saving} />
        )}

        {vista !== 'form' && (
          <>
            <SummaryRow total={total} alDia={alDia} deuda={deuda} totalMeses={totalMeses} />

            <div className="section-hd">
              <div>
                <div className="section-title">
                  {vista === 'todos' && 'Todos los inquilinos'}
                  {vista === 'aldia' && 'Inquilinos al día'}
                  {vista === 'deuda' && 'Inquilinos que adeudan'}
                </div>
                <div className="section-sub">
                  {vista === 'aldia' && 'Pagaron dentro de los últimos 30 días'}
                  {vista === 'deuda' && 'Último pago fue hace más de 30 días'}
                  {vista === 'todos' && `${total} inquilino${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}`}
                </div>
              </div>
              <button className="btn-primary" onClick={openNew}><span>＋</span> Agregar</button>
            </div>

            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px', marginBottom: 20, color: '#991b1b', fontSize: 14 }}>
                ⚠️ {error}
                <button onClick={cargarInquilinos} style={{ marginLeft: 12, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}>
                  Reintentar
                </button>
              </div>
            )}

            {loading
              ? <Spinner />
              : listaMostrada.length === 0
                ? <EmptyState vista={vista} />
                : (
                  <div className="cards-grid">
                    {listaMostrada.map((inq, idx) => (
                      <div key={inq.id} style={{ animationDelay: `${idx * 50}ms` }}>
                        <InquilinoCard inq={inq} onEdit={openEdit} onDelete={setDeleteTarget} />
                      </div>
                    ))}
                  </div>
                )
            }
          </>
        )}
      </main>

      {deleteTarget && (
        <Modal inquilino={deleteTarget} onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)} deleting={deleting} />
      )}

      {toast && <Toast msg={toast.msg} tipo={toast.tipo} />}
    </div>
  )
}
