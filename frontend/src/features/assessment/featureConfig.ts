import { z } from "zod"

export type ControlType = "text" | "number" | "segmented" | "select"

export interface FieldOption {
  value: string
  label: string
}

export interface FieldConfig {
  key: string
  label: string
  step: number
  control: ControlType
  unit?: string
  range?: [number, number]
  options?: FieldOption[]
  disabled?: boolean
  readOnly?: boolean
  hint?: string
}

const YN_01: FieldOption[] = [
  { value: "0", label: "No" },
  { value: "1", label: "Yes" },
]

const YN_NY: FieldOption[] = [
  { value: "N", label: "No" },
  { value: "Y", label: "Yes" },
]

export const assessmentSteps = [
  { id: 1, title: "Patient & Vitals", shortTitle: "Vitals" },
  { id: 2, title: "Risk Factors & History", shortTitle: "History" },
  { id: 3, title: "Chest Pain & Angina", shortTitle: "Angina" },
  { id: 4, title: "Physical Exam", shortTitle: "Physical" },
  { id: 5, title: "Labs: Metabolic & Renal", shortTitle: "Labs 1" },
  { id: 6, title: "Labs: Hematology & Inflammation", shortTitle: "Labs 2" },
  { id: 7, title: "ECG", shortTitle: "ECG" },
  { id: 8, title: "Echocardiography", shortTitle: "Echo" },
]

export const assessmentFields: FieldConfig[] = [
  // Step 1
  { key: "name", label: "Patient full name", step: 1, control: "text" },
  { key: "age", label: "Age", step: 1, control: "number", unit: "years", range: [18, 100] },
  { key: "sex", label: "Sex", step: 1, control: "segmented", options: [{ value: "Male", label: "Male" }, { value: "Fmale", label: "Female" }] },
  { key: "weight", label: "Weight", step: 1, control: "number", unit: "kg", range: [30, 200] },
  { key: "length", label: "Height", step: 1, control: "number", unit: "cm", range: [120, 220] },
  { key: "bmi", label: "BMI", step: 1, control: "number", unit: "kg/m²", readOnly: true, hint: "Calculated" },
  { key: "bp", label: "Systolic blood pressure", step: 1, control: "number", unit: "mmHg", range: [70, 240] },
  { key: "pr", label: "Pulse rate", step: 1, control: "number", unit: "bpm", range: [40, 180] },

  // Step 2
  { key: "dm", label: "Diabetes mellitus", step: 2, control: "segmented", options: YN_01 },
  { key: "htn", label: "Hypertension", step: 2, control: "segmented", options: YN_01 },
  { key: "current_smoker", label: "Current smoker", step: 2, control: "segmented", options: YN_01 },
  { key: "ex_smoker", label: "Ex-smoker", step: 2, control: "segmented", options: YN_01 },
  { key: "fh", label: "Family history of premature CAD", step: 2, control: "segmented", options: YN_01 },
  { key: "obesity", label: "Obesity (BMI ≥ 30)", step: 2, control: "segmented", options: YN_NY },
  { key: "crf", label: "Chronic renal failure", step: 2, control: "segmented", options: YN_NY },
  { key: "cva", label: "Stroke / CVA", step: 2, control: "segmented", options: YN_NY },
  { key: "airway_disease", label: "Airway disease (COPD / asthma)", step: 2, control: "segmented", options: YN_NY },
  { key: "thyroid_disease", label: "Thyroid disease", step: 2, control: "segmented", options: YN_NY },
  { key: "chf", label: "Congestive heart failure", step: 2, control: "segmented", options: YN_NY },
  { key: "dlp", label: "Dyslipidemia", step: 2, control: "segmented", options: YN_NY },

  // Step 3
  { key: "typical_chest_pain", label: "Typical chest pain", step: 3, control: "segmented", options: YN_01 },
  { key: "atypical", label: "Atypical chest pain", step: 3, control: "segmented", options: YN_NY },
  { key: "nonanginal", label: "Non-anginal chest pain", step: 3, control: "segmented", options: YN_NY },
  { key: "exertional_cp", label: "Exertional chest pain", step: 3, control: "segmented", options: YN_NY, disabled: true, hint: "This model accepts only 'No' for this field" },
  { key: "lowth_ang", label: "Low-threshold angina", step: 3, control: "segmented", options: YN_NY },

  // Step 4
  { key: "edema", label: "Peripheral edema", step: 4, control: "segmented", options: YN_01 },
  { key: "weak_peripheral_pulse", label: "Weak peripheral pulse", step: 4, control: "segmented", options: YN_NY },
  { key: "lung_rales", label: "Lung rales", step: 4, control: "segmented", options: YN_NY },
  { key: "systolic_murmur", label: "Systolic murmur", step: 4, control: "segmented", options: YN_NY },
  { key: "diastolic_murmur", label: "Diastolic murmur", step: 4, control: "segmented", options: YN_NY },
  { key: "dyspnea", label: "Dyspnea", step: 4, control: "segmented", options: YN_NY },
  { key: "function_class", label: "NYHA functional class", step: 4, control: "select", options: [{ value: "0", label: "0" }, { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }] },

  // Step 5
  { key: "fbs", label: "Fasting blood sugar", step: 5, control: "number", unit: "mg/dL", range: [50, 500] },
  { key: "cr", label: "Creatinine", step: 5, control: "number", unit: "mg/dL", range: [0.2, 15.0] },
  { key: "tg", label: "Triglycerides", step: 5, control: "number", unit: "mg/dL", range: [30, 1000] },
  { key: "ldl", label: "LDL cholesterol", step: 5, control: "number", unit: "mg/dL", range: [20, 400] },
  { key: "hdl", label: "HDL cholesterol", step: 5, control: "number", unit: "mg/dL", range: [10, 150] },
  { key: "bun", label: "Blood urea nitrogen", step: 5, control: "number", unit: "mg/dL", range: [2, 100] },
  { key: "k", label: "Potassium", step: 5, control: "number", unit: "mEq/L", range: [2.0, 8.0] },
  { key: "na", label: "Sodium", step: 5, control: "number", unit: "mEq/L", range: [100, 170] },

  // Step 6
  { key: "esr", label: "ESR", step: 6, control: "number", unit: "mm/hr", range: [1, 120] },
  { key: "hb", label: "Hemoglobin", step: 6, control: "number", unit: "g/dL", range: [5.0, 20.0] },
  { key: "wbc", label: "White blood cells", step: 6, control: "number", unit: "/mcL", range: [1000, 30000] },
  { key: "lymph", label: "Lymphocytes", step: 6, control: "number", unit: "%", range: [1, 80] },
  { key: "neut", label: "Neutrophils", step: 6, control: "number", unit: "%", range: [10, 95] },
  { key: "plt", label: "Platelets", step: 6, control: "number", unit: "×10³/mcL", range: [20, 800] },

  // Step 7
  { key: "q_wave", label: "Pathological Q wave", step: 7, control: "segmented", options: YN_01 },
  { key: "st_elevation", label: "ST elevation", step: 7, control: "segmented", options: YN_01 },
  { key: "st_depression", label: "ST depression", step: 7, control: "segmented", options: YN_01 },
  { key: "tinversion", label: "T-wave inversion", step: 7, control: "segmented", options: YN_01 },
  { key: "lvh", label: "Left ventricular hypertrophy", step: 7, control: "segmented", options: YN_NY },
  { key: "poor_r_progression", label: "Poor R-wave progression", step: 7, control: "segmented", options: YN_NY },
  { key: "bbb", label: "Bundle branch block", step: 7, control: "select", options: [{ value: "N", label: "None" }, { value: "LBBB", label: "Left (LBBB)" }, { value: "RBBB", label: "Right (RBBB)" }] },

  // Step 8
  { key: "ef_tte", label: "Ejection fraction (TTE)", step: 8, control: "number", unit: "%", range: [10, 80] },
  { key: "region_rwma", label: "Regional wall motion abnormality", step: 8, control: "select", options: [{ value: "0", label: "0 (None)" }, { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4 (Severe)" }] },
  { key: "vhd", label: "Valvular heart disease", step: 8, control: "select", options: [{ value: "N", label: "None" }, { value: "mild", label: "Mild" }, { value: "Moderate", label: "Moderate" }, { value: "Severe", label: "Severe" }] },
]

// Base helpers for zod
const numSchema = (min: number, max: number) => z.union([
  z.number().min(min).max(max),
  z.string().refine(val => {
    if (val === "") return true
    const parsed = Number(val)
    return !isNaN(parsed) && parsed >= min && parsed <= max
  }, { message: `Must be between ${min} and ${max}` }).transform(val => val === "" ? undefined : Number(val))
]).optional()

// Zod schemas per step
export const stepSchemas = {
  1: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(80, "Name is too long"),
    age: numSchema(18, 100).refine(val => val !== undefined, "Required"),
    sex: z.enum(["Male", "Fmale"]),
    weight: numSchema(30, 200).refine(val => val !== undefined, "Required"),
    length: numSchema(120, 220).refine(val => val !== undefined, "Required"),
    bmi: numSchema(10, 60),
    bp: numSchema(70, 240),
    pr: numSchema(40, 180),
  }),
  2: z.object({
    dm: z.enum(["0", "1"]).optional(),
    htn: z.enum(["0", "1"]).optional(),
    current_smoker: z.enum(["0", "1"]).optional(),
    ex_smoker: z.enum(["0", "1"]).optional(),
    fh: z.enum(["0", "1"]).optional(),
    obesity: z.enum(["N", "Y"]).optional(),
    crf: z.enum(["N", "Y"]).optional(),
    cva: z.enum(["N", "Y"]).optional(),
    airway_disease: z.enum(["N", "Y"]).optional(),
    thyroid_disease: z.enum(["N", "Y"]).optional(),
    chf: z.enum(["N", "Y"]).optional(),
    dlp: z.enum(["N", "Y"]).optional(),
  }),
  3: z.object({
    typical_chest_pain: z.enum(["0", "1"]).optional(),
    atypical: z.enum(["N", "Y"]).optional(),
    nonanginal: z.enum(["N", "Y"]).optional(),
    exertional_cp: z.enum(["N", "Y"]).optional(),
    lowth_ang: z.enum(["N", "Y"]).optional(),
  }),
  4: z.object({
    edema: z.enum(["0", "1"]).optional(),
    weak_peripheral_pulse: z.enum(["N", "Y"]).optional(),
    lung_rales: z.enum(["N", "Y"]).optional(),
    systolic_murmur: z.enum(["N", "Y"]).optional(),
    diastolic_murmur: z.enum(["N", "Y"]).optional(),
    dyspnea: z.enum(["N", "Y"]).optional(),
    function_class: z.enum(["0", "1", "2", "3"]).optional(),
  }),
  5: z.object({
    fbs: numSchema(50, 500),
    cr: numSchema(0.2, 15.0),
    tg: numSchema(30, 1000),
    ldl: numSchema(20, 400),
    hdl: numSchema(10, 150),
    bun: numSchema(2, 100),
    k: numSchema(2.0, 8.0),
    na: numSchema(100, 170),
  }),
  6: z.object({
    esr: numSchema(1, 120),
    hb: numSchema(5.0, 20.0),
    wbc: numSchema(1000, 30000),
    lymph: numSchema(1, 80),
    neut: numSchema(10, 95),
    plt: numSchema(20, 800),
  }),
  7: z.object({
    q_wave: z.enum(["0", "1"]).optional(),
    st_elevation: z.enum(["0", "1"]).optional(),
    st_depression: z.enum(["0", "1"]).optional(),
    tinversion: z.enum(["0", "1"]).optional(),
    lvh: z.enum(["N", "Y"]).optional(),
    poor_r_progression: z.enum(["N", "Y"]).optional(),
    bbb: z.enum(["N", "LBBB", "RBBB"]).optional(),
  }),
  8: z.object({
    ef_tte: numSchema(10, 80),
    region_rwma: z.enum(["0", "1", "2", "3", "4"]).optional(),
    vhd: z.enum(["N", "mild", "Moderate", "Severe"]).optional(),
  }),
}

// Full schema is required for final analysis submission
export const fullAssessmentSchema = z.object({
  ...stepSchemas[1].shape,
  ...stepSchemas[2].shape,
  ...stepSchemas[3].shape,
  ...stepSchemas[4].shape,
  ...stepSchemas[5].shape,
  ...stepSchemas[6].shape,
  ...stepSchemas[7].shape,
  ...stepSchemas[8].shape,
}).required()

export type AssessmentFormValues = z.infer<typeof fullAssessmentSchema> & Record<string, any>

export const PRESET_DEMO = {
  name: "Demo Patient",
  age: 53,
  weight: 90,
  length: 175,
  bmi: 29.39,
  bp: 110,
  pr: 80,
  fbs: 90,
  cr: 0.7,
  tg: 250,
  ldl: 155,
  hdl: 30,
  bun: 8,
  esr: 7,
  hb: 15.6,
  k: 4.7,
  na: 141,
  wbc: 5700,
  lymph: 39,
  neut: 52,
  plt: 261,
  ef_tte: 50,
  sex: "Male",
  dm: "0",
  htn: "1",
  current_smoker: "1",
  ex_smoker: "0",
  fh: "0",
  obesity: "Y",
  crf: "N",
  cva: "N",
  airway_disease: "N",
  thyroid_disease: "N",
  chf: "N",
  dlp: "Y",
  edema: "0",
  weak_peripheral_pulse: "N",
  lung_rales: "N",
  systolic_murmur: "N",
  diastolic_murmur: "N",
  typical_chest_pain: "1",
  dyspnea: "N",
  function_class: "0",
  atypical: "N",
  nonanginal: "N",
  exertional_cp: "N",
  lowth_ang: "N",
  q_wave: "0",
  st_elevation: "0",
  st_depression: "1",
  tinversion: "1",
  lvh: "N",
  poor_r_progression: "N",
  bbb: "N",
  region_rwma: "0",
  vhd: "N",
}
