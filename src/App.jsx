import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

// ── Contraseña ────────────────────────────────────────────────────────
const APP_PASSWORD = '33595656'
const SESSION_KEY  = 'miscuartos_auth'

const MESES_NOMBRES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES_COMPLETOS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

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

function formatSoles(n) {
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Calcular ingresos por mes del año actual ──────────────────────────
function calcularIngresosPorMes(inquilinos) {
  const anioActual = new Date().getFullYear()
  const mesActual  = new Date().getMonth() // 0-11

  return Array.from({ length: 12 }, (_, mesIdx) => {
    // Solo mostrar hasta el mes actual
    if (mesIdx > mesActual) return { mes: MESES_NOMBRES[mesIdx], ingreso: null }

    // Sumar montos de inquilinos que ya estaban activos en ese mes
    const ingreso = inquilinos.reduce((acc, inq) => {
      const fechaCreacion = inq.created_at ? new Date(inq.created_at) : null
      if (!fechaCreacion) return acc + Number(inq.monto)
      const creadoAnio = fechaCreacion.getFullYear()
      const creadoMes  = fechaCreacion.getMonth()
      // Si el inquilino fue registrado antes o durante ese mes/año
      if (creadoAnio < anioActual || (creadoAnio === anioActual && creadoMes <= mesIdx)) {
        return acc + Number(inq.monto)
      }
      return acc
    }, 0)

    return { mes: MESES_NOMBRES[mesIdx], ingreso }
  })
}

// ── Gráfico de barras SVG ─────────────────────────────────────────────
function BarChart({ datos, mesActual }) {
  const validos  = datos.filter(d => d.ingreso !== null)
  const maxVal   = Math.max(...validos.map(d => d.ingreso), 1)
  const W = 580, H = 200, padL = 70, padB = 36, padT = 16, padR = 16
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const barW   = Math.min(36, (chartW / 12) - 8)

  // Líneas de referencia
  const ticks = 4
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => (maxVal / ticks) * i)

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto' }}>
        {/* Líneas de referencia */}
        {tickVals.map((v, i) => {
          const y = padT + chartH - (v / maxVal) * chartH
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y}
                stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,3" />
              <text x={padL - 8} y={y + 4} textAnchor="end"
                fontSize="10" fill="#94a3b8" fontFamily="DM Mono, monospace">
                {v >= 1000 ? (v/1000).toFixed(1)+'k' : v}
              </text>
            </g>
          )
        })}

        {/* Barras */}
        {datos.map((d, i) => {
          const slotW  = chartW / 12
          const cx     = padL + slotW * i + slotW / 2
          const esMesActual = i === mesActual
          const tieneData   = d.ingreso !== null && d.ingreso > 0

          const barH   = tieneData ? (d.ingreso / maxVal) * chartH : 0
          const barX   = cx - barW / 2
          const barY   = padT + chartH - barH

          return (
            <g key={i}>
              {/* Barra */}
              {tieneData && (
                <rect
                  x={barX} y={barY} width={barW} height={barH}
                  rx="5" ry="5"
                  fill={esMesActual ? '#0d9488' : '#93c5fd'}
                  opacity={d.ingreso === null ? 0.2 : 1}
                />
              )}
              {/* Barra vacía (meses futuros) */}
              {d.ingreso === null && (
                <rect
                  x={barX} y={padT} width={barW} height={chartH}
                  rx="5" ry="5" fill="#f1f5f9"
                />
              )}
              {/* Valor encima */}
              {tieneData && (
                <text x={cx} y={barY - 5} textAnchor="middle"
                  fontSize="9" fill={esMesActual ? '#0f766e' : '#64748b'}
                  fontFamily="DM Mono, monospace" fontWeight={esMesActual ? '700' : '400'}>
                  {d.ingreso >= 1000 ? (d.ingreso/1000).toFixed(1)+'k' : d.ingreso}
                </text>
              )}
              {/* Etiqueta mes */}
              <text x={cx} y={H - 6} textAnchor="middle"
                fontSize="10" fill={esMesActual ? '#0d9488' : '#94a3b8'}
                fontFamily="Sora, sans-serif" fontWeight={esMesActual ? '700' : '400'}>
                {d.mes}
              </text>
            </g>
          )
        })}

        {/* Eje Y */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#e2e8f0" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

// ── Vista Ingresos ────────────────────────────────────────────────────
function VistaIngresos({ inquilinos }) {
  const hoy        = new Date()
  const mesActual  = hoy.getMonth()
  const anioActual = hoy.getFullYear()

  const ingresoMensual = inquilinos.reduce((acc, i) => acc + Number(i.monto), 0)
  const ingresoAnual   = ingresoMensual * 12

  const datosMeses     = calcularIngresosPorMes(inquilinos)
  const ingresoEsteMes = datosMeses[mesActual]?.ingreso || 0

  // Proyección: cuánto falta para cerrar el año
  const mesesRestantes  = 11 - mesActual
  const proyeccionAnual = ingresoEsteMes * (mesActual + 1) + ingresoMensual * mesesRestantes

  return (
    <div>
      {/* Tarjetas principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>

        {/* Ingreso mensual */}
        <div style={{
          background: 'linear-gradient(135deg, #0f2540, #1a3a5c)',
          borderRadius: 16, padding: '24px 22px', color: '#fff',
          boxShadow: '0 8px 24px rgba(15,37,64,.25)'
        }}>
          <div style={{ fontSize: 12, color: '#93c5fd', fontWeight: 600, marginBottom: 8, letterSpacing: 0.5 }}>
            💰 INGRESO MENSUAL
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, fontFamily: "'DM Mono', monospace", letterSpacing: -1 }}>
            {formatSoles(ingresoMensual)}
          </div>
          <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 6 }}>
            {inquilinos.length} inquilino{inquilinos.length !== 1 ? 's' : ''} activo{inquilinos.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Ingreso anual proyectado */}
        <div style={{
          background: 'linear-gradient(135deg, #0d9488, #0f766e)',
          borderRadius: 16, padding: '24px 22px', color: '#fff',
          boxShadow: '0 8px 24px rgba(13,148,136,.25)'
        }}>
          <div style={{ fontSize: 12, color: '#99f6e4', fontWeight: 600, marginBottom: 8, letterSpacing: 0.5 }}>
            📈 PROYECCIÓN ANUAL {anioActual}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, fontFamily: "'DM Mono', monospace", letterSpacing: -1 }}>
            {formatSoles(proyeccionAnual)}
          </div>
          <div style={{ fontSize: 12, color: '#99f6e4', marginTop: 6 }}>
            Si se mantienen los inquilinos actuales
          </div>
        </div>

        {/* Este mes */}
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          borderRadius: 16, padding: '24px 22px', color: '#fff',
          boxShadow: '0 8px 24px rgba(124,58,237,.25)'
        }}>
          <div style={{ fontSize: 12, color: '#ddd6fe', fontWeight: 600, marginBottom: 8, letterSpacing: 0.5 }}>
            📅 {MESES_COMPLETOS[mesActual].toUpperCase()}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, fontFamily: "'DM Mono', monospace", letterSpacing: -1 }}>
            {formatSoles(ingresoEsteMes)}
          </div>
          <div style={{ fontSize: 12, color: '#ddd6fe', marginTop: 6 }}>
            Ingreso real del mes actual
          </div>
        </div>

      </div>

      {/* Gráfico */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
        padding: '22px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.06)', marginBottom: 24
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              Ingresos por mes — {anioActual}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              Basado en los inquilinos registrados cada mes
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b' }}>
              <span style={{ width: 12, height: 12, background: '#0d9488', borderRadius: 3, display: 'inline-block' }} />
              Mes actual
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b' }}>
              <span style={{ width: 12, height: 12, background: '#93c5fd', borderRadius: 3, display: 'inline-block' }} />
              Meses anteriores
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b' }}>
              <span style={{ width: 12, height: 12, background: '#f1f5f9', borderRadius: 3, border: '1px solid #e2e8f0', display: 'inline-block' }} />
              Por venir
            </div>
          </div>
        </div>
        <BarChart datos={datosMeses} mesActual={mesActual} />
      </div>

      {/* Aporte por inquilino */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
        padding: '22px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.06)'
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
          Aporte de cada inquilino
        </div>

        {inquilinos.length === 0
          ? <p style={{ color: '#94a3b8', fontSize: 14 }}>No hay inquilinos registrados aún.</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...inquilinos]
                .sort((a, b) => Number(b.monto) - Number(a.monto))
                .map(inq => {
                  const porcentaje = ingresoMensual > 0 ? (Number(inq.monto) / ingresoMensual) * 100 : 0
                  const aldia      = isAlDia(inq.ultimo_pago)
                  return (
                    <div key={inq.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 10,
                      background: '#f8fafc', border: '1px solid #f1f5f9'
                    }}>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              background: '#eff6ff', color: '#1d4ed8',
                              fontSize: 11, fontWeight: 700, padding: '2px 7px',
                              borderRadius: 5, fontFamily: "'DM Mono', monospace"
                            }}>
                              {inq.cuarto}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                              {inq.nombre}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700,
                              color: aldia ? '#16a34a' : '#dc2626',
                              background: aldia ? '#dcfce7' : '#fee2e2',
                              padding: '2px 8px', borderRadius: 99
                            }}>
                              {aldia ? '✓ Al día' : '✗ Adeuda'}
                            </span>
                            <span style={{
                              fontSize: 14, fontWeight: 700, color: '#0f2540',
                              fontFamily: "'DM Mono', monospace"
                            }}>
                              {formatSoles(inq.monto)}
                            </span>
                          </div>
                        </div>
                        {/* Barra de progreso */}
                        <div style={{ background: '#e2e8f0', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                          <div style={{
                            width: `${porcentaje}%`, height: '100%',
                            background: aldia ? '#0d9488' : '#f87171',
                            borderRadius: 99, transition: 'width .4s ease'
                          }} />
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                          {porcentaje.toFixed(1)}% del ingreso mensual · Anual: {formatSoles(Number(inq.monto) * 12)}
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )
        }
      </div>
    </div>
  )
}

// ── Login Screen ──────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pass, setPass]       = useState('')
  const [error, setError]     = useState(false)
  const [visible, setVisible] = useState(false)

  const handleLogin = () => {
    if (pass === APP_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1')
      onLogin()
    } else {
      setError(true)
      setPass('')
      setTimeout(() => setError(false), 2500)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f2540 0%, #1a3a5c 60%, #234b75 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: "'Sora', sans-serif"
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, padding: '40px 36px',
        width: '100%', maxWidth: 380,
        boxShadow: '0 24px 60px rgba(0,0,0,.3)',
        animation: 'fadeUp .4s ease'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 70, height: 70,
            background: 'linear-gradient(135deg, #0d9488, #0f766e)',
            borderRadius: 20, display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 34,
            boxShadow: '0 8px 20px rgba(13,148,136,.4)', marginBottom: 16
          }}>🏠</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f2540', letterSpacing: '-0.5px' }}>MisCuartos</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Ingresa tu contraseña para continuar</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              type={visible ? 'text' : 'password'}
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              autoFocus
              style={{
                width: '100%', padding: '12px 44px 12px 14px',
                border: `2px solid ${error ? '#dc2626' : '#e2e8f0'}`,
                borderRadius: 10, fontSize: 16,
                fontFamily: "'DM Mono', monospace", letterSpacing: 3,
                outline: 'none', background: error ? '#fff1f2' : '#fafafa',
                transition: 'border-color .2s', boxSizing: 'border-box'
              }}
            />
            <button onClick={() => setVisible(v => !v)} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8', padding: 0
            }}>
              {visible ? '🙈' : '👁️'}
            </button>
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 6, fontWeight: 500 }}>❌ Contraseña incorrecta.</p>}
        </div>

        <button onClick={handleLogin} style={{
          width: '100%', padding: 13,
          background: 'linear-gradient(135deg, #0d9488, #0f766e)',
          color: '#fff', border: 'none', borderRadius: 10,
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Sora', sans-serif",
          boxShadow: '0 4px 14px rgba(13,148,136,.4)'
        }}>
          Entrar →
        </button>
      </div>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}

// ── Summary Row ───────────────────────────────────────────────────────
function SummaryRow({ total, alDia, deuda, totalMeses }) {
  return (
    <div className="summary-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      <div className="summary-card total"><div className="summary-num">{total}</div><div className="summary-lbl">Inquilinos</div></div>
      <div className="summary-card ok"><div className="summary-num">{alDia}</div><div className="summary-lbl">Al día</div></div>
      <div className="summary-card warn"><div className="summary-num">{deuda}</div><div className="summary-lbl">Adeudan</div></div>
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
        <span className={`status-badge ${aldia ? 'status-ok' : 'status-warn'}`}>{aldia ? '✓ Al día' : '✗ Adeuda'}</span>
      </div>
      <div className="card-name">{inq.nombre}</div>
      <div style={{ marginBottom: 12 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#f5f3ff', color: '#7c3aed', fontSize: 12, fontWeight: 700,
          padding: '5px 12px', borderRadius: 99, border: '1px solid #ddd6fe'
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
          <span className="meta-val" style={{ color: '#7c3aed', fontWeight: 700 }}>S/ {(Number(inq.monto) * meses).toFixed(2)}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Último pago</span>
          <span className="meta-val">{inq.ultimo_pago || '—'}</span>
        </div>
        {dias !== null && (
          <div className="meta-row">
            <span className="meta-label">Días transcurridos</span>
            <span className={`meta-val ${aldia ? 'ok' : 'overdue'}`}>{dias} día{dias !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
      <div className="card-actions">
        <button className="btn-card btn-edit" onClick={() => onEdit(inq)}>✏️ Registrar pago</button>
        <button className="btn-card btn-delete" onClick={() => onDelete(inq)}>🚪 Dar de baja</button>
      </div>
    </div>
  )
}

function EmptyState({ vista }) {
  const msgs = {
    todos: { icon: '🏘️', title: 'Sin inquilinos aún', sub: 'Agrega el primer inquilino con el botón de arriba.' },
    aldia: { icon: '✅', title: 'Nadie al día por ahora', sub: 'Los que pagaron en los últimos 30 días aparecerán aquí.' },
    deuda: { icon: '🎉', title: '¡Todo en orden!', sub: 'No hay inquilinos con pagos vencidos.' },
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
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0) e.monto = 'Ingresa un monto válido'
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.ultimo_pago)) e.ultimo_pago = 'Formato: dd/mm/aaaa'
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
      <div className="form-title">{esEdicion ? '✏️ Registrar nuevo pago' : '➕ Nuevo inquilino'}</div>
      {esEdicion && (
        <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#6d28d9' }}>
          📅 Al guardar se sumará <strong>+1 mes</strong> a <strong>{initial.nombre}</strong>
          {' '}(actualmente: {initial.total_pagos || 0} {(initial.total_pagos || 0) === 1 ? 'mes' : 'meses'})
        </div>
      )}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">N° de cuarto *</label>
          <input className="form-input mono" placeholder="101" value={form.cuarto} onChange={e => set('cuarto', e.target.value)} />
          {errors.cuarto && <p className="hint" style={{ color: '#dc2626' }}>{errors.cuarto}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Monto mensual (S/) *</label>
          <input className="form-input mono" placeholder="350" type="number" min="0" value={form.monto} onChange={e => set('monto', e.target.value)} />
          {errors.monto && <p className="hint" style={{ color: '#dc2626' }}>{errors.monto}</p>}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Nombre completo *</label>
        <input className="form-input" placeholder="Ej: Ana Torres Quispe" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
        {errors.nombre && <p className="hint" style={{ color: '#dc2626' }}>{errors.nombre}</p>}
      </div>
      <div className="form-group">
        <label className="form-label">Fecha del pago *</label>
        <input className="form-input mono" placeholder="dd/mm/aaaa" value={form.ultimo_pago}
          onChange={e => set('ultimo_pago', mascaraFecha(e.target.value))} maxLength={10} />
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

function Modal({ inquilino, onConfirm, onCancel, deleting }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-icon">🚪</div>
        <div className="modal-title">Dar de baja al inquilino</div>
        <div className="modal-body">
          ¿Confirmas que <span className="modal-highlight">{inquilino.nombre}</span> del
          cuarto <span className="modal-highlight">{inquilino.cuarto}</span> dejó la habitación?
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

function Toast({ msg, tipo }) { return <div className={`toast ${tipo}`}>{msg}</div> }

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
  const [autenticado, setAutenticado]   = useState(false)
  const [inquilinos, setInquilinos]     = useState([])
  const [vista, setVista]               = useState('todos')
  const [editData, setEditData]         = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast]               = useState(null)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [deleting, setDeleting]         = useState(false)
  const [error, setError]               = useState(null)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') setAutenticado(true)
  }, [])

  const notify = useCallback((msg, tipo = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const cargarInquilinos = useCallback(async () => {
    setLoading(true); setError(null)
    const { data, error } = await supabase.from('inquilinos').select('*').order('created_at', { ascending: true })
    if (error) { setError('No se pudo conectar. Revisa tu conexión.') }
    else { setInquilinos(data || []) }
    setLoading(false)
  }, [])

  useEffect(() => { if (autenticado) cargarInquilinos() }, [autenticado, cargarInquilinos])

  const handleSave = async (formData) => {
    setSaving(true)
    if (editData && editData.id) {
      const nuevoTotal = (editData.total_pagos || 0) + 1
      const { error } = await supabase.from('inquilinos')
        .update({ cuarto: formData.cuarto, nombre: formData.nombre, monto: formData.monto, ultimo_pago: formData.ultimo_pago, total_pagos: nuevoTotal })
        .eq('id', editData.id)
      if (error) { notify('❌ Error al actualizar.', 'err') }
      else { notify(`✓ Pago registrado — ${nuevoTotal} meses`); await cargarInquilinos(); setEditData(null); setVista('todos') }
    } else {
      const { error } = await supabase.from('inquilinos')
        .insert([{ cuarto: formData.cuarto, nombre: formData.nombre, monto: formData.monto, ultimo_pago: formData.ultimo_pago, total_pagos: 1 }])
      if (error) { notify('❌ Error al registrar.', 'err') }
      else { notify('✓ Inquilino registrado'); await cargarInquilinos(); setEditData(null); setVista('todos') }
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase.from('inquilinos').delete().eq('id', deleteTarget.id)
    if (error) { notify('❌ Error al eliminar.', 'err') }
    else { notify(`🚪 ${deleteTarget.nombre} fue dado de baja`); await cargarInquilinos() }
    setDeleting(false); setDeleteTarget(null)
  }

  const handleLogout = () => { sessionStorage.removeItem(SESSION_KEY); setAutenticado(false); setInquilinos([]) }
  const openEdit     = (inq) => { setEditData(inq); setVista('form') }
  const openNew      = ()    => { setEditData(null); setVista('form') }
  const cancelForm   = ()    => { setEditData(null); setVista('todos') }

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
    { key: 'todos',    label: 'Todos',    icon: '👥', badge: total, badgeCls: '' },
    { key: 'aldia',    label: 'Al día',   icon: '✅', badge: alDia, badgeCls: '' },
    { key: 'deuda',    label: 'Adeudan',  icon: '⚠️', badge: deuda, badgeCls: 'warn' },
    { key: 'ingresos', label: 'Ingresos', icon: '💰', badge: null,  badgeCls: '' },
  ]

  if (!autenticado) return <LoginScreen onLogin={() => setAutenticado(true)} />

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
            <button onClick={handleLogout} style={{
              background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)',
              borderRadius: 99, padding: '5px 12px', color: '#e2e8f0',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'Sora', sans-serif"
            }}>🔒 Salir</button>
          </div>
        </div>
      </header>

      <nav className="nav">
        <div className="nav-inner">
          {tabs.map(t => (
            <button key={t.key} className={`nav-btn ${vista === t.key ? 'active' : ''}`}
              onClick={() => { setEditData(null); setVista(t.key) }}>
              <span>{t.icon}</span><span>{t.label}</span>
              {t.badge !== null && <span className={`nav-badge ${t.badgeCls}`}>{t.badge}</span>}
            </button>
          ))}
          <button className={`nav-btn ${vista === 'form' ? 'active' : ''}`} onClick={openNew}>
            <span>➕</span><span>{editData ? 'Editando' : 'Registrar'}</span>
          </button>
        </div>
      </nav>

      <main className="main">
        {vista === 'form' && <FormPanel initial={editData} onSave={handleSave} onCancel={cancelForm} saving={saving} />}

        {vista === 'ingresos' && (
          loading ? <Spinner /> : <VistaIngresos inquilinos={inquilinos} />
        )}

        {vista !== 'form' && vista !== 'ingresos' && (
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
                <button onClick={cargarInquilinos} style={{ marginLeft: 12, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}>Reintentar</button>
              </div>
            )}
            {loading ? <Spinner />
              : listaMostrada.length === 0 ? <EmptyState vista={vista} />
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

      {deleteTarget && <Modal inquilino={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} />}
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} />}
    </div>
  )
}
