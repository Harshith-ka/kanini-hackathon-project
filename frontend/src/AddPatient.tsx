import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { addPatient, uploadEhr } from './api'
import type { PatientResponse } from './types'
import VoiceInput from './VoiceInput'

const SYMPTOM_LABELS: Record<string, string> = {
  chest_pain: 'Chest pain',
  shortness_of_breath: 'Shortness of breath',
  headache: 'Headache',
  fever: 'Fever',
  dizziness: 'Dizziness',
  nausea: 'Nausea',
  abdominal_pain: 'Abdominal pain',
  bleeding: 'Bleeding',
  unconscious: 'Unconscious',
  seizure: 'Seizure',
  trauma: 'Trauma',
  burn: 'Burn',
  allergic_reaction: 'Allergic reaction',
  stroke_symptoms: 'Stroke symptoms',
  other: 'Other',
}

const VOICE_KEYWORDS: [RegExp, string][] = [
  [/chest\s*pain|angina/gi, 'chest_pain'],
  [/shortness\s*of\s*breath|breathing\s*difficulty|dyspnea/gi, 'shortness_of_breath'],
  [/headache|head\s*pain|migraine/gi, 'headache'],
  [/fever|febrile|high\s*temp/gi, 'fever'],
  [/dizziness|dizzy|vertigo/gi, 'dizziness'],
  [/nausea|nauseous|vomiting/gi, 'nausea'],
  [/abdominal\s*pain|stomach\s*pain|belly\s*pain/gi, 'abdominal_pain'],
  [/bleeding|hemorrhage|blood\s*loss/gi, 'bleeding'],
  [/unconscious|passed\s*out|syncope|unresponsive/gi, 'unconscious'],
  [/seizure|convulsion/gi, 'seizure'],
  [/trauma|injury|injured|laceration/gi, 'trauma'],
  [/burn|burned|scald/gi, 'burn'],
  [/allergic|allergy|anaphylaxis/gi, 'allergic_reaction'],
  [/stroke|facial\s*droop|slurred\s*speech/gi, 'stroke_symptoms'],
]

const defaultForm = {
  age: '',
  gender: 'male',
  symptoms: [] as string[],
  heart_rate: '',
  blood_pressure_systolic: '',
  blood_pressure_diastolic: '',
  temperature: '',
  spo2: '',
  chronic_disease_count: '0',
  respiratory_rate: '',
  pain_score: '0',
  symptom_duration: '',
  pre_existing_conditions: '',
}

export default function AddPatient() {
  const [form, setForm] = useState(defaultForm)
  const [result, setResult] = useState<PatientResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ehrResult, setEhrResult] = useState<{ extracted_symptoms: string[]; snippet: string; error: string | null } | null>(null)
  const [ehrLoading, setEhrLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const stored = localStorage.getItem('triage_chat_symptoms')
    if (stored) {
      try {
        const symptoms = JSON.parse(stored) as string[]
        if (symptoms.length) setForm((f) => ({ ...f, symptoms: [...new Set(symptoms)] }))
      } catch { }
    }
  }, [])

  const toggleSymptom = (s: string) => {
    setForm((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(s) ? prev.symptoms.filter((x) => x !== s) : [...prev.symptoms, s],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    const age = parseInt(form.age, 10)
    const hr = parseInt(form.heart_rate, 10)
    const sys = parseInt(form.blood_pressure_systolic, 10)
    const dia = parseInt(form.blood_pressure_diastolic, 10)
    const temp = parseFloat(form.temperature)
    const spo2 = parseInt(form.spo2, 10)
    const cdc = parseInt(form.chronic_disease_count, 10)
    const rr = parseInt(form.respiratory_rate, 10)
    const ps = parseInt(form.pain_score, 10)
    const sd = parseInt(form.symptom_duration, 10)
    if (isNaN(age) || isNaN(hr) || isNaN(sys) || isNaN(dia) || isNaN(temp) || isNaN(spo2) || isNaN(cdc) || isNaN(rr) || isNaN(ps) || isNaN(sd) || form.symptoms.length === 0) {
      setError('Please fill all required fields and select at least one symptom.')
      return
    }
    setLoading(true)
    try {
      const res = await addPatient({
        age,
        gender: form.gender,
        symptoms: form.symptoms,
        heart_rate: hr,
        blood_pressure_systolic: sys,
        blood_pressure_diastolic: dia,
        temperature: temp,
        spo2,
        chronic_disease_count: cdc,
        respiratory_rate: rr,
        pain_score: ps,
        symptom_duration: sd,
        pre_existing_conditions: form.pre_existing_conditions ? form.pre_existing_conditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
      })
      setResult(res)
      setForm(defaultForm)
      localStorage.setItem('triage_last_patient_id', res.patient_id)
      // If success, scroll down to result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add patient')
    } finally {
      setLoading(false)
    }
  }

  const onEhrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEhrLoading(true)
    setEhrResult(null)
    try {
      const res = await uploadEhr(file)
      setEhrResult({
        extracted_symptoms: res.extracted_symptoms || [],
        snippet: res.snippet || '',
        error: res.error ?? null,
      })
      if (res.extracted_symptoms?.length) {
        setForm((f) => ({ ...f, symptoms: [...new Set([...f.symptoms, ...res.extracted_symptoms])] }))
      }
    } catch {
      setEhrResult({ extracted_symptoms: [], snippet: '', error: 'Upload failed' })
    } finally {
      setEhrLoading(false)
      e.target.value = ''
    }
  }

  const extractSymptomsFromVoice = (text: string) => {
    const found: string[] = []
    for (const [re, code] of VOICE_KEYWORDS) {
      if (re.test(text)) found.push(code)
    }
    if (found.length) setForm((f) => ({ ...f, symptoms: [...new Set([...f.symptoms, ...found])] }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '100px' }}>

      {/* Top Section: Vitals & EHR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', gap: '1.5rem' }}>

        {/* Manual Vitals Entry */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 800, margin: 0 }}>
              📊 Clinical Vitals Entry
            </h3>
            <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700 }}>LIVE SYNC ACTIVE</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Heart Rate</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <input
                  type="number"
                  value={form.heart_rate}
                  onChange={(e) => setForm(p => ({ ...p, heart_rate: e.target.value }))}
                  style={{ border: 'none', background: 'transparent', fontSize: 24, fontWeight: 800, padding: 0, width: 80, outline: 'none', color: '#0f172a' }}
                  placeholder="--"
                />
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>BPM</span>
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Blood Pressure</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <input
                  type="number"
                  value={form.blood_pressure_systolic}
                  onChange={(e) => setForm(p => ({ ...p, blood_pressure_systolic: e.target.value }))}
                  style={{ border: 'none', background: 'transparent', fontSize: 24, fontWeight: 800, padding: 0, width: 45, textAlign: 'right', outline: 'none', color: '#0f172a' }}
                  placeholder="--"
                />
                <span style={{ fontSize: 20, opacity: 0.2, fontWeight: 300 }}>/</span>
                <input
                  type="number"
                  value={form.blood_pressure_diastolic}
                  onChange={(e) => setForm(p => ({ ...p, blood_pressure_diastolic: e.target.value }))}
                  style={{ border: 'none', background: 'transparent', fontSize: 24, fontWeight: 800, padding: 0, width: 45, outline: 'none', color: '#0f172a' }}
                  placeholder="--"
                />
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>mmHg</span>
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Oxygen Sat (SpO2)</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <input
                  type="number"
                  value={form.spo2}
                  onChange={(e) => setForm(p => ({ ...p, spo2: e.target.value }))}
                  style={{ border: 'none', background: 'transparent', fontSize: 24, fontWeight: 800, padding: 0, width: 80, outline: 'none', color: '#0f172a' }}
                  placeholder="--"
                />
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>%</span>
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Body Temp</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <input
                  type="number"
                  step="0.1"
                  value={form.temperature}
                  onChange={(e) => setForm(p => ({ ...p, temperature: e.target.value }))}
                  style={{ border: 'none', background: 'transparent', fontSize: 24, fontWeight: 800, padding: 0, width: 80, outline: 'none', color: '#0f172a' }}
                  placeholder="--"
                />
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>°F</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Resp Rate</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <input
                  type="number"
                  value={form.respiratory_rate}
                  onChange={(e) => setForm(p => ({ ...p, respiratory_rate: e.target.value }))}
                  style={{ border: 'none', background: 'transparent', fontSize: 24, fontWeight: 800, padding: 0, width: 80, outline: 'none', color: '#0f172a' }}
                  placeholder="--"
                />
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>BPM</span>
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Pain Score (0-10)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="range"
                  min="0" max="10"
                  value={form.pain_score}
                  onChange={(e) => setForm(p => ({ ...p, pain_score: e.target.value }))}
                  style={{ flex: 1, accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{form.pain_score}</span>
              </div>
            </div>
          </div>
        </div>

        {/* EHR Upload Section */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '2px dashed #cbd5e1', background: '#fcfdfe' }}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📄</div>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>Clinical Document Upload</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Upload PDFs, lab reports or imaging notes. AI will auto-extract structured data.</p>
            <input type="file" accept=".pdf,.txt" onChange={onEhrUpload} style={{ display: 'none' }} id="ehr-upload" />
            <label htmlFor="ehr-upload" style={{
              display: 'inline-block', padding: '10px 24px', background: '#fff',
              border: '1px solid #cbd5e1', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#475569'
            }}>
              Select Document
            </label>
            {ehrLoading && <div style={{ marginTop: 16, fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>Digitizing & Analysing...</div>}
            {ehrResult?.extracted_symptoms?.length ? (
              <div style={{ marginTop: 16, fontSize: 12, color: 'var(--success)', fontWeight: 800 }}>
                ✓ {ehrResult.extracted_symptoms.length} Symptoms Extracted
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bottom Section: Symptoms & Context */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', gap: '1.5rem' }}>

        {/* Symptom Collection */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 800, marginBottom: '1.5rem' }}>
            🫁 Clinical Symptom selection
          </h3>
          <div style={{ border: '1px solid #f1f5f9', background: '#f8fafc', borderRadius: 16, padding: '1.5rem', minHeight: 140 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: '2rem' }}>
              {form.symptoms.length === 0 && <span style={{ color: '#94a3b8', fontSize: 14 }}>No symptoms selected. Use the voice assistant or quick select below.</span>}
              {form.symptoms.map(s => (
                <div key={s} style={{
                  padding: '6px 12px', background: '#fff',
                  border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 8, fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700
                }}>
                  {SYMPTOM_LABELS[s] || s}
                  <button onClick={() => toggleSymptom(s)} style={{ border: 'none', background: 'transparent', color: 'var(--accent)', padding: 0, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: 12 }}>Recommended Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['chest_pain', 'shortness_of_breath', 'fever', 'headache', 'dizziness', 'abdominal_pain'].map(s => (
                <button
                  key={s}
                  onClick={() => toggleSymptom(s)}
                  style={{
                    padding: '6px 12px', background: form.symptoms.includes(s) ? '#eff6ff' : '#fff',
                    border: '1px solid', borderColor: form.symptoms.includes(s) ? 'var(--accent)' : '#e2e8f0',
                    borderRadius: 8, fontSize: 12, color: form.symptoms.includes(s) ? 'var(--accent)' : '#475569',
                    fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  {SYMPTOM_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <VoiceInput onTranscript={extractSymptomsFromVoice} />
          </div>
        </div>

        {/* Predictive Triage Preview */}
        <div className="glass-card" style={{ background: '#1e293b', color: '#fff' }}>
          <div style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', fontWeight: 800, marginBottom: '2rem' }}>
              🧠 Predictive Analysis
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 8, height: 40, borderRadius: 4, background: form.heart_rate ? (parseInt(form.heart_rate) > 100 ? '#f87171' : '#4ade80') : '#334155' }}></div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Vitals Health</div>
                  <div style={{ fontSize: 14 }}>{form.heart_rate ? 'Actively Monitoring' : 'Awaiting Data Input'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 8, height: 40, borderRadius: 4, background: form.symptoms.length > 0 ? 'var(--accent)' : '#334155' }}></div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Symptom Load</div>
                  <div style={{ fontSize: 14 }}>{form.symptoms.length} indicators detected</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 8, height: 40, borderRadius: 4, background: '#334155' }}></div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Risk Factor</div>
                  <div style={{ fontSize: 14 }}>Calculation Pending...</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '3rem', padding: '1.25rem', background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>
                Enter all required clinical metrics to generate a high-confidence triage routing recommendation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Result Section */}
      {error && (
        <div style={{ padding: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16, color: '#991b1b', fontWeight: 600 }}>
          ⚠️ Critical Error: {error}
        </div>
      )}

      {result && (
        <div className="glass-card" style={{
          border: `1px solid ${result.risk_level === 'high' ? '#fecaca' : '#bbf7d0'}`,
          background: result.risk_level === 'high' ? '#fff1f2' : '#f0fdf4',
          padding: '2.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8, color: '#0f172a' }}>Triage Registry: {result.patient_id.split('-').pop()}</h2>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{
                  padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800, textTransform: 'uppercase',
                  background: result.risk_level === 'high' ? '#dc2626' : result.risk_level === 'medium' ? '#d97706' : '#166534',
                  color: '#fff'
                }}>{result.risk_level} Risk</span>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>AI CONFIDENCE: {result.confidence_score}%</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Priority Score</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#0f172a' }}>{result.priority_score}</div>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>Clinical Reasoning</h4>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: '#1e293b' }}>{result.reasoning_summary}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ background: '#fff', padding: '1.25rem', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Routing Destination</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{result.recommended_department}</div>
            </div>
            <div style={{ background: '#fff', padding: '1.25rem', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Wait-time Estimate</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{result.explainability.wait_time_estimate}</div>
            </div>
          </div>

          <div style={{ padding: '1.25rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, color: '#475569', fontSize: 14, fontWeight: 600 }}>
            <span style={{ marginRight: 8 }}>💡</span> <strong>Clinical Guidance:</strong> {result.routing_message || result.explainability.department_reasoning}
          </div>
        </div>
      )}

      {/* Sticky Bottom Assessment Bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 280, right: 0,
        padding: '1.5rem 3rem', background: '#fff',
        borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100,
        boxShadow: '0 -10px 15px -3px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 140, height: 8, background: '#f1f5f9', borderRadius: 4 }}>
            <div style={{
              width: `${(Object.values(form).filter(v => v !== '' && v !== '0' && (Array.isArray(v) ? v.length > 0 : true)).length / 10) * 100}%`,
              height: '100%', background: 'var(--accent)', borderRadius: 4,
              transition: 'width 0.3s ease'
            }}></div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Data Completion: <span style={{ color: 'var(--text)' }}>Verified for Analysis</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={{ padding: '12px 24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, color: '#475569', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>Save as Draft</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '12px 32px', background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
            }}
          >
            {loading ? 'Processing Clinical Data...' : 'Submit Assessment Registry ›'}
          </button>
        </div>
      </div>
    </div>
  )
}
