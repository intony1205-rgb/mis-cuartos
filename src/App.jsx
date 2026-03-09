import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'miscuartos_v1'

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

const DEMO = [
  { id: 1, cuarto: '101', nombre: 'Ana Torres Quispe',    monto: 350, ultimoPago: '05/03/2025' },
  { id: 2, cuarto: '102', nombre: 'Pedro Rojas Mendoza',  monto: 400, ultimoPago: '01/02/2025' },
  { id: 3, cuarto: '103', nombre: 'Lucía Vargas Pérez',   monto: 320, ultimoPago: '28/02/2025' },
  { id: 4, cuarto: '104', nombre: 'Marco Díaz Salinas',   monto: 380, ultimoPago: '10/01/2025' },
]

// ── Sub-components ───────────────────────────────────────────────────
function SummaryRow({ total, alDia, deuda }) {
  return (
    <div className="summary-row">
      <div className="summary-card total">
        <div className="summary-num">{total}</div>
        <div className="summary-lbl">Total inquilinos</div>
      </div>
      <div className="summary-card ok">
        <div className="summary-num">{alDia}</div>
        <div className="summary-lbl">Al día</div>
      </div>
      <div className="summary-card warn">
        <div className="summary-num">{deuda}</div>
        <div className="summary-lbl">Adeudan</div>
      </div>
    </div>
  )
}

function InquilinoCard({ inq, onEdit, onDelete }) {
  const aldia = isAlDia(inq.ultimoPago)
  const dias   = diasDesde(inq.ultimoPago)

  return (
    <div className="card">
      <div className="card-top">
        <span className="room-tag">Cuarto {inq.cuarto}</span>
        <span className={`status-badge ${aldia ? 'status-ok' : 'status-warn'}`}>
          {aldia ? '✓ Al día' : '✗ Adeuda'}
        </span>
      </div>

      <div className="card-name">{inq.nombre}</div>

      <div className="card-meta">
        <div className="meta-row">
          <span className="meta-label">Monto mensual</span>
          <span className="meta-val amount">S/ {Number(inq.monto).toFixed(2)}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Último pago</span>
          <span className="meta-val">{inq.ultimoPago || '—'}</span>
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

function EmptyState({ vista }) {
  const msgs = {
    todos:  { icon: '🏘️', title: 'Sin inquilinos aún', sub: 'Agrega el primer inquilino con el botón de arriba.' },
    aldia:  { icon: '✅', title: 'Nadie al día por ahora', sub: 'Los inquilinos que pagaron en los últimos 30 días aparecerán aquí.' },
    deuda:  { icon: '🎉', title: '¡Todo en orden!', sub: 'No hay inquilinos con pagos vencidos. ¡Excelente!' },
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

function FormPanel({ initial, onSave, onCancel }) {
  const blank = { cuarto: '', nombre: '', monto: '', ultimoPago: '' }
  const [form, setForm] = useState(initial || blank)
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.cuarto.trim())  e.cuarto    = 'Ingresa el número de cuarto'
    if (!form.nombre.trim())  e.nombre    = 'Ingresa el nombre completo'
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0)
                              e.monto     = 'Ingresa un monto válido'
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.ultimoPago))
                              e.ultimoPago = 'Formato: dd/mm/aaaa'
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave({ ...form, monto: Number(form.monto) })
  }

  return (
    <div className="form-panel">
      <div className="form-title">
        {initial ? '✏️ Editar / Registrar pago' : '➕ Nuevo inquilino'}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">N° de cuarto *</label>
          <input
            className="form-input mono"
            placeholder="101"
            value={form.cuarto}
            onChange={e => set('cuarto', e.target.value)}
          />
          {errors.cuarto && <p className="hint" style={{color:'#dc2626'}}>{errors.cuarto}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Monto mensual (S/) *</label>
          <input
            className="form-input mono"
            placeholder="350"
            type="number"
            min="0"
            value={form.monto}
            onChange={e => set('monto', e.target.value)}
          />
          {errors.monto && <p className="hint" style={{color:'#dc2626'}}>{errors.monto}</p>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Nombre completo *</label>
        <input
          className="form-input"
          placeholder="Ej: Ana Torres Quispe"
          value={form.nombre}
          onChange={e => set('nombre', e.target.value)}
        />
        {errors.nombre && <p className="hint" style={{color:'#dc2626'}}>{errors.nombre}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">Última fecha de pago *</label>
        <input
          className="form-input mono"
          placeholder="dd/mm/aaaa"
          value={form.ultimoPago}
          onChange={e => set('ultimoPago', mascaraFecha(e.target.value))}
          maxLength={10}
        />
        {errors.ultimoPago
          ? <p className="hint" style={{color:'#dc2626'}}>{errors.ultimoPago}</p>
          : <p className="hint">Formato: día/mes/año — Ej: 15/03/2025</p>
        }
      </div>

      <div className="form-actions">
        <button className="btn-cancel" onClick={onCancel}>Cancelar</button>
        <button className="btn-submit" onClick={handleSubmit}>
          {initial ? 'Guardar cambios' : 'Registrar inquilino'}
        </button>
      </div>
    </div>
  )
}

function Modal({ inquilino, onConfirm, onCancel }) {
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
          <button className="btn-cancel" onClick={onCancel}>Cancelar</button>
          <button className="btn-danger" onClick={onConfirm}>Sí, dar de baja</button>
        </div>
      </div>
    </div>
  )
}

function Toast({ msg, tipo }) {
  return <div className={`toast ${tipo}`}>{msg}</div>
}

// ── Main App ─────────────────────────────────────────────────────────
export default function App() {
  const [inquilinos, setInquilinos] = useState([])
  const [vista, setVista]           = useState('todos')   // todos | aldia | deuda | form
  const [editData, setEditData]     = useState(null)       // null = nuevo
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast]           = useState(null)
  const [loaded, setLoaded]         = useState(false)

  // ── Persistencia localStorage ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      setInquilinos(raw ? JSON.parse(raw) : DEMO)
    } catch {
      setInquilinos(DEMO)
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(inquilinos)) } catch {}
    }
  }, [inquilinos, loaded])

  // ── Toast helper ──
  const notify = useCallback((msg, tipo = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ── CRUD ──
  const handleSave = (data) => {
    if (editData && editData.id) {
      setInquilinos(prev => prev.map(i => i.id === editData.id ? { ...i, ...data } : i))
      notify('✓ Registro actualizado correctamente')
    } else {
      setInquilinos(prev => [...prev, { id: Date.now(), ...data }])
      notify('✓ Inquilino registrado')
    }
    setEditData(null)
    setVista('todos')
  }

  const handleDelete = () => {
    setInquilinos(prev => prev.filter(i => i.id !== deleteTarget.id))
    notify(`🚪 ${deleteTarget.nombre} fue dado de baja`)
    setDeleteTarget(null)
  }

  const openEdit = (inq) => {
    setEditData(inq)
    setVista('form')
  }

  const openNew = () => {
    setEditData(null)
    setVista('form')
  }

  const cancelForm = () => {
    setEditData(null)
    setVista('todos')
  }

  // ── Filtros ──
  const total  = inquilinos.length
  const alDia  = inquilinos.filter(i => isAlDia(i.ultimoPago)).length
  const deuda  = total - alDia

  const listaMostrada = inquilinos.filter(i => {
    if (vista === 'aldia') return isAlDia(i.ultimoPago)
    if (vista === 'deuda') return !isAlDia(i.ultimoPago)
    return true
  })

  if (!loaded) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>
      <div style={{ width:40, height:40, border:'4px solid #e2e8f0', borderTop:'4px solid #0d9488',
        borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const tabs = [
    { key: 'todos', label: 'Todos',   icon: '👥', badge: total,  badgeCls: '' },
    { key: 'aldia', label: 'Al día',  icon: '✅', badge: alDia,  badgeCls: '' },
    { key: 'deuda', label: 'Adeudan', icon: '⚠️', badge: deuda,  badgeCls: 'warn' },
  ]

  return (
    <div className="app-shell">
      {/* HEADER */}
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
            <div className="stat-pill">
              <span className="stat-dot" style={{ background: '#4ade80' }} />
              {alDia} al día
            </div>
            <div className="stat-pill">
              <span className="stat-dot" style={{ background: '#f87171' }} />
              {deuda} adeudan
            </div>
          </div>
        </div>
      </header>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`nav-btn ${vista === t.key ? 'active' : ''}`}
              onClick={() => { setEditData(null); setVista(t.key) }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              <span className={`nav-badge ${t.badgeCls}`}>{t.badge}</span>
            </button>
          ))}
          <button
            className={`nav-btn ${vista === 'form' ? 'active' : ''}`}
            onClick={openNew}
          >
            <span>➕</span>
            <span>{editData ? 'Editando' : 'Registrar'}</span>
          </button>
        </div>
      </nav>

      {/* MAIN */}
      <main className="main">
        {/* ── FORM ── */}
        {vista === 'form' && (
          <FormPanel
            initial={editData}
            onSave={handleSave}
            onCancel={cancelForm}
          />
        )}

        {/* ── LIST VIEWS ── */}
        {vista !== 'form' && (
          <>
            <SummaryRow total={total} alDia={alDia} deuda={deuda} />

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
              <button className="btn-primary" onClick={openNew}>
                <span>＋</span> Agregar inquilino
              </button>
            </div>

            {listaMostrada.length === 0
              ? <EmptyState vista={vista} />
              : (
                <div className="cards-grid">
                  {listaMostrada.map((inq, idx) => (
                    <div key={inq.id} style={{ animationDelay: `${idx * 50}ms` }}>
                      <InquilinoCard
                        inq={inq}
                        onEdit={openEdit}
                        onDelete={setDeleteTarget}
                      />
                    </div>
                  ))}
                </div>
              )
            }
          </>
        )}
      </main>

      {/* MODAL ELIMINAR */}
      {deleteTarget && (
        <Modal
          inquilino={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* TOAST */}
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} />}
    </div>
  )
}
