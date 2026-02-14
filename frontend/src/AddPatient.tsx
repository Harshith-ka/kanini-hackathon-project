import { useState, useEffect } from 'react'
import { addPatient, getSymptoms, uploadEhr } from './api'
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
  pre_existing_conditions: '',
}

export default function AddPatient() {
  const [form, setForm] = useState(defaultForm)
  const [symptomOptions, setSymptomOptions] = useState<string[]>([])
  const [result, setResult] = useState<PatientResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ehrResult, setEhrResult] = useState<{ extracted_symptoms: string[]; snippet: string; error: string | null } | null>(null)
  const [ehrLoading, setEhrLoading] = useState(false)

  useEffect(() => {
    getSymptoms().then((r) => setSymptomOptions(r.symptoms)).catch(() => setSymptomOptions([]))
    const stored = localStorage.getItem('triage_chat_symptoms')
    if (stored) {
      try {
        const symptoms = JSON.parse(stored) as string[]
        if (symptoms.length) setForm((f) => ({ ...f, symptoms: [...new Set(symptoms)] }))
      } catch {}
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
    if (isNaN(age) || isNaN(hr) || isNaN(sys) || isNaN(dia) || isNaN(temp) || isNaN(spo2) || form.symptoms.length === 0) {
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
        pre_existing_conditions: form.pre_existing_conditions ? form.pre_existing_conditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
      })
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

  const fillFormFromEhr = () => {
    if (ehrResult?.extracted_symptoms?.length) {
      setForm((f) => ({ ...f, symptoms: [...new Set(ehrResult.extracted_symptoms)] }))
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
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>Add Patient</h1>
      <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <strong>EHR / EMR Upload</strong>
        <p style={{ margin: '4px 0 8px', fontSize: 14, color: 'var(--text-muted)' }}>Upload PDF or TXT to extract symptoms and auto-fill the form.</p>
        <input type="file" accept=".pdf,.txt" onChange={onEhrUpload} disabled={ehrLoading} style={{ marginRight: 8 }} />
        {ehrLoading && <span style={{ color: 'var(--text-muted)' }}>Processing…</span>}
        {ehrResult && (
          <>
            {ehrResult.error && <div style={{ color: 'var(--red)', marginTop: 8 }}>{ehrResult.error}</div>}
            {ehrResult.extracted_symptoms.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <span>Detected: {ehrResult.extracted_symptoms.map((s) => SYMPTOM_LABELS[s] || s).join(', ')}</span>
                <button type="button" onClick={fillFormFromEhr} style={{ marginLeft: 8, padding: '4px 10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6 }}>Fill form</button>
              </div>
            )}
            {ehrResult.snippet && (
              <div style={{ marginTop: 8, fontSize: 12, maxHeight: 120, overflow: 'auto', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: ehrResult.snippet }} />
            )}
          </>
        )}
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <label>
            <span style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Age *</span>
            <input
              type="number"
              min={0}
              max={150}
              value={form.age}
              onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
              style={{ width: '100%', padding: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
            />
          </label>
          <label>
            <span style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Gender *</span>
            <select
              value={form.gender}
              onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
              style={{ width: '100%', padding: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
        <label>
          <span style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Symptoms (multi-select) *</span>
          <VoiceInput onTranscript={extractSymptomsFromVoice} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(symptomOptions.length ? symptomOptions : Object.keys(SYMPTOM_LABELS)).map((s) => (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="checkbox"
                  checked={form.symptoms.includes(s)}
                  onChange={() => toggleSymptom(s)}
                />
                <span>{SYMPTOM_LABELS[s] || s}</span>
              </label>
            ))}
          </div>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <label>
            <span style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Heart Rate (bpm) *</span>
            <input
              type="number"
              min={30}
              max={250}
              value={form.heart_rate}
              onChange={(e) => setForm((p) => ({ ...p, heart_rate: e.target.value }))}
              style={{ width: '100%', padding: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
            />
          </label>
          <label>
            <span style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>BP Systolic *</span>
            <input
              type="number"
              min={70}
              max={250}
              value={form.blood_pressure_systolic}
              onChange={(e) => setForm((p) => ({ ...p, blood_pressure_systolic: e.target.value }))}
              style={{ width: '100%', padding: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
            />
          </label>
          <label>
            <span style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>BP Diastolic *</span>
            <input
              type="number"
              min={40}
              max={150}
              value={form.blood_pressure_diastolic}
              onChange={(e) => setForm((p) => ({ ...p, blood_pressure_diastolic: e.target.value }))}
              style={{ width: '100%', padding: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
            />
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <label>
            <span style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Temperature (°C) *</span>
            <input
              type="number"
              step="0.1"
              min={35}
              max={43}
              value={form.temperature}
              onChange={(e) => setForm((p) => ({ ...p, temperature: e.target.value }))}
              style={{ width: '100%', padding: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
            />
          </label>
          <label>
            <span style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>SpO2 (%) *</span>
            <input
              type="number"
              min={70}
              max={100}
              value={form.spo2}
              onChange={(e) => setForm((p) => ({ ...p, spo2: e.target.value }))}
              style={{ width: '100%', padding: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
            />
          </label>
        </div>
        <label>
          <span style={{ display: 'block', marginBottom: 4, color: 'var(--text-muted)' }}>Pre-existing conditions (comma-separated)</span>
          <input
            type="text"
            value={form.pre_existing_conditions}
            onChange={(e) => setForm((p) => ({ ...p, pre_existing_conditions: e.target.value }))}
            placeholder="e.g. diabetes, hypertension"
            style={{ width: '100%', padding: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
          />
        </label>
        {error && <div style={{ color: 'var(--red)' }}>{error}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
          }}
        >
          {loading ? 'Submitting…' : 'Submit'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <h2 style={{ marginTop: 0 }}>Triage result — {result.patient_id}</h2>
          {result.abnormality_alerts.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Alerts:</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: '1.25rem' }}>
                {result.abnormality_alerts.map((a, i) => (
                  <li key={i} style={{ color: a.severity === 'critical' ? 'var(--red)' : 'var(--yellow)' }}>{a.message}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <span style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontWeight: 600,
              background: result.risk_level === 'high' ? 'var(--red)' : result.risk_level === 'medium' ? 'var(--yellow)' : 'var(--green)',
              color: '#fff',
            }}>
              Risk: {result.risk_level}
            </span>
            <span>Confidence: {result.confidence_score}%</span>
            <span>Priority: {result.priority_score}</span>
            <span>Department: {result.recommended_department}</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>{result.reasoning_summary}</p>
          {result.routing_message && (
            <p style={{ marginTop: 8, padding: 8, background: 'rgba(210, 153, 34, 0.15)', borderRadius: 6, fontSize: 14, color: 'var(--yellow)' }}>{result.routing_message}</p>
          )}
          {result.severity_timeline && (
            <p style={{ marginTop: 8, padding: 8, background: 'rgba(248, 81, 73, 0.1)', borderRadius: 6, fontSize: 14, color: 'var(--red)' }}>Severity timeline: {result.severity_timeline}</p>
          )}
          {result.estimated_wait_minutes != null && (
            <p style={{ marginTop: 8, fontSize: 14, color: 'var(--text-muted)' }}>Estimated wait: ~{result.estimated_wait_minutes} min</p>
          )}
          <div style={{ marginTop: '1rem' }}>
            <strong>Probability breakdown</strong>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 32, marginTop: 8 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', maxWidth: 60, height: 20, background: 'var(--green)', borderRadius: 4, opacity: 0.3 + result.probability_breakdown.low * 0.7 }} />
                <span style={{ fontSize: 12 }}>Low {Math.round(result.probability_breakdown.low * 100)}%</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', maxWidth: 60, height: 20, background: 'var(--yellow)', borderRadius: 4, opacity: 0.3 + result.probability_breakdown.medium * 0.7 }} />
                <span style={{ fontSize: 12 }}>Med {Math.round(result.probability_breakdown.medium * 100)}%</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', maxWidth: 60, height: 20, background: 'var(--red)', borderRadius: 4, opacity: 0.3 + result.probability_breakdown.high * 0.7 }} />
                <span style={{ fontSize: 12 }}>High {Math.round(result.probability_breakdown.high * 100)}%</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <strong>Top contributing features</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: '1.25rem' }}>
              {result.explainability.top_contributing_features.map((f, i) => (
                <li key={i}>{f.name}: {f.impact}</li>
              ))}
            </ul>
          </div>
          {result.explainability.abnormal_vitals.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <strong>Abnormal vitals</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: '1.25rem' }}>
                {result.explainability.abnormal_vitals.map((v, i) => (
                  <li key={i}>{v.name} = {String(v.value)} (normal: {v.normal_range})</li>
                ))}
              </ul>
            </div>
          )}
          <p style={{ marginTop: '1rem', fontSize: 14, color: 'var(--text-muted)' }}>{result.explainability.department_reasoning}</p>
          {result.explainability.shap_contributions && result.explainability.shap_contributions.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <strong>SHAP contributions (positive = increases risk)</strong>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {result.explainability.shap_contributions.slice(0, 8).map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 180, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.name}>{c.name}</span>
                    <div style={{ flex: 1, height: 16, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                      {c.contribution >= 0 ? (
                        <div style={{ width: `${Math.min(100, Math.abs(c.contribution) * 50)}%`, background: 'var(--red)', height: '100%' }} />
                      ) : (
                        <div style={{ marginLeft: 'auto', width: `${Math.min(100, Math.abs(c.contribution) * 50)}%`, background: 'var(--green)', height: '100%' }} />
                      )}
                    </div>
                    <span style={{ width: 56, fontSize: 12, color: c.contribution >= 0 ? 'var(--red)' : 'var(--green)' }}>{c.contribution >= 0 ? '+' : ''}{c.contribution.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.explainability.feature_importance && result.explainability.feature_importance.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <strong>Feature importance (model-wide)</strong>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.explainability.feature_importance.slice(0, 8).map((f, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '2px 6px', background: 'var(--bg)', borderRadius: 4 }} title={f.name}>{f.name.replace('symptom_', '')}: {(f.importance * 100).toFixed(1)}%</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
