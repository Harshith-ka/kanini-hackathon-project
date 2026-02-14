import { useState, useEffect } from 'react'
import { getAdminPatients, exportCSV, getSyntheticSummary, getModelInfo, retrainModel, regenerateSynthetic } from './api'
import { useLanguage } from './LanguageContext'
import { t } from './i18n'
import type { PatientResponse } from './types'

export default function Admin() {
  const { lang } = useLanguage()
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
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>{t(lang, 'admin')}</h1>

      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>{t(lang, 'modelInfo')}</h2>
        {modelInfo?.error ? (
          <div style={{ color: 'var(--text-muted)' }}>Model not trained yet</div>
        ) : (
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <span>{t(lang, 'modelVersion')}: {modelInfo?.version ?? '—'}</span>
            <span>{t(lang, 'modelAccuracy')}: {modelInfo?.test_accuracy != null ? `${(modelInfo.test_accuracy * 100).toFixed(1)}%` : '—'}</span>
            <span>Trained: {modelInfo?.trained_at ?? '—'}</span>
            <button type="button" onClick={handleRetrain} disabled={loading} style={{ padding: '6px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600 }}>
              {t(lang, 'retrain')}
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>{t(lang, 'syntheticSummary')}</h2>
        {syntheticSummary ? (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <span>Accuracy: {(syntheticSummary.test_accuracy ?? 0) * 100}%</span>
            <span>Total samples: {syntheticSummary.total_samples ?? 0}</span>
            {syntheticSummary.class_distribution && (
              <span>Classes: {JSON.stringify(syntheticSummary.class_distribution)}</span>
            )}
            <button type="button" onClick={handleRegenerateSynthetic} disabled={loading} style={{ padding: '6px 12px', background: 'var(--yellow)', color: '#000', border: 'none', borderRadius: 6, fontWeight: 600 }}>
              Regenerate dataset
            </button>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)' }}>No summary (train model first)</div>
        )}
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          {t(lang, 'filterByRisk')}:
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} style={{ marginLeft: 8, padding: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}>
            <option value="">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <button type="button" onClick={handleExport} style={{ padding: '8px 16px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600 }}>
          {t(lang, 'downloadCSV')}
        </button>
      </div>
      {error && <div style={{ color: 'var(--red)', marginBottom: 8 }}>{error}</div>}

      <div style={{ overflow: 'auto', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Risk</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Pri</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Dept</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Resp</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Pain</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Chronic</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Dur(h)</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {patients.slice(0, 100).map((p) => (
              <tr key={p.patient_id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 8 }}>{p.patient_id}</td>
                <td style={{ padding: 8 }}>{p.risk_level}</td>
                <td style={{ padding: 8 }}>{p.priority_score}</td>
                <td style={{ padding: 8 }}>{p.recommended_department}</td>
                <td style={{ padding: 8 }}>{p.respiratory_rate}</td>
                <td style={{ padding: 8 }}>{p.pain_score}</td>
                <td style={{ padding: 8 }}>{p.chronic_disease_count}</td>
                <td style={{ padding: 8 }}>{p.symptom_duration}</td>
                <td style={{ padding: 8 }}>{p.created_at?.slice(0, 19)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {patients.length > 100 && <div style={{ padding: 8, color: 'var(--text-muted)' }}>Showing first 100 of {patients.length}</div>}
      </div>
    </div>
  )
}
