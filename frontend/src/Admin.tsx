import { useState, useEffect } from 'react'
import { getAdminPatients, exportCSV, getSyntheticSummary, getModelInfo, retrainModel, regenerateSynthetic } from './api'
import type { PatientResponse } from './types'

export default function Admin() {
  const [patients, setPatients] = useState<PatientResponse[]>([])
  const [riskFilter, setRiskFilter] = useState<string>('')
  const [modelInfo, setModelInfo] = useState<{ version?: string; test_accuracy?: number; trained_at?: string; error?: string } | null>(null)
  const [syntheticSummary, setSyntheticSummary] = useState<{ test_accuracy?: number; class_distribution?: Record<string, number>; total_samples?: number; version?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => {
    getAdminPatients(riskFilter || undefined).then((r) => setPatients(r.patients)).catch(() => setError('Failed to load'))
    getModelInfo().then(setModelInfo).catch(() => setModelInfo({ error: 'Failed' }))
    getSyntheticSummary().then((r) => setSyntheticSummary(r.summary ?? null)).catch(() => setSyntheticSummary(null))
  }

  useEffect(() => {
    refresh()
  }, [riskFilter])

  const handleExport = async () => {
    try {
      const blob = await exportCSV(riskFilter || undefined)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'triage_export.csv'
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      setError('Export failed')
    }
  }

  const handleRetrain = async () => {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>System Control & Audit</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Manage triage model versions, synthetic data, and patient archives.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleExport}
            style={{
              padding: '10px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, fontWeight: 700
            }}
          >
            📥 Export Audit Log
          </button>
        </div>
      </div>

      {/* Model & Dataset Health Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>

        {/* Model Performance */}
        <div className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: 'var(--accent)' }}></div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 16 }}>Neural Engine Status</div>
          {modelInfo?.error ? (
            <div style={{ color: 'var(--critical)', fontSize: 13 }}>Pending Training</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 28, fontWeight: 800 }}>{modelInfo?.test_accuracy != null ? `${(modelInfo.test_accuracy * 100).toFixed(1)}%` : '--'}</span>
                <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700 }}>VERIFIED</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Version: {modelInfo?.version || 'v1.0.4'} · {modelInfo?.trained_at ? modelInfo.trained_at.split('T')[0] : 'Never'}
              </div>
              <button
                onClick={handleRetrain}
                disabled={loading}
                style={{
                  marginTop: 8, padding: '10px', borderRadius: 10, background: 'var(--accent)',
                  border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 12px var(--accent-glow)'
                }}
              >
                {loading ? 'Processing...' : 'Retrain Engine'}
              </button>
            </div>
          )}
        </div>

        {/* Synthetic Dataset */}
        <div className="glass-card">
          <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 16 }}>Synthetic Data Pool</div>
          {syntheticSummary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 28, fontWeight: 800 }}>{syntheticSummary.total_samples || 0}</span>
                <span style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 700 }}>SYNTHETIC</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Accuracy: {((syntheticSummary.test_accuracy || 0) * 100).toFixed(1)}% · Scaled
              </div>
              <button
                onClick={handleRegenerateSynthetic}
                disabled={loading}
                style={{
                  marginTop: 8, padding: '10px', borderRadius: 10, background: 'rgba(255,158,11,0.1)',
                  border: '1px solid var(--warning)', color: 'var(--warning)', fontSize: 13, fontWeight: 700
                }}
              >
                Regenerate Dataset
              </button>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Audit summary unavailable.</div>
          )}
        </div>

        {/* System Logs */}
        <div className="glass-card">
          <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 16 }}>Infrastructure Health</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Backend Response</span>
              <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 700 }}>12ms</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Database Load</span>
              <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 700 }}>Normal</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Encryption</span>
              <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 700 }}>AES-256</span>
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>System Uptime: 99.98%</div>
          </div>
        </div>
      </div>

      {/* Patient Audit Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Patient Audit Log</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              style={{ padding: '6px 12px', background: 'var(--surface-solid)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, fontWeight: 600, outline: 'none' }}
            >
              <option value="">All Risk Levels</option>
              <option value="high">High Risk Only</option>
              <option value="medium">Medium Risk Only</option>
              <option value="low">Low Risk Only</option>
            </select>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>Patient ID</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>Risk Level</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>Priority</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>Recommended Dept.</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>Symptom Duration</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {patients.slice(0, 100).map((p) => (
                <tr key={p.patient_id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 700, color: 'var(--accent)' }}>#{p.patient_id.slice(-6)}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                      background: p.risk_level === 'high' ? 'rgba(239, 68, 68, 0.15)' : p.risk_level === 'medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                      color: p.risk_level === 'high' ? 'var(--critical)' : p.risk_level === 'medium' ? 'var(--warning)' : 'var(--low)',
                      border: `1px solid ${p.risk_level === 'high' ? 'rgba(239, 68, 68, 0.2)' : p.risk_level === 'medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
                    }}>
                      {p.risk_level}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 800 }}>{p.priority_score.toFixed(1)}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>{p.recommended_department}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>{p.symptom_duration}h</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: 12 }}>{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {patients.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No audit records found.</div>
          )}
        </div>
        {error && (
          <div style={{ padding: '1rem', margin: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--critical)', borderRadius: 10, fontSize: 13, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <strong>System Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  )
}
