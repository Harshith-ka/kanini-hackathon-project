import type { ChatResponse, DashboardData, DepartmentStatus, EhrUploadResult, PatientResponse } from './types'

const BASE = ''

export async function addPatient(body: Record<string, unknown>): Promise<PatientResponse> {
  const r = await fetch(`${BASE}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }))
    throw new Error(err.detail || 'Failed to add patient')
  }
  return r.json()
}

export async function getPatients(): Promise<{ patients: PatientResponse[]; total: number }> {
  const r = await fetch(`${BASE}/api/patients`)
  if (!r.ok) throw new Error('Failed to fetch patients')
  return r.json()
}

export async function getDashboard(): Promise<DashboardData> {
  const r = await fetch(`${BASE}/api/dashboard`)
  if (!r.ok) throw new Error('Failed to fetch dashboard')
  return r.json()
}

export async function getSymptoms(): Promise<{ symptoms: string[] }> {
  const r = await fetch(`${BASE}/api/symptoms`)
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, chat_state: chatState, last_patient_id: lastPatientId }),
  })
  if (!r.ok) throw new Error('Failed to send message')
  return r.json()
}

export async function uploadEhr(file: File): Promise<EhrUploadResult> {
  const form = new FormData()
  form.append('file', file)
  const r = await fetch(`${BASE}/api/ehr/upload`, { method: 'POST', body: form })
  if (!r.ok) throw new Error('Upload failed')
  return r.json()
}

export async function getDepartmentStatus(): Promise<{ departments: DepartmentStatus[] }> {
  const r = await fetch(`${BASE}/api/departments/status`)
  if (!r.ok) throw new Error('Failed to fetch department status')
  return r.json()
}

export async function addSimulatedPatient(count = 1, emergencySpike = false): Promise<{ added: number; patients: PatientResponse[] }> {
  const r = await fetch(`${BASE}/api/simulation/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count, emergency_spike: emergencySpike }),
  })
  if (!r.ok) throw new Error('Simulation failed')
  return r.json()
}

export async function simulationSpike(): Promise<{ added: number; patients: PatientResponse[] }> {
  const r = await fetch(`${BASE}/api/simulation/spike`, { method: 'POST' })
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
  const r = await fetch(`${BASE}/api/fairness`)
  if (!r.ok) throw new Error('Failed to fetch fairness')
  return r.json()
}

export async function getAdminPatients(risk?: string): Promise<{ patients: PatientResponse[]; total: number }> {
  const url = risk ? `${BASE}/api/admin/patients?risk=${risk}` : `${BASE}/api/admin/patients`
  const r = await fetch(url)
  if (!r.ok) throw new Error('Failed to fetch patients')
  return r.json()
}

export async function exportCSV(risk?: string): Promise<Blob> {
  const url = risk ? `${BASE}/api/admin/export?risk=${risk}` : `${BASE}/api/admin/export`
  const r = await fetch(url)
  if (!r.ok) throw new Error('Export failed')
  return r.blob()
}

export async function getSyntheticSummary(): Promise<{ summary: { test_accuracy?: number; class_distribution?: Record<string, number>; total_samples?: number; version?: string; trained_at?: string } | null; error?: string }> {
  const r = await fetch(`${BASE}/api/admin/synthetic/summary`)
  if (!r.ok) throw new Error('Failed to fetch summary')
  return r.json()
}

export async function regenerateSynthetic(nSamples: number): Promise<{ ok: boolean; summary: unknown }> {
  const r = await fetch(`${BASE}/api/admin/synthetic/regenerate?n_samples=${nSamples}`, { method: 'POST' })
  if (!r.ok) throw new Error('Regenerate failed')
  return r.json()
}

export async function getModelInfo(): Promise<{ version?: string; test_accuracy?: number; trained_at?: string; classes?: string[]; error?: string }> {
  const r = await fetch(`${BASE}/api/admin/model`)
  if (!r.ok) throw new Error('Failed to fetch model')
  return r.json()
}

export async function retrainModel(nSamples = 2500): Promise<{ ok: boolean; summary: unknown }> {
  const r = await fetch(`${BASE}/api/admin/model/retrain?n_samples=${nSamples}`, { method: 'POST' })
  if (!r.ok) throw new Error('Retrain failed')
  return r.json()
}
