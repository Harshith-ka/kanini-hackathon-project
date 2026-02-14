import { useState, useEffect } from 'react'
import { getDashboard, getDepartmentStatus, getPatients, addSimulatedPatient, simulationSpike } from './api'
import type { DashboardData, DepartmentStatus, PatientResponse } from './types'

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [patients, setPatients] = useState<PatientResponse[]>([])
  const [departments, setDepartments] = useState<DepartmentStatus[]>([])
  const [error, setError] = useState<string | null>(null)
  const [simLoading, setSimLoading] = useState(false)

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

  if (error) return <div style={{ color: 'var(--red)' }}>{error}</div>
  if (!data) return <div>Loading dashboard…</div>

  const { total_patients_today, high_risk_count, medium_risk_count, low_risk_count, risk_distribution, department_distribution } = data
  const maxRisk = Math.max(risk_distribution.high, risk_distribution.medium, risk_distribution.low, 1)
  const deptEntries = Object.entries(department_distribution)
  const maxDept = Math.max(...deptEntries.map(([, n]) => n), 1)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.25rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Total patients today</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{total_patients_today}</div>
        </div>
        <div style={{ padding: '1.25rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--red)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>High risk</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--red)' }}>{high_risk_count}</div>
        </div>
        <div style={{ padding: '1.25rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--yellow)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Medium risk</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--yellow)' }}>{medium_risk_count}</div>
        </div>
        <div style={{ padding: '1.25rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--green)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Low risk</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--green)' }}>{low_risk_count}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={{ padding: '1.25rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Risk distribution</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 80 }}>High</span>
              <div style={{ flex: 1, height: 24, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(risk_distribution.high / maxRisk) * 100}%`, height: '100%', background: 'var(--red)', transition: 'width 0.3s' }} />
              </div>
              <span style={{ width: 40, textAlign: 'right' }}>{risk_distribution.high}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 80 }}>Medium</span>
              <div style={{ flex: 1, height: 24, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(risk_distribution.medium / maxRisk) * 100}%`, height: '100%', background: 'var(--yellow)', transition: 'width 0.3s' }} />
              </div>
              <span style={{ width: 40, textAlign: 'right' }}>{risk_distribution.medium}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 80 }}>Low</span>
              <div style={{ flex: 1, height: 24, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(risk_distribution.low / maxRisk) * 100}%`, height: '100%', background: 'var(--green)', transition: 'width 0.3s' }} />
              </div>
              <span style={{ width: 40, textAlign: 'right' }}>{risk_distribution.low}</span>
            </div>
          </div>
        </div>
        <div style={{ padding: '1.25rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Department distribution</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {deptEntries.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>No patients yet</div>
            ) : (
              deptEntries.map(([dept, count]) => (
                <div key={dept} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{dept}</span>
                  <div style={{ flex: 1, height: 24, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${(count / maxDept) * 100}%`, height: '100%', background: 'var(--accent)', opacity: 0.8, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ width: 40, textAlign: 'right' }}>{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Department load</h2>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-muted)' }}>Capacity and load %. If &gt;85%, patients may be routed to alternate department.</p>
        {departments.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {departments.map((d) => (
              <div
                key={d.department}
                style={{
                  padding: 10,
                  borderRadius: 6,
                  background: d.overloaded ? 'rgba(248, 81, 73, 0.15)' : 'var(--bg)',
                  border: `1px solid ${d.overloaded ? 'var(--red)' : 'var(--border)'}`,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{d.department}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.current_patients} / {d.max_capacity}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: d.overloaded ? 'var(--red)' : 'var(--text)' }}>{d.load_percentage}%</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Real-time simulation</h2>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-muted)' }}>Add simulated patients; dashboard updates live. Emergency spike adds 5 high-risk patients.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={simLoading}
            onClick={async () => {
              setSimLoading(true)
              try {
                await addSimulatedPatient(1, false)
                refresh()
              } finally {
                setSimLoading(false)
              }
            }}
            style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600 }}
          >
            Add 1 simulated patient
          </button>
          <button
            type="button"
            disabled={simLoading}
            onClick={async () => {
              setSimLoading(true)
              try {
                await simulationSpike()
                refresh()
              } finally {
                setSimLoading(false)
              }
            }}
            style={{ padding: '8px 16px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600 }}
          >
            Emergency spike (5 high-risk)
          </button>
        </div>
      </div>
      <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Priority queue (emergency fast-track)</h2>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-muted)' }}>Auto-sorted by priority score. Est. wait time by position and priority.</p>
        {patients.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>No patients yet. Add a patient or use simulation to see the queue.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {patients.map((p, i) => (
              <div
                key={p.patient_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 10,
                  background: p.risk_level === 'high' ? 'rgba(248, 81, 73, 0.1)' : p.risk_level === 'medium' ? 'rgba(210, 153, 34, 0.1)' : 'var(--bg)',
                  borderRadius: 6,
                  borderLeft: `4px solid ${p.risk_level === 'high' ? 'var(--red)' : p.risk_level === 'medium' ? 'var(--yellow)' : 'var(--green)'}`,
                }}
              >
                <span style={{ fontWeight: 600, minWidth: 28 }}>{i + 1}</span>
                <span style={{ fontWeight: 600, minWidth: 48 }}>{p.priority_score}</span>
                <span style={{ minWidth: 120 }}>{p.patient_id}</span>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, background: p.risk_level === 'high' ? 'var(--red)' : p.risk_level === 'medium' ? 'var(--yellow)' : 'var(--green)', color: '#fff' }}>{p.risk_level}</span>
                <span style={{ color: 'var(--text-muted)' }}>{p.recommended_department}</span>
                <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                  <span>Resp: {p.respiratory_rate}</span>
                  <span>Pain: {p.pain_score}</span>
                  <span>Chronic: {p.chronic_disease_count}</span>
                  <span>Dur: {p.symptom_duration}h</span>
                </span>
                {p.estimated_wait_minutes != null && (
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>~{p.estimated_wait_minutes} min wait</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
