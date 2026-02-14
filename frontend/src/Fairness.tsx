import { useState, useEffect } from 'react'
import { getFairness } from './api'
import { useLanguage } from './LanguageContext'
import { t } from './i18n'
import type { FairnessData } from './api'

export default function Fairness() {
  const { lang } = useLanguage()
  const [data, setData] = useState<FairnessData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getFairness()
      .then(setData)
      .catch(() => setError('Failed to load fairness data'))
  }, [])

  useEffect(() => {
    const id = setInterval(() => getFairness().then(setData).catch(() => {}), 10000)
    return () => clearInterval(id)
  }, [])

  if (error) return <div style={{ color: 'var(--red)' }}>{error}</div>
  if (!data) return <div>Loading…</div>

  const { fairness_metrics, heatmap_data } = data
  const alert = fairness_metrics?.imbalance_alert

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>{t(lang, 'fairness')}</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{t(lang, 'fairnessHint')}</p>

      {alert && (
        <div style={{ padding: '1rem', background: 'rgba(248, 81, 73, 0.15)', border: '1px solid var(--red)', borderRadius: 8, marginBottom: '1.5rem' }}>
          <strong>{t(lang, 'imbalanceAlert')}:</strong> {alert}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={{ padding: '1.25rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Gender vs Risk (heatmap)</h2>
          {heatmap_data.gender.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>No data yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {heatmap_data.gender.map((row) => (
                <div key={row.group} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 80 }}>{row.group}</span>
                  <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                    <span style={{ padding: '4px 8px', background: 'var(--green)', borderRadius: 4, fontSize: 12 }} title="Low">{row.low}</span>
                    <span style={{ padding: '4px 8px', background: 'var(--yellow)', borderRadius: 4, fontSize: 12 }} title="Medium">{row.medium}</span>
                    <span style={{ padding: '4px 8px', background: 'var(--red)', borderRadius: 4, fontSize: 12 }} title="High">{row.high}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: '1.25rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Age group vs Risk (heatmap)</h2>
          {heatmap_data.age_group.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>No data yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {heatmap_data.age_group.map((row) => (
                <div key={row.group} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 80 }}>{row.group}</span>
                  <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                    <span style={{ padding: '4px 8px', background: 'var(--green)', borderRadius: 4, fontSize: 12 }}>{row.low}</span>
                    <span style={{ padding: '4px 8px', background: 'var(--yellow)', borderRadius: 4, fontSize: 12 }}>{row.medium}</span>
                    <span style={{ padding: '4px 8px', background: 'var(--red)', borderRadius: 4, fontSize: 12 }}>{row.high}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {fairness_metrics?.overall_high_risk_pct != null && (
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
          Overall high-risk rate: {fairness_metrics.overall_high_risk_pct}%
        </p>
      )}
    </div>
  )
}
