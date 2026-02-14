export interface ProbabilityBreakdown {
  low: number
  medium: number
  high: number
}

export interface AbnormalityAlert {
  field: string
  message: string
  severity: string
}

export interface ShapContribution {
  name: string
  contribution: number
}

export interface FeatureImportance {
  name: string
  importance: number
}

export interface Explainability {
  top_contributing_features: { name: string; value: number; impact: string }[]
  abnormal_vitals: { name: string; value: number | string; normal_range: string }[]
  department_reasoning: string
  shap_contributions?: ShapContribution[] | null
  feature_importance?: FeatureImportance[] | null
}

export interface ChatState {
  mode?: string
  step?: number
  collected_symptoms?: string[]
  [key: string]: unknown
}

export interface ChatResponse {
  reply: string
  chat_state: ChatState
  collected_symptoms: string[]
}

export interface EhrUploadResult {
  extracted_text: string
  extracted_symptoms: string[]
  highlights: { symptom: string; start: number; end: number; matched_text: string }[]
  snippet: string
  error: string | null
}

export interface PatientResponse {
  patient_id: string
  age: number
  gender: string
  symptoms: string[]
  heart_rate: number
  blood_pressure_systolic: number
  blood_pressure_diastolic: number
  temperature: number
  spo2: number
  chronic_disease_count: number
  respiratory_rate: number
  pain_score: number
  symptom_duration: number
  pre_existing_conditions: string[]
  abnormality_alerts: AbnormalityAlert[]
  risk_level: string
  confidence_score: number
  probability_breakdown: ProbabilityBreakdown
  priority_score: number
  recommended_department: string
  reasoning_summary: string
  explainability: Explainability
  created_at: string
  routed_department?: string | null
  routing_message?: string | null
  severity_timeline?: string | null
  estimated_wait_minutes?: number | null
}

export interface DepartmentStatus {
  department: string
  max_capacity: number
  current_patients: number
  load_percentage: number
  overloaded: boolean
}

export interface DashboardData {
  total_patients_today: number
  high_risk_count: number
  medium_risk_count: number
  low_risk_count: number
  risk_distribution: { high: number; medium: number; low: number }
  department_distribution: Record<string, number>
}
