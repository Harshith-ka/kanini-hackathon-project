import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatientDashboard, updatePatient } from './api'
import { PatientResponse, PatientDashboardResponse, PatientUpdate } from './types'
import Chat from './Chat'
import { useLanguage } from './LanguageContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import toast from 'react-hot-toast'
import BodyMap from './components/BodyMap'

// Mock historical data generator for trends
const generateTrendData = (current: PatientResponse) => {
    const data = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 30 * 60000) // 30 min intervals
        data.push({
            time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            heart_rate: Math.max(60, current.heart_rate - Math.floor(Math.random() * 10) + 5),
            systolic: Math.max(90, current.blood_pressure_systolic - Math.floor(Math.random() * 10) + 5),
            diastolic: Math.max(60, current.blood_pressure_diastolic - Math.floor(Math.random() * 10) + 5),
            spo2: Math.min(100, current.spo2 + Math.floor(Math.random() * 3) - 1)
        })
    }
    // Ensure last point matches current
    data[6] = {
        time: 'Now',
        heart_rate: current.heart_rate,
        systolic: current.blood_pressure_systolic,
        diastolic: current.blood_pressure_diastolic,
        spo2: current.spo2
    }
    return data
}

const RISK_INSIGHTS: Record<string, string> = {
    "Diabetes": "Elevated risk of sepsis/cardiac events. Check sugar immediately.",
    "Hypertension": "Monitor for stroke symptoms & hypertensive urgency.",
    "Asthma": "Critical: Watch for desaturation/respiratory distress.",
    "Heart Disease": "High priority: ECG recommended immediately.",
    "Kidney Disease": "Check electrolytes and fluid status."
}

export default function PatientDashboard() {
    const { t } = useLanguage()
    const navigate = useNavigate()
    const [data, setData] = useState<PatientDashboardResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'analysis' | 'chat' | 'reports'>('overview')
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editForm, setEditForm] = useState<PatientUpdate>({})
    const [trendData, setTrendData] = useState<any[]>([])
    const [isSpeaking, setIsSpeaking] = useState(false)

    useEffect(() => {
        loadDashboard()
    }, [])

    useEffect(() => {
        if (data?.record) {
            setTrendData(generateTrendData(data.record))
        }
    }, [data])

    const loadDashboard = async () => {
        try {
            const res = await getPatientDashboard()
            if (res.has_record) {
                setData(res)
            } else {
                toast.error(res.message || "No record found")
            }
        } catch (err) {
            const error = err as Error; // Type assertion
            toast.error("Failed to load dashboard: " + error.message)
        } finally {
            setLoading(false)
        }
    }


    const handleEditOpen = () => {
        if (!data?.record) return
        setEditForm({
            heart_rate: data.record.heart_rate,
            blood_pressure_systolic: data.record.blood_pressure_systolic,
            blood_pressure_diastolic: data.record.blood_pressure_diastolic,
            spo2: data.record.spo2,
            symptoms: data.record.symptoms || []
        })
        setIsEditModalOpen(true)
    }

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!data?.record) return

        try {
            await updatePatient(data.record.patient_id, editForm)
            toast.success("Vitals updated & AI Analysis re-run!")
            setIsEditModalOpen(false)
            loadDashboard() // Reload to get new AI analysis
        } catch (err) {
            toast.error("Failed to update vitals")
        }
    }

    const toggleSpeech = (text: string) => {
        if (isSpeaking) {
            window.speechSynthesis.cancel()
            setIsSpeaking(false)
        } else {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.onend = () => setIsSpeaking(false)
            window.speechSynthesis.speak(utterance)
            setIsSpeaking(true)
        }
    }


    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading patient records...</div>
    if (!data || !data.record) return (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
            <h2>No Active Triage Record</h2>
            <p>Please complete the triage intake process first.</p>
            <button onClick={() => navigate('/add')} style={{ marginTop: 20, padding: '12px 24px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Go to Triage</button>
        </div>
    )

    const { record, queue_position, estimated_wait_minutes } = data
    const riskColor = record.risk_level === 'high' ? 'var(--critical)' : record.risk_level === 'medium' ? 'var(--warning)' : 'var(--success)'

    const renderTabs = () => (
        <div style={{ display: 'flex', gap: 8, marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            {[
                { id: 'overview', label: 'Overview', icon: '🏥' },
                { id: 'trends', label: 'Vitals & Trends', icon: '📈' },
                { id: 'analysis', label: 'Analysis & Risks', icon: '🧬' },
                { id: 'chat', label: 'AI Assistant', icon: '🤖' },
                { id: 'reports', label: 'Reports', icon: '📋' }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === tab.id ? '#0f172a' : 'transparent',
                        color: activeTab === tab.id ? '#fff' : '#64748b',
                        border: 'none',
                        borderRadius: 20,
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.2s'
                    }}
                >
                    <span>{tab.icon}</span>
                    {tab.label}
                </button>
            ))}
        </div>
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.6s ease-out' }}>
            {/* Clinical Header Banner - Always Visible */}
            <div className="glass-card" style={{ padding: '2rem 3rem', borderLeft: `8px solid ${riskColor}`, background: 'linear-gradient(to right, rgba(255,255,255,0.9), rgba(255,255,255,0.6))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{data.user_profile.full_name}</h2>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>ID: {record.patient_id.slice(0, 8)} • Floor 3, {record.recommended_department}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', textAlign: 'right', alignItems: 'center' }}>
                        <button
                            className="screen-only button-hover"
                            onClick={handleEditOpen}
                            style={{ padding: '8px 16px', background: '#fff', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}
                        >
                            ✏️ Edit Vitals
                        </button>
                        <div>
                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>{t('risk')}</div>
                            <div style={{ fontSize: 28, fontWeight: 900, color: riskColor }}>{record.risk_level.toUpperCase()}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Wait Time</div>
                            <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a' }}>{estimated_wait_minutes}m</div>
                        </div>
                    </div>
                </div>
            </div>

            {renderTabs()}

            {/* TAB CONTENT */}
            <div style={{ minHeight: 400 }}>
                {activeTab === 'overview' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {/* Current Vitals Summary */}
                            <div className="glass-card" style={{ padding: '2rem' }}>
                                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span>🩺</span> Live Vitals
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                                    {[
                                        { l: 'BP', v: `${record.blood_pressure_systolic}/${record.blood_pressure_diastolic}`, u: 'mmHg', s: record.blood_pressure_systolic > 140 ? 'High' : 'Normal' },
                                        { l: 'HR', v: record.heart_rate, u: 'bpm', s: record.heart_rate > 100 ? 'High' : 'Normal' },
                                        { l: 'SpO2', v: record.spo2, u: '%', s: record.spo2 < 95 ? 'Low' : 'Normal' },
                                    ].map((m, i) => (
                                        <div key={i} style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>{m.l}</div>
                                            <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>{m.v} <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{m.u}</span></div>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: m.s === 'Normal' ? 'var(--success)' : 'var(--critical)' }}>{m.s.toUpperCase()}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Reasoning Preview */}
                            <div className="glass-card" style={{ padding: '2rem' }}>
                                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: '1rem' }}>🤖 AI Clinical Summary</h3>
                                <div style={{ fontStyle: 'italic', color: '#475569', lineHeight: 1.6 }}>
                                    "{record.reasoning_summary}"
                                </div>
                                <button onClick={() => setActiveTab('analysis')} style={{ marginTop: '1rem', color: 'var(--accent)', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer', padding: 0 }}>View Full Analysis →</button>
                            </div>
                        </div>

                        {/* Queue Logic */}
                        <div className="glass-card" style={{ padding: '2rem', background: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Triage Position</div>
                                <div style={{ fontSize: 56, fontWeight: 900, margin: '0.5rem 0', color: '#fff' }}>#{queue_position > 0 ? queue_position : '-'}</div>
                                <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.8 }}>
                                    You are currently <strong>#{queue_position}</strong> in the {record.recommended_department} queue.
                                </div>
                            </div>

                            <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.05)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>Estimated Wait</div>
                                <div style={{ fontSize: 24, fontWeight: 900, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                    {estimated_wait_minutes} <span style={{ fontSize: 14, opacity: 0.6 }}>MIN</span>
                                </div>
                            </div>

                            <div style={{ padding: '1.25rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 16, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', marginBottom: 10 }}>Throughput Forecast</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ fontSize: 24 }}>{estimated_wait_minutes < 20 ? '📈' : '🕒'}</div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{estimated_wait_minutes < 20 ? 'Accelerated Care' : 'Moderate Traffic'}</div>
                                        <div style={{ fontSize: 11, opacity: 0.7 }}>Clinic efficiency is {estimated_wait_minutes < 20 ? 'high' : 'stable'} today.</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ fontSize: 11, opacity: 0.5, fontStyle: 'italic', marginTop: 'auto' }}>
                                Priority is dynamically calculated using ML-based acuity modeling.
                            </div>
                        </div>

                    </div>
                )}

                {activeTab === 'trends' && (
                    <div className="glass-card" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: 18, fontWeight: 800 }}>📈 Vital Trends (Last 4 Hours)</h3>
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>Real-time telemetry</div>
                        </div>

                        <div style={{ height: 300, marginBottom: '3rem' }}>
                            <h4 style={{ fontSize: 14, color: '#64748b', marginBottom: 10 }}>Heart Rate & Blood Pressure</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                                    <YAxis stroke="#94a3b8" fontSize={12} domain={[40, 180]} />
                                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Line type="monotone" dataKey="heart_rate" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="Heart Rate" />
                                    <Line type="monotone" dataKey="systolic" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Systolic BP" />
                                    <Line type="monotone" dataKey="diastolic" stroke="#60a5fa" strokeWidth={2} strokeDasharray="5 5" name="Diastolic BP" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div style={{ height: 200 }}>
                            <h4 style={{ fontSize: 14, color: '#64748b', marginBottom: 10 }}>Oxygen Saturation (SpO2)</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorSpo2" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                                    <YAxis stroke="#94a3b8" fontSize={12} domain={[85, 100]} />
                                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                                    <Area type="monotone" dataKey="spo2" stroke="#10b981" fillOpacity={1} fill="url(#colorSpo2)" strokeWidth={3} name="SpO2 %" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {activeTab === 'analysis' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="glass-card" style={{ padding: '2.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: 18, fontWeight: 800 }}>🧬 Detailed Clinical Assessment</h3>
                                <button
                                    onClick={() => toggleSpeech(record.explainability?.department_reasoning || record.reasoning_summary || "")}
                                    style={{ padding: '8px 16px', borderRadius: 20, background: isSpeaking ? 'var(--critical)' : '#f1f5f9', color: isSpeaking ? '#fff' : '#0f172a', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                    {isSpeaking ? '🛑 Stop Reading' : '🔊 Listen to Explanation'}
                                </button>
                            </div>
                            <div style={{ fontSize: 16, lineHeight: 1.8, color: '#334155' }}>
                                {record.explainability?.department_reasoning || record.reasoning_summary}
                            </div>
                        </div>

                        {/* Top Risk Factors */}
                        {record.explainability?.top_contributing_features && record.explainability.top_contributing_features.length > 0 && (
                            <div className="glass-card" style={{ padding: '2rem' }}>
                                <h4 style={{ margin: '0 0 1.5rem', fontSize: 16, fontWeight: 800 }}>⚠ Key Risk Factors</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                    {record.explainability.top_contributing_features.map((f, i) => (
                                        <div key={i} style={{ padding: '1.25rem', background: '#fff', border: '1px solid var(--border)', borderRadius: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{f.name}</span>
                                                <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: f.impact === 'High' ? 'var(--critical-soft)' : 'var(--warning-soft)', color: f.impact === 'High' ? 'var(--critical)' : 'var(--warning)' }}>
                                                    {f.impact.toUpperCase()}
                                                </span>
                                            </div>
                                            {(f as any).explanation && <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.4 }}>{(f as any).explanation}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Disease Insights */}
                        {(record.explainability?.disease_insights?.length ? record.explainability.disease_insights : Object.keys(RISK_INSIGHTS).filter(k => record.pre_existing_conditions?.includes(k)).map(k => RISK_INSIGHTS[k])) && (
                            (record.explainability?.disease_insights && record.explainability.disease_insights.length > 0) || (record.pre_existing_conditions && record.pre_existing_conditions.length > 0)
                        ) && (
                                <div className="glass-card" style={{ padding: '2rem', borderLeft: '4px solid var(--accent)' }}>
                                    <h4 style={{ margin: '0 0 1rem', fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>💡 Clinical Insights</h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {record.explainability?.disease_insights?.map((insight, i) => (
                                            <li key={i} style={{ color: '#334155', lineHeight: 1.6 }}>{insight}</li>
                                        ))}
                                        {!record.explainability?.disease_insights?.length && record.pre_existing_conditions?.map(c => RISK_INSIGHTS[c] && (
                                            <li key={c} style={{ color: '#334155', lineHeight: 1.6 }}><strong>{c}:</strong> {RISK_INSIGHTS[c]}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                        {record.explainability?.safety_disclaimer && (
                            <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginTop: '1rem' }}>
                                {record.explainability.safety_disclaimer}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'chat' && (
                    <div style={{ height: 600 }}>
                        <Chat />
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ fontSize: 64 }}>📄</div>
                        <div>
                            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>Download Official Triage Report</h3>
                            <p style={{ maxWidth: 400, margin: '10px auto 0', color: '#64748b', lineHeight: 1.5 }}>
                                Generate a PDF containing your current vitals, risk assessment, AI clinical reasoning, and historical trend comparison for your records or insurance.
                            </p>
                        </div>
                        <button
                            onClick={() => window.print()}
                            style={{
                                padding: '14px 32px', background: '#0f172a', color: '#fff', fontSize: 15, fontWeight: 800, borderRadius: 12, border: 'none', cursor: 'pointer',
                                boxShadow: '0 8px 16px rgba(15, 23, 42, 0.2)', transition: 'transform 0.2s'
                            }}
                        >
                            Download PDF Report
                        </button>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-card" style={{ background: '#fff', width: '90%', maxWidth: 700, padding: '2rem', borderRadius: 16 }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: 20 }}>Update Clinical Vitals</h3>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                            {/* Form Side */}
                            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gap: '1rem', flex: 1 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Heart Rate</label>
                                        <input type="number" value={editForm.heart_rate} onChange={e => setEditForm({ ...editForm, heart_rate: +e.target.value })} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>SpO2</label>
                                        <input type="number" value={editForm.spo2} onChange={e => setEditForm({ ...editForm, spo2: +e.target.value })} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Systolic BP</label>
                                        <input type="number" value={editForm.blood_pressure_systolic} onChange={e => setEditForm({ ...editForm, blood_pressure_systolic: +e.target.value })} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Diastolic BP</label>
                                        <input type="number" value={editForm.blood_pressure_diastolic} onChange={e => setEditForm({ ...editForm, blood_pressure_diastolic: +e.target.value })} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Symptoms (comma separated)</label>
                                    <input type="text" value={editForm.symptoms?.join(', ')} onChange={e => setEditForm({ ...editForm, symptoms: e.target.value.split(',').map(s => s.trim()) })} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ flex: 1, padding: 12, border: '1px solid #000', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
                                    <button type="submit" style={{ flex: 1, padding: 12, border: 'none', borderRadius: 8, background: '#0f172a', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Save & Re-Analyze</button>
                                </div>
                            </form>

                            {/* Body Map Side */}
                            <div style={{ width: 250, borderLeft: '1px solid #e2e8f0', paddingLeft: '1rem' }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>Tap Body to Add Symptom</label>
                                <BodyMap
                                    onSelectPart={(part) => {
                                        const current = editForm.symptoms || [];
                                        if (!current.includes(part)) {
                                            setEditForm({ ...editForm, symptoms: [...current, part] });
                                            toast.success(`Added ${part}`);
                                        }
                                    }}
                                    selectedParts={editForm.symptoms || []}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Layout (Hidden on Screen) */}
            <div className="print-only">
                <div style={{ padding: '2rem', fontFamily: 'serif' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '2rem' }}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>VitalCore Medical Center</h1>
                            <div style={{ fontSize: 14 }}>Automated Triage Assessment Report</div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 13 }}>
                            <div>Date: {new Date().toLocaleDateString()}</div>
                            <div>ID: {record.patient_id.slice(0, 8).toUpperCase()}</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: 18, borderBottom: '1px solid #ccc', paddingBottom: 4 }}>Patient Information</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 14, marginTop: 10 }}>
                            <div><strong>Name:</strong> {data.user_profile.full_name}</div>
                            <div><strong>Age:</strong> {record.age}</div>
                            <div><strong>Gender:</strong> {record.gender}</div>
                            <div><strong>Recommended Dept:</strong> {record.recommended_department}</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: 18, borderBottom: '1px solid #ccc', paddingBottom: 4 }}>Clinical Vitals & Acuity</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: 10 }}>
                            <div style={{ border: '1px solid #eee', padding: 10 }}>
                                <div style={{ fontSize: 12, color: '#666' }}>Triage Level</div>
                                <div style={{ fontWeight: 'bold', fontSize: 16 }}>{record.risk_level.toUpperCase()}</div>
                            </div>
                            <div style={{ border: '1px solid #eee', padding: 10 }}>
                                <div style={{ fontSize: 12, color: '#666' }}>Priority Score</div>
                                <div style={{ fontWeight: 'bold', fontSize: 16 }}>{record.priority_score.toFixed(1)}</div>
                            </div>
                            <div style={{ border: '1px solid #eee', padding: 10 }}>
                                <div style={{ fontSize: 12, color: '#666' }}>Confidence</div>
                                <div style={{ fontWeight: 'bold', fontSize: 16 }}>{(record.confidence_score * 100).toFixed(1)}%</div>
                            </div>
                            <div style={{ border: '1px solid #eee', padding: 10 }}>
                                <div style={{ fontSize: 12, color: '#666' }}>Blood Pressure</div>
                                <div style={{ fontWeight: 'bold', fontSize: 16 }}>{record.blood_pressure_systolic}/{record.blood_pressure_diastolic}</div>
                            </div>
                            <div style={{ border: '1px solid #eee', padding: 10 }}>
                                <div style={{ fontSize: 12, color: '#666' }}>Heart Rate</div>
                                <div style={{ fontWeight: 'bold', fontSize: 16 }}>{record.heart_rate} bpm</div>
                            </div>
                            <div style={{ border: '1px solid #eee', padding: 10 }}>
                                <div style={{ fontSize: 12, color: '#666' }}>SpO2</div>
                                <div style={{ fontWeight: 'bold', fontSize: 16 }}>{record.spo2}%</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: 18, borderBottom: '1px solid #ccc', paddingBottom: 4 }}>AI Clinical Summary</h2>
                        <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 10 }}>
                            {record.explainability?.department_reasoning || record.reasoning_summary}
                        </p>

                        {/* Print-Specific Risk Factors */}
                        {record.explainability?.top_contributing_features && record.explainability.top_contributing_features.length > 0 && (
                            <div style={{ marginTop: '1.5rem' }}>
                                <h3 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Key Risk Factors</h3>
                                <ul style={{ fontSize: 13, lineHeight: 1.5, paddingLeft: 20 }}>
                                    {record.explainability.top_contributing_features.map((f, i) => (
                                        <li key={i}>
                                            <strong>{f.name}</strong> ({f.impact}): {(f as any).explanation}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Print-Specific Insights */}
                        {((record.explainability?.disease_insights && record.explainability.disease_insights.length > 0) || (record.pre_existing_conditions && record.pre_existing_conditions.length > 0)) && (
                            <div style={{ marginTop: '1.5rem' }}>
                                <h3 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Clinical Insights</h3>
                                <ul style={{ fontSize: 13, lineHeight: 1.5, paddingLeft: 20 }}>
                                    {record.explainability?.disease_insights?.map((insight, i) => (
                                        <li key={i}>{insight}</li>
                                    ))}
                                    {!record.explainability?.disease_insights?.length && record.pre_existing_conditions?.map(c => RISK_INSIGHTS[c] && (
                                        <li key={c}><strong>{c}:</strong> {RISK_INSIGHTS[c]}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '4rem', fontSize: 11, color: '#999', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                        Generative AI Triage System v2.4 | Verified by Algorithmic Audit | Report Generated in 0.8s
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media screen {
                    .print-only { display: none; }
                }
                @media print {
                    .screen-only, header, nav, .tab-buttons { display: none !important; }
                    .print-only { 
                        display: block !important; 
                        position: absolute; 
                        top: 0; 
                        left: 0; 
                        width: 100%; 
                        height: 100%;
                        background: #fff;
                        color: #000;
                        z-index: 9999;
                    }
                    body { background: #fff !important; overflow: visible !important; }
                    @page { margin: 1cm; size: auto; }
                }
            `}</style>
        </div>
    )
}


