import { useState, useEffect } from 'react'
import { getDashboard, getDepartmentStatus, getPatients, addSimulatedPatient, simulationSpike, registerPatient, dischargePatient } from './api'
import type { DashboardData, DepartmentStatus, PatientResponse } from './types'
import { useLanguage } from './LanguageContext'
import { t } from './i18n'
import { motion, AnimatePresence } from 'framer-motion'

export default function Dashboard() {
  const { lang } = useLanguage()
  const [data, setData] = useState<DashboardData | null>(null)
  const [patients, setPatients] = useState<PatientResponse[]>([])
  const [departments, setDepartments] = useState<DepartmentStatus[]>([])
  const [error, setError] = useState<string | null>(null)
  const [simLoading, setSimLoading] = useState(false)
  const [showRegModal, setShowRegModal] = useState(false)
  const [regForm, setRegForm] = useState({ full_name: '', email: '', username: '', age: '', gender: 'male', phone: '' })
  const [regResult, setRegResult] = useState<{ username: string; temporary_password: string } | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<PatientResponse | null>(null)



  const refresh = () => {
    getDashboard().then(setData).catch(() => setError('Failed to load dashboard'))
    getPatients().then((r) => setPatients(r.patients)).catch(() => { })
    getDepartmentStatus().then((r) => setDepartments(r.departments)).catch(() => setDepartments([]))
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await registerPatient({ ...regForm, age: parseInt(regForm.age) })
      setRegResult(res)
    } catch (err: any) {
      alert(err.message || 'Registration failed')
    }
  }

  const handleDischarge = async (id: string) => {
    if (window.confirm('Are you sure you want to discharge this patient?')) {
      try {
        await dischargePatient(id)
        refresh()
      } catch { }
    }
  }

  if (error) return <div style={{ color: 'var(--critical)', padding: '2rem', textAlign: 'center' }}>{error}</div>
  if (!data) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard…</div>

  const { total_patients_today, high_risk_count, medium_risk_count, low_risk_count, risk_distribution } = data

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '2rem', alignItems: 'start', animation: 'fadeIn 0.6s ease-out' }}>

      {/* Left Column: Metrics & Queue */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Summary Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
          {[
            { label: t(lang, 'totalPatients'), val: total_patients_today, trend: '+12%', color: 'var(--accent)', icon: '👥' },
            { label: t(lang, 'highRisk'), val: high_risk_count, trend: 'Priority', color: 'var(--critical)', icon: '🚨' },
            { label: t(lang, 'mediumRisk'), val: medium_risk_count, trend: 'Active', color: 'var(--warning)', icon: '⚠️' },
            { label: t(lang, 'lowRisk'), val: low_risk_count, trend: 'Normal', color: 'var(--success)', icon: '✅' }
          ].map((m, i) => (
            <div key={i} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{m.label}</div>
                <span style={{ fontSize: 18 }}>{m.icon}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: m.color }}>{m.val}</div>
                <div style={{ fontSize: 10, color: m.color, fontWeight: 800, padding: '2px 6px', background: 'rgba(0,0,0,0.03)', borderRadius: 6 }}>{m.trend}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Real-time Triage Queue */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{t(lang, 'priorityQueue')}</h3>
              <span style={{ fontSize: 10, background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 6, fontWeight: 800 }}>LIVE FEED</span>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Patient ID Search..."
                  style={{ width: 220, padding: '10px 16px 10px 40px', fontSize: 13, borderRadius: 12, border: '1px solid var(--border)', outline: 'none', background: '#fff' }}
                />
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
              </div>
              <button
                onClick={() => setShowRegModal(true)}
                style={{ padding: '10px 24px', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, borderRadius: 12, cursor: 'pointer', boxShadow: '0 4px 12px var(--accent-glow)' }}
              >
                + Register Patient
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>


              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.01)' }}>
                  <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '130px', whiteSpace: 'nowrap' }}>Patient ID</th>
                  <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '150px', whiteSpace: 'nowrap' }}>Clinical Status</th>
                  <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '160px', whiteSpace: 'nowrap' }}>Risk Indicator</th>
                  <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '200px', whiteSpace: 'nowrap' }}>Risk Factors</th>
                  <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '240px', whiteSpace: 'nowrap' }}>Symptoms</th>
                  <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '160px', whiteSpace: 'nowrap' }}>Assigned Dept</th>
                  <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', width: '220px', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>

              <tbody style={{ position: 'relative' }}>
                <AnimatePresence mode="popLayout">
                  {patients.length === 0 ? (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key="empty"
                    >
                      <td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No patients currently in queue</td>

                    </motion.tr>
                  ) : (
                    patients.map((p) => (
                      <motion.tr
                        key={p.patient_id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        style={{ borderBottom: '1px solid var(--border-light)', background: '#fff' }}
                        className="table-row-hover"
                      >
                        <td style={{ padding: '20px 24px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{p.patient_id.slice(0, 8)}...</td>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.risk_level === 'high' ? 'var(--critical)' : p.risk_level === 'medium' ? 'var(--warning)' : 'var(--success)' }}></div>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{p.risk_level.toUpperCase()}</span>
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{p.confidence_score}%</span>
                            <div style={{ width: 60, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${p.confidence_score}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                style={{ height: '100%', background: 'var(--accent)' }}
                              ></motion.div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {p.explainability?.top_contributing_features?.slice(0, 2).map((feat, idx) => (
                              <span key={idx} style={{ fontSize: 10, background: 'rgba(37, 99, 235, 0.05)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                                {feat.name}
                              </span>
                            )) || <span style={{ color: '#94a3b8', fontSize: 11 }}>N/A</span>}
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px', color: 'var(--text)', fontWeight: 600, fontSize: 13, overflow: 'hidden' }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {(p.symptoms || []).map(s => s.replace(/_/g, ' ')).join(', ')}
                          </div>
                        </td>

                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: '#334155' }}>{p.recommended_department}</div>
                        </td>
                        <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', minWidth: 180 }}>
                            <button onClick={() => setSelectedPatient(p)} style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--accent)', border: 'none', fontSize: 12, color: '#fff', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 10px var(--accent-glow)' }}>View Analysis</button>
                            <button onClick={() => handleDischarge(p.patient_id)} style={{ padding: '8px 14px', borderRadius: 10, background: '#fff', border: '1px solid #fee2e2', fontSize: 12, color: 'var(--critical)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>Discharge</button>
                          </div>
                        </td>

                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>


          <div style={{ padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: 12, background: 'rgba(0,0,0,0.01)' }}>
            <div style={{ fontWeight: 600 }}>Active Census: <strong>{patients.length} patients</strong> currently in triage</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button disabled style={{ padding: '8px 16px', borderRadius: 10, background: '#fff', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 11, fontWeight: 800 }}>Previous</button>
              <button disabled style={{ padding: '8px 16px', borderRadius: 10, background: '#fff', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 11, fontWeight: 800 }}>Next Page</button>
            </div>
          </div>
        </div>

        {/* Simulation Controls (Refined) */}
        <div className="glass-card" style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderStyle: 'dashed' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Operational Simulation Engine</h4>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Trigger clinical events to validate system resilience</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={async () => { setSimLoading(true); try { await addSimulatedPatient(1, false); refresh(); } finally { setSimLoading(false); } }}
              disabled={simLoading}
              style={{ padding: '10px 20px', background: '#fff', border: '1px solid var(--border)', borderRadius: 12, color: '#475569', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
            >
              Simulate Case
            </button>
            <button
              onClick={async () => { setSimLoading(true); try { await simulationSpike(); refresh(); } finally { setSimLoading(false); } }}
              disabled={simLoading}
              style={{ padding: '10px 20px', background: 'var(--critical)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
            >
              Mass Casualty Spike
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Analytics Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Risk Distribution Chart */}
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{t(lang, 'riskDistribution')}</div>
          <div style={{ position: 'relative', width: 200, height: 200, margin: '10px auto' }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" strokeWidth="4" />
              <circle cx="18" cy="18" r="16" fill="none" stroke="var(--success)" strokeWidth="4" strokeDasharray={`${(risk_distribution.low / (total_patients_today || 1)) * 100} 100`} />
              <circle cx="18" cy="18" r="16" fill="none" stroke="var(--warning)" strokeWidth="4" strokeDasharray={`${(risk_distribution.medium / (total_patients_today || 1)) * 100} 100`} strokeDashoffset={`-${(risk_distribution.low / (total_patients_today || 1)) * 100}`} />
              <circle cx="18" cy="18" r="16" fill="none" stroke="var(--critical)" strokeWidth="4" strokeDasharray={`${(risk_distribution.high / (total_patients_today || 1)) * 100} 100`} strokeDashoffset={`-${((risk_distribution.low + risk_distribution.medium) / (total_patients_today || 1)) * 100}`} />
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#0f172a' }}>{total_patients_today}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Census</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'High Priority', val: risk_distribution.high, color: 'var(--critical)' },
              { label: 'Urgent Care', val: risk_distribution.medium, color: 'var(--warning)' },
              { label: 'Stable Case', val: risk_distribution.low, color: 'var(--success)' }
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 4, height: 16, borderRadius: 2, background: r.color, boxShadow: `0 0 10px ${r.color}44` }}></div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>{r.label}</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Throughput Intelligence */}
        {data.throughput_metrics && (
          <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: 20, background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'flex', justifyContent: 'space-between' }}>
              <span>Throughput Intelligence</span>
              <span style={{ color: 'var(--success)' }}>● LIVE</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ padding: '1rem', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, marginBottom: 4 }}>AVG WAIT</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{data.throughput_metrics.avg_wait_time}<span style={{ fontSize: 10, color: '#64748b', marginLeft: 4 }}>MIN</span></div>
              </div>
              <div style={{ padding: '1rem', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, marginBottom: 4 }}>EFFICIENCY</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--accent)' }}>{data.throughput_metrics.efficiency_score}%</div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Capacity Utilization</span>
                <span style={{ color: '#0f172a' }}>{data.throughput_metrics.capacity_utilization}%</span>
              </div>
              <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${data.throughput_metrics.capacity_utilization}%`, height: '100%', background: 'var(--accent)', transition: 'width 1s ease-out' }}></div>
              </div>
            </div>

            <div style={{ padding: '12px', background: data.throughput_metrics.system_load === 'High' ? '#fee2e2' : '#f0fdf4', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{data.throughput_metrics.system_load === 'High' ? '🔥' : '⚙️'}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: data.throughput_metrics.system_load === 'High' ? '#b91c1c' : '#166534' }}>System Load: {data.throughput_metrics.system_load}</div>
                <div style={{ fontSize: 10, color: data.throughput_metrics.system_load === 'High' ? '#ef4444' : '#22c55e' }}>{data.throughput_metrics.system_load === 'High' ? 'Scaling resources recommended' : 'Operating within optimal limits'}</div>
              </div>
            </div>
          </div>
        )}


        {/* Department Load */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '2rem' }}>{t(lang, 'departmentDistribution')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {departments.slice(0, 4).map((d) => (
              <div key={d.department}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8, fontWeight: 700 }}>
                  <span style={{ textTransform: 'uppercase', color: '#64748b' }}>{d.department}</span>
                  <span style={{ color: d.load_percentage > 85 ? 'var(--critical)' : '#0f172a', fontWeight: 900 }}>{d.load_percentage}%</span>
                </div>
                <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${d.load_percentage}%`, height: '100%',
                    background: d.load_percentage > 85 ? 'var(--critical)' : d.load_percentage > 60 ? 'var(--warning)' : 'var(--success)',
                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: d.load_percentage > 85 ? '0 0 10px rgba(239, 68, 68, 0.3)' : 'none'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ width: 600, padding: '2.5rem', backgroundColor: '#fff', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Clinical Case File</h2>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>ID: {selectedPatient.patient_id}</div>
              </div>
              <button onClick={() => setSelectedPatient(null)} style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Demographics</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedPatient.age} yrs • {selectedPatient.gender}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Triage Level</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: selectedPatient.risk_level === 'high' ? 'var(--critical)' : selectedPatient.risk_level === 'medium' ? 'var(--warning)' : 'var(--success)', textTransform: 'uppercase' }}>{selectedPatient.risk_level}</div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: 12, marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>Vital Signs</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                {[
                  { l: 'HR', v: selectedPatient.heart_rate, u: 'bpm' },
                  { l: 'BP', v: `${selectedPatient.blood_pressure_systolic}/${selectedPatient.blood_pressure_diastolic}`, u: 'mmHg' },
                  { l: 'SpO2', v: selectedPatient.spo2, u: '%' },
                  { l: 'Temp', v: selectedPatient.temperature, u: '°F' },
                  { l: 'Resp', v: selectedPatient.respiratory_rate, u: '/min' },
                  { l: 'Pain', v: selectedPatient.pain_score, u: '/10' },
                ].map(v => (
                  <div key={v.l}>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{v.l}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{v.v} <span style={{ fontSize: 10, color: '#cbd5e1' }}>{v.u}</span></div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>AI Analysis</div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#334155' }}>{selectedPatient.reasoning_summary}</p>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
              <button onClick={() => { handleDischarge(selectedPatient.patient_id); setSelectedPatient(null); }} style={{ padding: '12px 24px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Discharge Patient</button>
              <button onClick={() => setSelectedPatient(null)} style={{ padding: '12px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal (Existing) */}
      {showRegModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ width: 460, padding: '3.5rem', backgroundColor: '#fff', boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.25)', animation: 'slideUp 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em' }}>Register New Patient</h2>
              <button onClick={() => { setShowRegModal(false); setRegResult(null); }} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 32, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {!regResult ? (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Patient Full Name</label>
                  <input type="text" required value={regForm.full_name} onChange={e => setRegForm({ ...regForm, full_name: e.target.value })} style={{ width: '100%', padding: '14px', border: '1px solid var(--border)', borderRadius: 12, outline: 'none', fontSize: 15, background: '#f8fafc' }} placeholder="e.g. John Doe" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email ID</label>
                    <input type="email" required value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} style={{ width: '100%', padding: '14px', border: '1px solid var(--border)', borderRadius: 12, outline: 'none', fontSize: 15, background: '#f8fafc' }} placeholder="patient@example.com" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Desired Username</label>
                    <input type="text" value={regForm.username} onChange={e => setRegForm({ ...regForm, username: e.target.value })} style={{ width: '100%', padding: '14px', border: '1px solid var(--border)', borderRadius: 12, outline: 'none', fontSize: 15, background: '#f8fafc' }} placeholder="Optional (Auto-generated if empty)" />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contact Number</label>
                  <input type="tel" value={regForm.phone} onChange={e => setRegForm({ ...regForm, phone: e.target.value })} style={{ width: '100%', padding: '14px', border: '1px solid var(--border)', borderRadius: 12, outline: 'none', fontSize: 15, background: '#f8fafc' }} placeholder="+1 (555) 000-0000" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Age</label>
                    <input type="number" required value={regForm.age} onChange={e => setRegForm({ ...regForm, age: e.target.value })} style={{ width: '100%', padding: '14px', border: '1px solid var(--border)', borderRadius: 12, outline: 'none', fontSize: 15, background: '#f8fafc' }} placeholder="42" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sex</label>
                    <select value={regForm.gender} onChange={e => setRegForm({ ...regForm, gender: e.target.value })} style={{ width: '100%', padding: '14px', border: '1px solid var(--border)', borderRadius: 12, outline: 'none', fontSize: 15, background: '#f8fafc' }}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <button type="submit" style={{ marginTop: '1rem', padding: '16px', background: 'var(--accent)', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 900, cursor: 'pointer', fontSize: 16, boxShadow: '0 10px 20px var(--accent-glow)' }}>Provision Account</button>
              </form>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 80, height: 80, background: 'var(--success)', borderRadius: '50%', color: '#fff', fontSize: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)' }}>✓</div>
                <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: '0.5rem', color: '#0f172a' }}>Access Granted</h3>
                <p style={{ fontSize: 15, color: '#64748b', marginBottom: '2.5rem' }}>Secure clinical credentials generated.</p>
                <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: 16, textAlign: 'left', marginBottom: '2.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</div>
                  <div style={{ fontWeight: 800, marginBottom: 20, color: '#0f172a', fontSize: 16 }}>{regResult?.username}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Phrase</div>
                  <div style={{ fontWeight: 900, fontSize: 26, letterSpacing: 3, color: 'var(--accent)', fontFamily: 'monospace' }}>{regResult?.temporary_password}</div>
                </div>
                <button onClick={() => { setShowRegModal(false); setRegResult(null); }} style={{ width: '100%', padding: '16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 12, color: '#475569', fontWeight: 900, cursor: 'pointer', fontSize: 15 }}>Complete Enrollment</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
