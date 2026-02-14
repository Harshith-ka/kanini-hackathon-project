import { useState, useEffect } from 'react'
import { getDashboard, getDepartmentStatus, getPatients, addSimulatedPatient, simulationSpike, registerPatient, dischargePatient } from './api'
import type { DashboardData, DepartmentStatus, PatientResponse } from './types'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [patients, setPatients] = useState<PatientResponse[]>([])
  const [departments, setDepartments] = useState<DepartmentStatus[]>([])
  const [error, setError] = useState<string | null>(null)
  const [simLoading, setSimLoading] = useState(false)
  const [showRegModal, setShowRegModal] = useState(false)
  const [regForm, setRegForm] = useState({ full_name: '', email: '', age: '', gender: 'male', phone: '' })
  const [regResult, setRegResult] = useState<{ username: string; temporary_password: string } | null>(null)

  const navigate = useNavigate()

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
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '1.5rem', alignItems: 'start' }}>

      {/* Left Column: Metrics & Queue */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Summary Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Total Patients</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <div style={{ fontSize: 32, fontWeight: 800 }}>{total_patients_today}</div>
              <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 700, padding: '2px 8px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #dcfce7' }}>+12%</div>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Critical Risk</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--critical)' }}>{high_risk_count}</div>
              <span style={{ fontSize: 24, opacity: 0.8 }}>🚨</span>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Urgent Care</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--warning)' }}>{medium_risk_count}</div>
              <span style={{ fontSize: 24, opacity: 0.8 }}>⚠️</span>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Stable</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--success)' }}>{low_risk_count}</div>
              <span style={{ fontSize: 24, opacity: 0.8 }}>✅</span>
            </div>
          </div>
        </div>

        {/* Real-time Triage Queue */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfdfe' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Live Triage Queue</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Filter Patient ID..."
                  style={{ width: 200, padding: '8px 12px 8px 36px', fontSize: 13, borderRadius: 10, border: '1px solid var(--border)', outline: 'none', background: '#fff' }}
                />
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>🔍</span>
              </div>
              <button
                onClick={() => setShowRegModal(true)}
                style={{ padding: '8px 20px', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, cursor: 'pointer' }}
              >
                Register Patient
              </button>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Patient ID</th>
                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Risk Indicator</th>
                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Assessment</th>
                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Clinical Symptoms</th>
                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Destination</th>
                <th style={{ padding: '12px 24px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.025em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 32, marginBottom: 16 }}>📁</div>
                    <div style={{ fontWeight: 600 }}>No active triage records found.</div>
                    <div style={{ fontSize: 12 }}>Use simulation to populate clinical data.</div>
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.patient_id} style={{ borderBottom: '1px solid var(--border)', background: p.risk_level === 'high' ? '#fff1f2' : 'transparent' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--accent)' }}>#{p.patient_id.split('-').pop()}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 800, minWidth: 20 }}>{p.priority_score}</span>
                        <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                          <div style={{
                            width: `${p.priority_score}%`, height: '100%',
                            background: p.risk_level === 'high' ? 'var(--critical)' : p.risk_level === 'medium' ? 'var(--warning)' : 'var(--success)'
                          }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                        background: p.risk_level === 'high' ? '#fee2e2' : p.risk_level === 'medium' ? '#fef3c7' : '#dcfce7',
                        color: p.risk_level === 'high' ? '#991b1b' : p.risk_level === 'medium' ? '#92400e' : '#166534',
                        border: `1px solid ${p.risk_level === 'high' ? '#fecaca' : p.risk_level === 'medium' ? '#fde68a' : '#bbf7d0'}`
                      }}>{p.risk_level}</span>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-muted)', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.symptoms.join(', ')}
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 600 }}>{p.recommended_department}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button onClick={() => navigate('/add')} style={{ padding: '6px 12px', borderRadius: 6, background: '#fff', border: '1px solid var(--border)', fontSize: 11, color: '#475569', fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => handleDischarge(p.patient_id)} style={{ padding: '6px 12px', borderRadius: 6, background: '#fff', border: '1px solid #fecaca', fontSize: 11, color: '#dc2626', fontWeight: 700, cursor: 'pointer' }}>Discharge</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: 12, background: '#fcfdfe' }}>
            <div>Active Registry: <strong>{patients.length} patients</strong> monitored</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled style={{ padding: '6px 12px', borderRadius: 6, background: '#fff', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>Previous</button>
              <button disabled style={{ padding: '6px 12px', borderRadius: 6, background: '#fff', border: '1px solid var(--border)', color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>Next</button>
            </div>
          </div>
        </div>

        {/* Simulation Controls (Refined) */}
        <div className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderStyle: 'dashed' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Operational Simulation</h4>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Simulate clinical events to test department load balancing</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={async () => { setSimLoading(true); try { await addSimulatedPatient(1, false); refresh(); } finally { setSimLoading(false); } }}
              disabled={simLoading}
              style={{ padding: '8px 16px', background: '#fff', border: '1px solid var(--border)', borderRadius: 10, color: '#475569', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Add Case
            </button>
            <button
              onClick={async () => { setSimLoading(true); try { await simulationSpike(); refresh(); } finally { setSimLoading(false); } }}
              disabled={simLoading}
              style={{ padding: '8px 16px', background: '#dc2626', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 6px rgba(220, 38, 38, 0.2)' }}
            >
              Mass Casualty Spike
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Analytics Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Risk Distribution Chart */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: '1.5rem' }}>Risk Stratification</h3>
          <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 1.5rem' }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" strokeWidth="4" />
              <circle cx="18" cy="18" r="16" fill="none" stroke="var(--success)" strokeWidth="4" strokeDasharray={`${(risk_distribution.low / (total_patients_today || 1)) * 100} 100`} />
              <circle cx="18" cy="18" r="16" fill="none" stroke="var(--warning)" strokeWidth="4" strokeDasharray={`${(risk_distribution.medium / (total_patients_today || 1)) * 100} 100`} strokeDashoffset={`-${(risk_distribution.low / (total_patients_today || 1)) * 100}`} />
              <circle cx="18" cy="18" r="16" fill="none" stroke="var(--critical)" strokeWidth="4" strokeDasharray={`${(risk_distribution.high / (total_patients_today || 1)) * 100} 100`} strokeDashoffset={`-${((risk_distribution.low + risk_distribution.medium) / (total_patients_today || 1)) * 100}`} />
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{total_patients_today}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--critical)' }}></span>
                <span>Critical Risk</span>
              </div>
              <span style={{ fontWeight: 800, color: '#475569' }}>{risk_distribution.high}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)' }}></span>
                <span>Urgent Care</span>
              </div>
              <span style={{ fontWeight: 800, color: '#475569' }}>{risk_distribution.medium}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }}></span>
                <span>Stable Cases</span>
              </div>
              <span style={{ fontWeight: 800, color: '#475569' }}>{risk_distribution.low}</span>
            </div>
          </div>
        </div>

        {/* Department Load */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: '1.5rem' }}>Department Utilization</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {departments.slice(0, 4).map((d) => (
              <div key={d.department}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6, fontWeight: 700 }}>
                  <span style={{ textTransform: 'uppercase', color: '#64748b' }}>{d.department}</span>
                  <span style={{ color: d.load_percentage > 85 ? 'var(--critical)' : '#0f172a' }}>{d.load_percentage}%</span>
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${d.load_percentage}%`, height: '100%',
                    background: d.load_percentage > 85 ? 'var(--critical)' : d.load_percentage > 60 ? 'var(--warning)' : 'var(--success)',
                    transition: 'width 0.8s ease-out'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      {showRegModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ width: 440, padding: '2.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Register New Patient</h2>
              <button onClick={() => { setShowRegModal(false); setRegResult(null); }} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {!regResult ? (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legal Full Name</label>
                  <input type="text" required value={regForm.full_name} onChange={e => setRegForm({ ...regForm, full_name: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 10, outline: 'none', fontSize: 14 }} placeholder="e.g. Alexander Pierce" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address (Login ID)</label>
                  <input type="email" required value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 10, outline: 'none', fontSize: 14 }} placeholder="name@example.com" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Age</label>
                    <input type="number" required value={regForm.age} onChange={e => setRegForm({ ...regForm, age: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 10, outline: 'none', fontSize: 14 }} placeholder="35" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Biological Sex</label>
                    <select value={regForm.gender} onChange={e => setRegForm({ ...regForm, gender: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 10, outline: 'none', fontSize: 14, background: '#fff' }}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <button type="submit" style={{ marginTop: '0.5rem', padding: '14px', background: 'var(--accent)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 15 }}>Create Secure Account</button>
              </form>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, background: '#dcfce7', borderRadius: '50%', color: '#166534', fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>✓</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: '0.5rem' }}>Account Provisioned</h3>
                <p style={{ fontSize: 14, color: '#64748b', marginBottom: '2rem' }}>Share these secure credentials with the patient.</p>
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: 12, textAlign: 'left', marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Login Identifier</div>
                  <div style={{ fontWeight: 700, marginBottom: 16, color: '#0f172a', fontSize: 15 }}>{regResult.username}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Secure Temp Password</div>
                  <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: 2, color: 'var(--accent)' }}>{regResult.temporary_password}</div>
                </div>
                <button onClick={() => { setShowRegModal(false); setRegResult(null); }} style={{ width: '100%', padding: '14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, color: '#475569', fontWeight: 800, cursor: 'pointer' }}>Close & Return</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
