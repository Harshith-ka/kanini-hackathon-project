import React, { useState, useEffect } from 'react'
import { addPatient, uploadEhr } from './api'
import type { PatientResponse } from './types'
import VoiceInput from './VoiceInput'
import toast from 'react-hot-toast'
import BodyMap from './components/BodyMap'

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
  full_name: '',
  email: '',
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
  pre_existing_conditions: [] as string[],
}

// Visual Utility: Input Card Component
const VitalCard = ({ label, unit, value, onChange, type = "number", step = "1", placeholder = "--", width = 80 }: any) => (
  <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: 16, border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <input
        type={type}
        step={step}
        value={value}
        onChange={onChange}
        style={{ border: 'none', background: 'transparent', fontSize: 24, fontWeight: 900, padding: 0, width: width, outline: 'none', color: '#0f172a' }}
        placeholder={placeholder}
      />
      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>{unit}</span>
    </div>
  </div>
)

export default function AddPatient() {
  const [form, setForm] = useState(defaultForm)
  const [result, setResult] = useState<PatientResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ehrResult, setEhrResult] = useState<{ extracted_symptoms: string[]; snippet: string; error: string | null } | null>(null)
  const [ehrLoading, setEhrLoading] = useState(false)

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
    const tempF = parseFloat(form.temperature)
    const tempC = (tempF - 32) * 5 / 9 // Convert F to C for backend validation
    const spo2 = parseInt(form.spo2, 10)
    const cdc = parseInt(form.chronic_disease_count, 10)
    const rr = parseInt(form.respiratory_rate, 10)
    const ps = parseInt(form.pain_score, 10)
    const sd = parseInt(form.symptom_duration, 10)

    if (isNaN(age) || isNaN(hr) || isNaN(sys) || isNaN(dia) || isNaN(tempF) || isNaN(spo2) || isNaN(cdc) || isNaN(rr) || isNaN(ps) || isNaN(sd) || form.symptoms.length === 0) {
      setError('Required: Fill all vitals and select at least one symptom.')
      return
    }

    setLoading(true)
    try {
      const payload: any = {
        age,
        gender: form.gender,
        symptoms: form.symptoms,
        heart_rate: hr,
        blood_pressure_systolic: sys,
        blood_pressure_diastolic: dia,
        temperature: parseFloat(tempC.toFixed(1)), // Send Celsius
        spo2,
        chronic_disease_count: cdc,
        respiratory_rate: rr,
        pain_score: ps,
        symptom_duration: sd,
        pre_existing_conditions: Array.isArray(form.pre_existing_conditions) ? form.pre_existing_conditions : [],
      }
      if (form.full_name) payload.full_name = form.full_name
      if (form.email) payload.email = form.email

      const res = await addPatient(payload)
      setResult(res)
      setForm(defaultForm)
      localStorage.setItem('triage_last_patient_id', res.patient_id)
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

  const progressFields = [
    form.age, form.gender, form.symptoms.length > 0, form.heart_rate,
    form.blood_pressure_systolic, form.blood_pressure_diastolic, form.temperature,
    form.spo2, form.respiratory_rate, form.symptom_duration
  ]
  const filledFields = progressFields.filter(v => v !== '' && v !== '0' && (typeof v === 'boolean' ? v : true)).length
  const progressPercent = Math.round((filledFields / progressFields.length) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: 140, maxWidth: 1600, margin: 0, animation: 'fadeIn 0.6s ease-out' }}>

      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Clinical Intake Protocol</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, margin: 0, fontWeight: 500 }}>Secure registration & real-time risk stratification engine</p>
        </div>
        <div style={{ background: 'var(--accent-soft)', padding: '8px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }}></div>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Biometric Sync Active</span>
        </div>
      </div>

      {/* Top Section: Vitals & EHR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '2rem' }}>

        {/* Patient Identity Section */}
        <div className="glass-card" style={{ padding: '2.5rem', background: '#fff', border: '1px solid var(--border)', gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#0f172a', fontWeight: 900, margin: '0 0 1.5rem' }}>
            👤 Patient Registration
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Full Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                placeholder="e.g. Jane Doe"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', background: '#f8fafc', fontSize: 15, fontWeight: 600, outline: 'none', color: '#0f172a' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Email Address (Optional)</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="e.g. jane@example.com"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', background: '#f8fafc', fontSize: 15, fontWeight: 600, outline: 'none', color: '#0f172a' }}
              />
            </div>
          </div>
        </div>

        {/* Manual Vitals Entry */}
        <div className="glass-card" style={{ padding: '2.5rem', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#0f172a', fontWeight: 900, margin: 0 }}>
              🩺 Triage Biometrics
            </h3>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--success)', background: 'rgba(16, 185, 129, 0.08)', padding: '4px 10px', borderRadius: 6 }}>ESI STANDARDS</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
            <VitalCard label="Age" unit="YRS" value={form.age} onChange={(e: any) => setForm(p => ({ ...p, age: e.target.value }))} />

            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: 16, border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Sex</div>
              <select
                value={form.gender}
                onChange={(e) => setForm(p => ({ ...p, gender: e.target.value }))}
                style={{ border: 'none', background: 'transparent', fontSize: 20, fontWeight: 900, width: '100%', outline: 'none', color: '#0f172a', cursor: 'pointer', appearance: 'none' }}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <VitalCard label="Heart Rate" unit="BPM" value={form.heart_rate} onChange={(e: any) => setForm(p => ({ ...p, heart_rate: e.target.value }))} />

            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: 16, border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Blood Pressure</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <input type="number" value={form.blood_pressure_systolic} onChange={(e) => setForm(p => ({ ...p, blood_pressure_systolic: e.target.value }))} style={{ border: 'none', width: 70, textAlign: 'right', fontSize: 24, fontWeight: 900, outline: 'none', color: '#0f172a' }} placeholder="--" />
                <span style={{ opacity: 0.3, fontSize: 22 }}>/</span>
                <input type="number" value={form.blood_pressure_diastolic} onChange={(e) => setForm(p => ({ ...p, blood_pressure_diastolic: e.target.value }))} style={{ border: 'none', width: 70, fontSize: 24, fontWeight: 900, outline: 'none', color: '#0f172a' }} placeholder="--" />
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>mmHg</span>
              </div>
            </div>

            <VitalCard label="Oxygen Sat" unit="SpO2 %" value={form.spo2} onChange={(e: any) => setForm(p => ({ ...p, spo2: e.target.value }))} />
            <VitalCard label="Temp" unit="°F" step="0.1" value={form.temperature} onChange={(e: any) => setForm(p => ({ ...p, temperature: e.target.value }))} />
            <VitalCard label="Resp Rate" unit="BPM" value={form.respiratory_rate} onChange={(e: any) => setForm(p => ({ ...p, respiratory_rate: e.target.value }))} />
            <VitalCard label="Duration" unit="DAYS" value={form.symptom_duration} onChange={(e: any) => setForm(p => ({ ...p, symptom_duration: e.target.value }))} />
          </div>

          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem' }}>
            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: 16, border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pain Intensity (NPRS)</div>
                <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent)' }}>{form.pain_score}</span>
              </div>
              <input type="range" min="0" max="10" value={form.pain_score} onChange={(e) => setForm(p => ({ ...p, pain_score: e.target.value }))} style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>
                <span>NO PAIN</span>
                <span>MODERATE</span>
                <span>SEVERE</span>
              </div>
            </div>
            <VitalCard label="Chronic Conditions" unit="COUNT" value={form.chronic_disease_count} onChange={(e: any) => setForm(p => ({ ...p, chronic_disease_count: e.target.value }))} />
          </div>
        </div>

        {/* EHR Upload Section */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', border: '2px dashed var(--border)', background: 'rgba(255,255,255,0.4)', borderRadius: 24, transition: 'all 0.3s' }}>
          <div style={{ textAlign: 'center', padding: '3rem 2rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: 64, height: 64, background: '#fff', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 20, boxShadow: '0 8px 16px rgba(0,0,0,0.05)' }}>📂</div>
            <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8, color: '#0f172a' }}>EHR Digitalization</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5, maxWidth: '280px' }}>Upload clinical records or lab history for automated diagnostic pre-fill.</p>

            <input type="file" accept=".pdf,.txt" onChange={onEhrUpload} style={{ display: 'none' }} id="ehr-upload" />
            <label htmlFor="ehr-upload" style={{
              display: 'inline-block', padding: '14px 28px', background: '#0f172a',
              border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 800, fontSize: 14, color: '#fff',
              transition: 'all 0.2s', boxShadow: '0 10px 20px rgba(15, 23, 42, 0.2)'
            }}>
              Import Patient Record
            </label>

            {ehrLoading && <div style={{ marginTop: 20, fontSize: 13, color: 'var(--accent)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              Processing Neural Vector...
            </div>}
            {ehrResult?.extracted_symptoms?.length ? (
              <div style={{ marginTop: 24, padding: '12px 18px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 12, fontSize: 12, color: '#047857', fontWeight: 800 }}>
                ✓ {ehrResult.extracted_symptoms.length} symptoms mapped from EHR
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bottom Section: Symptoms & Context */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '2rem' }}>

        {/* Symptom Collection */}
        <div className="glass-card" style={{ padding: '2.5rem', background: '#fff', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 240px', gap: '2rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', fontWeight: 900 }}>
                🚩 Presenting Symptom Complex
              </h3>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '4px 10px', borderRadius: 6 }}>VOICE ENABLED</div>
            </div>

            <div style={{ border: '1px solid var(--border)', background: '#f8fafc', borderRadius: 20, padding: '2rem', minHeight: 220, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: '2.5rem' }}>
                {form.symptoms.length === 0 && (
                  <div style={{ color: '#94a3b8', fontSize: 15, fontStyle: 'italic', textAlign: 'center', width: '100%', padding: '40px 0', opacity: 0.8 }}>
                    No symptoms mapped. Utilize the clinical selectors below or activate voice transcription.
                  </div>
                )}
                {form.symptoms.map(s => (
                  <div key={s} style={{
                    padding: '10px 18px', background: 'var(--accent)',
                    color: '#fff', borderRadius: 12, fontSize: 14,
                    display: 'flex', alignItems: 'center', gap: 12, fontWeight: 800,
                    boxShadow: '0 8px 16px var(--accent-glow)'
                  }}>
                    {SYMPTOM_LABELS[s] || s}
                    <button onClick={() => toggleSymptom(s)} style={{ border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 6px', borderRadius: '6px', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 'auto' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 12, height: 1, background: '#cbd5e1' }}></span>
                  Clinical Quick-Select
                  <span style={{ width: 12, height: 1, background: '#cbd5e1' }}></span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['chest_pain', 'shortness_of_breath', 'fever', 'headache', 'dizziness', 'abdominal_pain', 'stroke_symptoms', 'seizure'].map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSymptom(s)}
                      style={{
                        padding: '10px 16px', background: form.symptoms.includes(s) ? 'var(--accent-soft)' : '#fff',
                        border: '1px solid', borderColor: form.symptoms.includes(s) ? 'var(--accent)' : 'var(--border)',
                        borderRadius: 12, fontSize: 13, color: form.symptoms.includes(s) ? 'var(--accent)' : '#475569',
                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      {SYMPTOM_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '2.5rem' }}>
              <VoiceInput onTranscript={extractSymptomsFromVoice} />
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 12, textAlign: 'center', letterSpacing: '0.05em' }}>Interactive Body Map</label>
            <BodyMap
              onSelectPart={(part: string) => {
                if (!form.symptoms.includes(part)) {
                  toggleSymptom(part);
                  toast.success(`Added ${part}`);
                }
              }}
              selectedParts={form.symptoms}
            />
          </div>
        </div>

        {/* Predictive Analysis Sidebar */}
        <div className="glass-card" style={{ background: '#0f172a', color: '#fff', borderRadius: 24, padding: '2.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94a3b8', fontWeight: 900, marginBottom: '2.5rem' }}>
            ⚡ Real-time Neural Synthesis
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, flex: 1 }}>
            {[
              { label: 'Physiologic Load', val: form.heart_rate ? (parseInt(form.heart_rate) > 100 || parseInt(form.heart_rate) < 50 ? 'Abnormal Response' : 'Stable Vitals') : 'Awaiting Metrics', color: form.heart_rate ? (parseInt(form.heart_rate) > 100 || parseInt(form.heart_rate) < 50 ? 'var(--critical)' : 'var(--success)') : '#334155' },
              { label: 'Symptom Cluster', val: form.symptoms.length > 0 ? `${form.symptoms.length} Clinical Features` : 'Zero Presenting', color: form.symptoms.length > 3 ? 'var(--warning)' : form.symptoms.length > 0 ? 'var(--accent)' : '#334155' },
              { label: 'Classification Model', val: progressPercent > 80 ? 'Ready for Execution' : 'Insufficient Data', color: progressPercent > 80 ? 'var(--success)' : '#334155' }
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <div style={{ width: 4, height: 40, borderRadius: 2, background: item.color, boxShadow: `0 0 10px ${item.color}66` }}></div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{item.val}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '4rem', padding: '1.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
              VitalCore AI employs a proprietary ESI-integrated neural engine to determine clinical priority within 400ms of data commit.
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ padding: '1.25rem 2rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 16, color: '#ef4444', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 20 }}>⚠️</span> {error}
        </div>
      )}

      {/* Result Section (Modal-like) */}
      {result && (
        <div className="glass-card" style={{
          border: `2px solid ${result.risk_level === 'high' ? 'var(--critical)' : result.risk_level === 'medium' ? 'var(--warning)' : 'var(--success)'}`,
          background: '#ffffff',
          padding: '3.5rem',
          boxShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.15)',
          animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          marginTop: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.1em' }}>Triage Registry Report</div>
              <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16, color: '#0f172a', letterSpacing: '-0.03em' }}>Registry Code: {result.patient_id.slice(-8).toUpperCase()}</h2>
              <div style={{ display: 'flex', gap: 14 }}>
                <span style={{
                  padding: '8px 20px', borderRadius: 12, fontSize: 12, fontWeight: 900, textTransform: 'uppercase',
                  background: result.risk_level === 'high' ? 'var(--critical)' : result.risk_level === 'medium' ? 'var(--warning)' : 'var(--success)',
                  color: '#fff', letterSpacing: '0.05em', boxShadow: `0 8px 16px ${result.risk_level === 'high' ? 'var(--critical-glow)' : 'rgba(0,0,0,0.1)'}`
                }}>{result.risk_level} Priority Phase</span>
                <span style={{ fontSize: 14, color: '#64748b', fontWeight: 800, alignSelf: 'center' }}>Neural Confidence: {result.confidence_score}%</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', background: '#f8fafc', padding: '1.5rem 2rem', borderRadius: 20, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Urgency Index</div>
              <div style={{ fontSize: 48, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>P-{result.priority_score}</div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: 20, border: '1px solid var(--border)', marginBottom: '2.5rem' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>AI Diagnostic Synthesis</h4>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: '#1e293b', fontWeight: 600 }}>{result.reasoning_summary}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
            <div style={{ background: '#fff', padding: '2rem', borderRadius: 20, border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.05em' }}>Deployment Sector</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent)', letterSpacing: '-0.02em' }}>{result.recommended_department}</div>
            </div>
            <div style={{ background: '#fff', padding: '2rem', borderRadius: 20, border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.05em' }}>Est. Physician Contact</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>{result.explainability.wait_time_estimate}</div>
            </div>
          </div>

          <div style={{ padding: '1.5rem 2rem', background: 'var(--accent-soft)', border: '1px solid var(--accent-light)', borderRadius: 20, color: 'var(--accent)', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 24 }}>💡</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', marginBottom: 2, opacity: 0.8 }}>Routing Guidance</div>
              {result.routing_message || result.explainability.department_reasoning}
            </div>
          </div>
        </div>
      )}

      <div style={{
        position: 'fixed', bottom: 0, left: 300, right: 0,
        padding: '2rem 3.5rem', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100,
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative', width: 220, height: 12, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{
              width: `${progressPercent}%`,
              height: '100%', background: 'var(--accent)',
              transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 0 10px var(--accent-glow)'
            }}></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Intake Accuracy: {progressPercent}%
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginTop: 2 }}>{filledFields} of {progressFields.length} critical variables acquired</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button style={{ padding: '14px 28px', background: '#fff', border: '1px solid var(--border)', borderRadius: 14, color: '#475569', fontWeight: 800, cursor: 'pointer', fontSize: 14, transition: 'all 0.2s' }} className="button-hover">Park Session</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '14px 42px', background: '#0f172a', color: '#fff', border: 'none',
              borderRadius: 14, fontWeight: 900, fontSize: 15, cursor: 'pointer',
              boxShadow: '0 10px 20px rgba(15, 23, 42, 0.2)',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
            className="button-hover"
          >
            {loading ? 'Executing Neural Assessment...' : 'Register Patient & Start Analysis ›'}
          </button>
        </div>
      </div>
    </div>
  )
}
