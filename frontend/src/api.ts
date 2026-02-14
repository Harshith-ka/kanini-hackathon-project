import type { ChatResponse, DashboardData, DepartmentStatus, EhrUploadResult, PatientResponse } from './types'

const BASE = 'http://127.0.0.1:8000'

function getHeaders(contentType: string | null = 'application/json') {
  const headers: Record<string, string> = {}
  if (contentType) headers['Content-Type'] = contentType
  const token = localStorage.getItem('triage_token')
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function login(username: string, password: string): Promise<{ access_token: string; role: string; username: string; full_name?: string }> {
  const formData = new URLSearchParams()
  formData.append('username', username)
  formData.append('password', password)

  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    body: formData,
  })
  if (!r.ok) throw new Error('Login failed')
  const data = await r.json()
  localStorage.setItem('triage_token', data.access_token)
  localStorage.setItem('triage_role', data.role)
  localStorage.setItem('triage_username', data.username)
  if (data.full_name) localStorage.setItem('triage_fullname', data.full_name)
  return data
}

export function logout() {
  localStorage.removeItem('triage_token')
  localStorage.removeItem('triage_role')
  localStorage.removeItem('triage_username')
}

export async function register(body: Record<string, unknown>): Promise<void> {
  const r = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }))
    throw new Error(err.detail || 'Registration failed')
  }
}

export async function addPatient(body: Record<string, unknown>): Promise<PatientResponse> {
  const r = await fetch(`${BASE}/api/patients`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }))
    throw new Error(err.detail || 'Failed to add patient')
  }
  return r.json()
}

export async function getPatients(): Promise<{ patients: PatientResponse[]; total: number }> {
  const r = await fetch(`${BASE}/api/patients`, { headers: getHeaders() })
  if (!r.ok) throw new Error('Failed to fetch patients')
  return r.json()
}

export async function getDashboard(): Promise<DashboardData> {
  const r = await fetch(`${BASE}/api/dashboard`, { headers: getHeaders() })
  if (!r.ok) throw new Error('Failed to fetch dashboard')
  return r.json()
}

export async function getSymptoms(): Promise<{ symptoms: string[] }> {
  const r = await fetch(`${BASE}/api/symptoms`, { headers: getHeaders() })
  if (!r.ok) throw new Error('Failed to fetch symptoms')
  return r.json()
}

export async function chat(
  message: string,
  chatState: Record<string, unknown>,
  lastPatientId: string | null
): Promise<ChatResponse> {
  const r = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ message, chat_state: chatState, last_patient_id: lastPatientId }),
  })
  if (!r.ok) throw new Error('Failed to send message')
  return r.json()
}

export async function uploadEhr(file: File): Promise<EhrUploadResult> {
  const form = new FormData()
  form.append('file', file)
  const r = await fetch(`${BASE}/api/ehr/upload`, {
    method: 'POST',
    headers: getHeaders(null),
    body: form
  })
  if (!r.ok) throw new Error('Upload failed')
  return r.json()
}

export async function getDepartmentStatus(): Promise<{ departments: DepartmentStatus[] }> {
  const r = await fetch(`${BASE}/api/departments/status`, { headers: getHeaders() })
  if (!r.ok) throw new Error('Failed to fetch department status')
  return r.json()
}

export async function addSimulatedPatient(count = 1, emergencySpike = false): Promise<{ added: number; patients: PatientResponse[] }> {
  const r = await fetch(`${BASE}/api/simulation/add`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ count, emergency_spike: emergencySpike }),
  })
  if (!r.ok) throw new Error('Simulation failed')
  return r.json()
}

export async function simulationSpike(): Promise<{ added: number; patients: PatientResponse[] }> {
  const r = await fetch(`${BASE}/api/simulation/spike`, {
    method: 'POST',
    headers: getHeaders()
  })
  if (!r.ok) throw new Error('Spike failed')
  return r.json()
}

export interface FairnessData {
  gender_risk_matrix: Record<string, Record<string, number>>
  age_group_risk_matrix: Record<string, Record<string, number>>
  fairness_metrics: { imbalance_alert: string | null; gender_parity: Record<string, number>; age_parity: Record<string, number>; overall_high_risk_pct?: number }
  heatmap_data: { gender: { group: string; low: number; medium: number; high: number }[]; age_group: { group: string; low: number; medium: number; high: number }[] }
}

export async function getFairness(): Promise<FairnessData> {
  const r = await fetch(`${BASE}/api/fairness`, { headers: getHeaders() })
  if (!r.ok) throw new Error('Failed to fetch fairness')
  return r.json()
}

export async function getAdminPatients(risk?: string): Promise<{ patients: PatientResponse[]; total: number }> {
  const url = risk ? `${BASE}/api/admin/patients?risk=${risk}` : `${BASE}/api/admin/patients`
  const r = await fetch(url, { headers: getHeaders() })
  if (!r.ok) throw new Error('Failed to fetch patients')
  return r.json()
}

export async function exportCSV(risk?: string): Promise<Blob> {
  const url = risk ? `${BASE}/api/admin/export?risk=${risk}` : `${BASE}/api/admin/export`
  const r = await fetch(url, { headers: getHeaders() })
  if (!r.ok) throw new Error('Export failed')
  return r.blob()
}

export async function getSyntheticSummary(): Promise<{ summary: { test_accuracy?: number; class_distribution?: Record<string, number>; total_samples?: number; version?: string; trained_at?: string } | null; error?: string }> {
  const r = await fetch(`${BASE}/api/admin/synthetic/summary`, { headers: getHeaders() })
  if (!r.ok) throw new Error('Failed to fetch summary')
  return r.json()
}

export async function regenerateSynthetic(nSamples: number): Promise<{ ok: boolean; summary: unknown }> {
  const r = await fetch(`${BASE}/api/admin/synthetic/regenerate?n_samples=${nSamples}`, {
    method: 'POST',
    headers: getHeaders()
  })
  if (!r.ok) throw new Error('Regenerate failed')
  return r.json()
}

export async function getModelInfo(): Promise<{ version?: string; test_accuracy?: number; trained_at?: string; classes?: string[]; error?: string }> {
  const r = await fetch(`${BASE}/api/admin/model`, { headers: getHeaders() })
  if (!r.ok) throw new Error('Failed to fetch model')
  return r.json()
}

export async function retrainModel(nSamples = 2500): Promise<{ ok: boolean; summary: unknown }> {
  const r = await fetch(`${BASE}/api/admin/model/retrain?n_samples=${nSamples}`, {
    method: 'POST',
    headers: getHeaders()
  })
  if (!r.ok) throw new Error('Retrain failed')
  return r.json()
}

// New Endpoints
export async function registerPatient(data: { full_name: string; email: string; age: number; gender: string; phone?: string }) {
  const r = await fetch(`${BASE}/api/admin/register-patient`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  })
  if (!r.ok) throw new Error('Registration failed')
  return r.json()
}

export async function getPatientDashboard() {
  const r = await fetch(`${BASE}/api/patient/dashboard`, { headers: getHeaders() })
  if (!r.ok) throw new Error('Failed to fetch patient dashboard')
  return r.json()
}

export async function updatePatient(patient_id: string, data: any) {
  const r = await fetch(`${BASE}/api/patients/${patient_id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data)
  })
  if (!r.ok) throw new Error('Update failed')
  return r.json()
}

export async function dischargePatient(patient_id: string) {
  const r = await fetch(`${BASE}/api/patients/${patient_id}/discharge`, {
    method: 'POST',
    headers: getHeaders()
  })
  if (!r.ok) throw new Error('Discharge failed')
  return r.json()
}
