export type FieldType = 'number' | 'categorical'

export interface PatientFieldConfig {
  name: string
  alias: string
  label: string
  type: FieldType
  section: FieldSectionId
  allowedValues?: string[]
  helper?: string
}

export type FieldSectionId =
  | 'profile'
  | 'history'
  | 'physical'
  | 'labs'
  | 'ecg'
  | 'cardiac'

export interface PatientFieldSection {
  id: FieldSectionId
  title: string
  description: string
}

export type FormValues = Record<string, string>
export type FormErrors = Record<string, string>

