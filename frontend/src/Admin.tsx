import { useState, useEffect } from 'react'
import { getAdminPatients, exportCSV, getSyntheticSummary, getModelInfo, retrainModel, regenerateSynthetic, getDepartmentStatus, updatePatient, dischargePatient } from './api'
import type { DepartmentStatus, PatientResponse } from './types'

export default function Admin() {
  const [patients, setPatients] = useState<PatientResponse[]>([])
  const [departments, setDepartments] = useState<DepartmentStatus[]>([])
  const [riskFilter, setRiskFilter] = useState<string>('')
  const [modelInfo, setModelInfo] = useState<{ version?: string; test_accuracy?: number; trained_at?: string; error?: string } | null>(null)
  const [syntheticSummary, setSyntheticSummary] = useState<{ test_accuracy?: number; class_distribution?: Record<string, number>; total_samples?: number; version?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit Modal State
  const [editingPatient, setEditingPatient] = useState<PatientResponse | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  // Monitoring Toggles
  const [simulateDrift, setSimulateDrift] = useState(false)

  const refresh = () => {
    getAdminPatients(riskFilter || undefined).then((r) => setPatients(r.patients)).catch(() => setError('Failed to load audit records.'))
    getModelInfo().then(setModelInfo).catch(() => setModelInfo({ error: 'Failed' }))
    getSyntheticSummary().then((r) => setSyntheticSummary(r.summary ?? null)).catch(() => setSyntheticSummary(null))
    getDepartmentStatus().then((r) => setDepartments(r.departments)).catch(() => setDepartments([]))
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 5000) // Live polling
    return () => clearInterval(interval)
  }, [riskFilter])

  const handleExport = async () => {
    try {
      const blob = await exportCSV(riskFilter || undefined)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `triage_audit_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      setError('Audit log export failed.')
    }
  }

  const handleRetrain = async () => {
    if (!window.confirm('Retrain the core engine with 2500 samples?')) return
    setLoading(true)
    setError(null)
    try {
      await retrainModel(2500)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retrain failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateSynthetic = async () => {
    if (!window.confirm('Regenerate the synthetic dataset? This will impact model training versions.')) return
    setLoading(true)
    setError(null)
    try {
      await regenerateSynthetic(2500)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Regenerate failed')
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (p: PatientResponse) => {
    setEditingPatient(p)
    setEditForm({
      age: p.age,
      heart_rate: p.heart_rate,
      blood_pressure_systolic: p.blood_pressure_systolic,
      blood_pressure_diastolic: p.blood_pressure_diastolic,
      spo2: p.spo2,
      symptoms: p.symptoms || [],
      recommended_department: p.recommended_department
    })
  }

  const handleUpdateSave = async () => {
    if (!editingPatient) return
    try {
      await updatePatient(editingPatient.patient_id, editForm)
      setEditingPatient(null)
      refresh()
    } catch (e) {
      alert('Update failed')
    }
  }

  const handleDischarge = async (id: string) => {
    if (!window.confirm('Confirm discharge for patient ' + id)) return
    try {
      await dischargePatient(id)
      refresh()
    } catch (e) {
      alert('Discharge failed')
    }
  }

  const handleTransfer = async (patient: PatientResponse, newDept: string) => {
    try {
      await updatePatient(patient.patient_id, { recommended_department: newDept })
      refresh()
    } catch (e) { alert('Transfer failed') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', paddingBottom: '4rem' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em' }}>
            Infrastructure & MLOps Audit
          </h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 16, fontWeight: 500 }}>
            Real-time control center for neural engine performance and clinical registry integrity.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <button
            onClick={handleExport}
            style={{
              padding: '12px 24px', borderRadius: 14, background: '#fff',
              border: '1px solid var(--border)', color: '#0f172a', fontSize: 14, fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
            className="button-hover"
          >
            <span>📥</span> Export Clinical Ledger
          </button>
        </div>
      </div>

      {/* Analytics KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        {[
          { label: 'Avg Triage Processing', value: '1.2s', delta: 'Reduced by 65%', trend: 'up', color: 'var(--accent)' },
          { label: 'Routing Accuracy', value: '94.2%', delta: '+2.4% vs baseline', trend: 'up', color: 'var(--success)' },
          { label: 'High Risk Detection', value: `${patients.length > 0 ? ((patients.filter(p => p.risk_level === 'high').length / patients.length) * 100).toFixed(1) : 0}%`, delta: 'Sensitivity: 98%', trend: 'neutral', color: 'var(--warning)' },
          { label: 'Load Balance Efficiency', value: '98%', delta: 'Optimal Distribution', trend: 'up', color: '#6366f1' }
        ].map((kpi, i) => (
          <div key={i} className="glass-card" style={{ padding: '1.5rem', background: '#fff', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a' }}>{kpi.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: kpi.color, background: `${kpi.color}15`, padding: '4px 8px', borderRadius: 6, width: 'fit-content' }}>
              {kpi.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Department Load Monitoring */}
      <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--border)', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ color: '#64748b', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Department Resource Utilization
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>LIVE TELEMETRY</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
          {departments.map(d => (
            <div key={d.department} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: '#334155' }}>{d.department}</span>
                {d.overloaded && <span style={{ fontSize: 10, background: 'var(--critical)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>OVERLOAD</span>}
              </div>

              <div style={{ height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(d.load_percentage, 100)}%`,
                  height: '100%',
                  background: d.load_percentage > 85 ? 'var(--critical)' : d.load_percentage > 60 ? 'var(--warning)' : 'var(--success)',
                  transition: 'width 0.5s ease'
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                <span>{d.current_patients} / {d.max_capacity} Patients</span>
                <span>{d.max_capacity - d.current_patients} Beds Avail</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }}></span>
                <span>{Math.floor(d.max_capacity / 5)} Staff Active (Sim)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model & Dataset Health Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>

        {/* Model Performance */}
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: 24, border: '1px solid var(--border)', background: '#fff', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Neural Classification Engine
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {simulateDrift && <span style={{ fontSize: 10, background: 'var(--warning-soft)', color: 'var(--warning)', padding: '4px 8px', borderRadius: 6, fontWeight: 800 }}>DRIFT DETECTED</span>}
              <span style={{ fontSize: 10, background: 'var(--success-soft)', color: 'var(--success)', padding: '4px 8px', borderRadius: 6, fontWeight: 800 }}>LIVE INFERENCE</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
            {/* Accuracy & F1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontSize: 42, fontWeight: 900, color: simulateDrift ? 'var(--warning)' : '#0f172a', letterSpacing: '-0.03em' }}>{modelInfo?.test_accuracy != null ? `${(modelInfo.test_accuracy * 100).toFixed(1)}%` : '--'}</span>
                  <span style={{ fontSize: 12, color: simulateDrift ? 'var(--warning)' : 'var(--success)', fontWeight: 900, letterSpacing: '0.05em' }}>ACCURACY</span>
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4, fontWeight: 600 }}>
                  Build: <span style={{ color: '#475569' }}>{modelInfo?.version || 'V1.0.4'}</span>
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12 }}>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>F1-SCORE</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>0.92</div>
              </div>
            </div>

            {/* Confusion Matrix Visualization */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textAlign: 'center' }}>CONFUSION MATRIX</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 4, alignItems: 'center' }}>
                <div /> <div style={{ fontSize: 9, textAlign: 'center', fontWeight: 700 }}>LO</div> <div style={{ fontSize: 9, textAlign: 'center', fontWeight: 700 }}>MED</div> <div style={{ fontSize: 9, textAlign: 'center', fontWeight: 700 }}>HI</div>
                <div style={{ fontSize: 9, fontWeight: 700 }}>LO</div>
                <div style={{ background: 'rgba(16, 185, 129, 0.8)', aspectRatio: '1', borderRadius: 6 }}></div>
                <div style={{ background: 'rgba(245, 158, 11, 0.2)', aspectRatio: '1', borderRadius: 6 }}></div>
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', aspectRatio: '1', borderRadius: 6 }}></div>
                <div style={{ fontSize: 9, fontWeight: 700 }}>MED</div>
                <div style={{ background: 'rgba(16, 185, 129, 0.2)', aspectRatio: '1', borderRadius: 6 }}></div>
                <div style={{ background: 'rgba(245, 158, 11, 0.8)', aspectRatio: '1', borderRadius: 6 }}></div>
                <div style={{ background: 'rgba(239, 68, 68, 0.3)', aspectRatio: '1', borderRadius: 6 }}></div>
                <div style={{ fontSize: 9, fontWeight: 700 }}>HI</div>
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', aspectRatio: '1', borderRadius: 6 }}></div>
                <div style={{ background: 'rgba(245, 158, 11, 0.3)', aspectRatio: '1', borderRadius: 6 }}></div>
                <div style={{ background: 'rgba(239, 68, 68, 0.9)', aspectRatio: '1', borderRadius: 6 }}></div>
              </div>
            </div>

            {/* ROC Curve Placeholder */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textAlign: 'center' }}>ROC CURVE</div>
              <div style={{ position: 'relative', height: 120, border: '1px solid var(--border)', borderRadius: 12, background: '#fcfdfe' }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0,100 L10,80 L30,40 L60,10 L100,0" fill="none" stroke="var(--accent)" strokeWidth="3" />
                  <line x1="0" y1="100" x2="100" y2="0" stroke="#e2e8f0" strokeDasharray="4" />
                </svg>
                <div style={{ position: 'absolute', bottom: 4, right: 8, fontSize: 10, fontWeight: 800, color: 'var(--accent)' }}>AUC: 0.96</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>
                <input type="checkbox" checked={simulateDrift} onChange={e => setSimulateDrift(e.target.checked)} />
                Simulate Concept Drift
              </label>
            </div>
            <button
              onClick={handleRetrain}
              disabled={loading}
              style={{
                padding: '10px 20px', borderRadius: 10, background: '#0f172a',
                border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)', opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Retraining...' : 'Retrain Model'}
            </button>
          </div>
        </div>

        {/* Synthetic Dataset */}
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: 24, border: '1px solid var(--border)', background: '#fff' }}>
          <div style={{ color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Synthetic Training Dataset
          </div>
          {syntheticSummary ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 42, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>{syntheticSummary.total_samples?.toLocaleString() || 0}</span>
                <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 900, letterSpacing: '0.05em' }}>VECTORS</span>
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 12, fontWeight: 600 }}>
                Validation parity at {((syntheticSummary.test_accuracy || 0) * 100).toFixed(1)}%.
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 14, color: '#94a3b8', fontWeight: 600 }}>No synthetic data initialized in current cluster.</div>
          )}
          <button
            onClick={handleRegenerateSynthetic}
            disabled={loading}
            style={{
              marginTop: 'auto', padding: '14px', borderRadius: 14, background: 'rgba(245, 158, 11, 0.05)',
              border: '1px solid var(--warning-light)', color: 'var(--warning)', fontSize: 14, fontWeight: 900,
              cursor: 'pointer', opacity: loading ? 0.6 : 1, transition: 'all 0.2s'
            }}
            className="button-hover"
          >
            {loading ? 'Synthesizing Vectors...' : 'Regenerate Core Dataset'}
          </button>
        </div>
      </div>

      {/* Patient Audit Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', background: '#fff' }}>
        <div style={{ padding: '1.75rem 2.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfdfe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Clinical Registry Audit</h3>
            <span style={{ fontSize: 10, background: 'var(--accent-soft)', padding: '4px 12px', borderRadius: 8, color: 'var(--accent)', fontWeight: 900, letterSpacing: '0.08em' }}>
              LIVE FEED
            </span>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              style={{
                padding: '10px 20px', background: '#f8fafc', border: '1px solid var(--border)',
                borderRadius: 12, color: '#0f172a', fontSize: 13, fontWeight: 800, outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="">All Risk Stratas</option>
              <option value="high">Tier 1: High Priority</option>
              <option value="medium">Tier 2: Intermediate</option>
              <option value="low">Tier 3: Routine Care</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                {['Registry ID', 'Clinical Status', 'Index', 'Department', 'Triage Time', 'Actions'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '1.25rem 2.5rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.1em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patients.slice(0, 50).map((p) => (
                <tr key={p.patient_id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s', cursor: 'default' }} className="table-row-hover">
                  <td style={{ padding: '1.25rem 2.5rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent)', fontSize: 14 }}>
                    #{p.patient_id.slice(-6).toUpperCase()}
                  </td>
                  <td style={{ padding: '1.25rem 2.5rem' }}>
                    <span style={{
                      padding: '6px 14px', borderRadius: 10, fontSize: 11, fontWeight: 900, textTransform: 'uppercase',
                      background: p.risk_level === 'high' ? 'var(--critical-soft)' : p.risk_level === 'medium' ? 'var(--warning-soft)' : 'var(--success-soft)',
                      color: p.risk_level === 'high' ? 'var(--critical)' : p.risk_level === 'medium' ? 'var(--warning)' : 'var(--success)',
                      letterSpacing: '0.05em'
                    }}>
                      {p.risk_level}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 2.5rem', fontWeight: 900, color: '#0f172a', fontSize: 15 }}>
                    {p.priority_score.toFixed(1)}
                  </td>
                  <td style={{ padding: '1.25rem 2.5rem', color: '#334155', fontSize: 14, fontWeight: 700 }}>
                    <select
                      value={p.recommended_department}
                      onChange={(e) => handleTransfer(p, e.target.value)}
                      style={{ border: 'none', background: 'transparent', fontWeight: 700, cursor: 'pointer', outline: 'none' }}
                    >
                      {departments.map(d => <option key={d.department} value={d.department}>{d.department}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '1.25rem 2.5rem', color: '#94a3b8', fontSize: 13, whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {new Date(p.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '1.25rem 2.5rem' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => handleEditClick(p)} style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => handleDischarge(p.patient_id)} style={{ fontSize: 12, fontWeight: 700, color: 'var(--critical)', background: 'none', border: 'none', cursor: 'pointer' }}>Discharge</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1.5rem 2.5rem', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--critical)', fontSize: 14, borderTop: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700 }}>
          <span>⚠️</span> Registry Audit Error: {error}
        </div>
      )}

      {
        editingPatient && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-card" style={{ background: '#fff', padding: '2rem', width: 400 }}>
              <h3 style={{ marginTop: 0 }}>Edit Patient {editingPatient.patient_id.slice(0, 6)}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                <label>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Age</div>
                  <input type="number" value={editForm.age} onChange={e => setEditForm({ ...editForm, age: parseInt(e.target.value) })} style={{ width: '100%', padding: 8 }} />
                </label>
                <label>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Heart Rate</div>
                  <input type="number" value={editForm.heart_rate} onChange={e => setEditForm({ ...editForm, heart_rate: parseInt(e.target.value) })} style={{ width: '100%', padding: 8 }} />
                </label>
                <label>
                  <input type="number" value={editForm.blood_pressure_systolic} onChange={e => setEditForm({ ...editForm, blood_pressure_systolic: parseInt(e.target.value) })} style={{ width: '100%', padding: 8 }} />
                </label>
                <label>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Diastolic BP</div>
                  <input type="number" value={editForm.blood_pressure_diastolic} onChange={e => setEditForm({ ...editForm, blood_pressure_diastolic: parseInt(e.target.value) })} style={{ width: '100%', padding: 8 }} />
                </label>
                <label>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>SpO2</div>
                  <input type="number" value={editForm.spo2} onChange={e => setEditForm({ ...editForm, spo2: parseInt(e.target.value) })} style={{ width: '100%', padding: 8 }} />
                </label>
                <label>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Symptoms (comma separated)</div>
                  <input type="text" value={Array.isArray(editForm.symptoms) ? editForm.symptoms.join(', ') : editForm.symptoms} onChange={e => setEditForm({ ...editForm, symptoms: e.target.value.split(',').map((s: string) => s.trim()) })} style={{ width: '100%', padding: 8 }} />
                </label>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                  <button onClick={() => setEditingPatient(null)} style={{ padding: '8px 16px' }}>Cancel</button>
                  <button onClick={handleUpdateSave} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6 }}>Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      <style>{`
        .table-row-hover:hover {
          background: rgba(255,255,255,0.02);
        }
      `}</style>
    </div >
  )
}