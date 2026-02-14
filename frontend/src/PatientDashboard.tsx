import { useState, useEffect } from 'react'
import { getPatientDashboard } from './api'
import { PatientResponse } from './types'
import { useLanguage } from './LanguageContext'
import { t } from './i18n'

export default function PatientDashboard() {
    const { lang } = useLanguage()
    const [data, setData] = useState<{
        has_record: boolean;
        record?: PatientResponse;
        queue_position: number;
        estimated_wait_minutes: number;
        user_profile: { full_name: string; email: string };
        message?: string;
    } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getPatientDashboard()
            .then(setData)
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>Initializing Patient Portal...</div>

    if (!data?.has_record || !data.record) {
        return (
            <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', maxWidth: 600, margin: '2rem auto' }}>
                <div style={{ fontSize: 48, marginBottom: '2rem' }}>🕒</div>
                <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: '1rem', color: '#0f172a' }}>{t(lang, 'assessmentInProgress')}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6, marginBottom: '2.5rem' }}>
                    {data?.message || t(lang, 'analyzing')}
                </p>
                <div style={{ display: 'inline-block', padding: '12px 24px', background: '#f8fafc', borderRadius: 12, border: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>
                    Current Status: <span style={{ color: 'var(--warning)', textTransform: 'uppercase' }}>{t(lang, 'analyzing')}</span>
                </div>
            </div>
        )
    }

    const { record, queue_position, estimated_wait_minutes } = data
    const riskColor = record.risk_level === 'high' ? 'var(--critical)' : record.risk_level === 'medium' ? 'var(--warning)' : 'var(--success)'

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', animation: 'fadeIn 0.6s ease-out' }}>
            {/* Top Banner: Clinical Summary */}
            <div className="glass-card" style={{ padding: '2.5rem 3.5rem', borderLeft: `12px solid ${riskColor}`, background: 'rgba(255,255,255,0.7)', transition: 'transform 0.4s' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3rem' }}>
                    {[
                        { label: t(lang, 'risk'), val: record.risk_level.toUpperCase(), color: riskColor, sub: 'AI Verified' },
                        { label: t(lang, 'priority'), val: `#${queue_position}`, color: '#0f172a', sub: 'Live Queue' },
                        { label: t(lang, 'estimatedWait'), val: `${estimated_wait_minutes}m`, color: 'var(--accent)', sub: 'To Physician' },
                        { label: t(lang, 'confidence'), val: `${record.confidence_score}%`, color: '#0f172a', sub: 'Neural Precision' }
                    ].map((m, i) => (
                        <div key={i}>
                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.08em' }}>{m.label}</div>
                            <div style={{ fontSize: 32, fontWeight: 900, color: m.color, letterSpacing: '-0.02em' }}>{m.val}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginTop: 4 }}>{m.sub}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '2rem' }}>
                {/* Left Column: Health Insights */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Section 1: Vital Diagnostics */}
                    <div className="glass-card" style={{ padding: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🩺</span>
                                {t(lang, 'vitalDiagnostics')}
                            </h3>
                            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--success)', background: 'rgba(16, 185, 129, 0.08)', padding: '4px 10px', borderRadius: 6 }}>ENCRYPTED DATA</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                            {[
                                { label: t(lang, 'heartRate'), value: `${record.heart_rate}`, unit: 'BPM', status: record.heart_rate > 100 || record.heart_rate < 60 ? 'Abnormal' : 'Stable' },
                                { label: t(lang, 'bpSystolic'), value: `${record.blood_pressure_systolic}/${record.blood_pressure_diastolic}`, unit: 'mmHg', status: record.blood_pressure_systolic > 140 ? 'Elevated' : 'Stable' },
                                { label: t(lang, 'spo2'), value: `${record.spo2}`, unit: '%', status: record.spo2 < 95 ? 'Critical' : 'Stable' },
                                { label: 'Resp. Rate', value: `${record.respiratory_rate}`, unit: 'BPM', status: record.respiratory_rate > 20 ? 'High' : 'Stable' },
                                { label: t(lang, 'temperature'), value: `${record.temperature}`, unit: '°F', status: record.temperature > 99 ? 'Febrile' : 'Stable' },
                                { label: 'Pain Score', value: `${record.pain_score}`, unit: '/10', status: record.pain_score > 6 ? 'Severe' : 'Low' },
                            ].map(v => (
                                <div key={v.label} className="status-item" style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', transition: 'all 0.3s' }}>
                                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>{v.label}</div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                                        <span style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{v.value}</span>
                                        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>{v.unit}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: v.status === 'Stable' || v.status === 'Low' ? 'var(--success)' : 'var(--critical)' }}></span>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: v.status === 'Stable' || v.status === 'Low' ? 'var(--success)' : 'var(--critical)' }}>{v.status.toUpperCase()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Section 2: AI Reasoning Summary */}
                    <div className="glass-card" style={{ padding: '2.5rem' }}>
                        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🧬</span>
                            {t(lang, 'clinicalAssessment')}
                        </h3>
                        <div style={{ padding: '2rem', background: 'linear-gradient(to bottom right, #f8fafc, #fff)', borderRadius: 20, border: '1px solid #e2e8f0', lineHeight: 1.8, fontSize: 16, color: '#334155', fontStyle: 'italic', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                            "{record.reasoning_summary || record.explainability?.department_reasoning || "Clinical assessment pending detailed review."}"
                        </div>
                    </div>
                </div>

                {/* Right Column: Routing & Guidance */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Destination Card */}
                    <div className="glass-card" style={{ background: 'var(--accent)', color: '#fff', padding: '2rem' }}>
                        <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>{t(lang, 'assignedSector')}</h3>
                        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{record.recommended_department}</div>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, marginBottom: '2rem' }}>Please follow the clinical signage to your assigned medical unit for further intake.</p>
                        <button style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>{t(lang, 'navigateFacility')}</button>
                    </div>

                    {/* Contributing Factors */}
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: '1.25rem' }}>{t(lang, 'primaryRiskDrivers')}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {record.explainability?.top_contributing_features?.slice(0, 3).map((f, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{f.name}</span>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: f.impact === 'High' ? 'var(--critical)' : 'var(--warning)' }}>{f.impact.toUpperCase()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Report Export */}
                    <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', background: '#f8fafc', borderStyle: 'dashed' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                        <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800 }}>Clinical Assessment PDF</h4>
                        <p style={{ fontSize: 11, color: '#64748b', marginBottom: '1.25rem' }}>{t(lang, 'downloadRecords')}</p>
                        <button onClick={() => window.print()} style={{ width: '100%', padding: '10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{t(lang, 'exportReport')}</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
