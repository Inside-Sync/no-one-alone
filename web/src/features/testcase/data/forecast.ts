// Ported from the Test case prototype (new4.html). Numbers and ranges are the prototype's; the model is a demo, not clinical guidance.

/**
 * Framingham general cardiovascular disease, 10-year risk (D'Agostino RB Sr et al., Circulation 2008;117:743-753).
 * `lab` uses total and HDL cholesterol; `bmi` is the variant used when cholesterol is not measured yet. `s0` is the baseline
 * survival, `mean` the mean of the linear predictor. Cholesterol is entered in mmol/L and converted to mg/dL with `MGDL`.
 */
export const FRAM = {
  lab: {
    M: { age: 3.06117, tc: 1.1237, hdl: -0.93263, sbp: 1.93303, sbpT: 1.99881, smk: 0.65451, dm: 0.57367, s0: 0.88936, mean: 23.9802 },
    F: { age: 2.32888, tc: 1.20904, hdl: -0.70833, sbp: 2.76157, sbpT: 2.82263, smk: 0.52873, dm: 0.69154, s0: 0.95012, mean: 26.1931 },
  },
  bmi: {
    M: { age: 3.11296, bmi: 0.79277, sbp: 1.85508, sbpT: 1.92672, smk: 0.70953, dm: 0.5316, s0: 0.88431, mean: 23.9388 },
    F: { age: 2.72107, bmi: 0.51125, sbp: 2.81291, sbpT: 2.88267, smk: 0.61868, dm: 0.77763, s0: 0.94833, mean: 26.0145 },
  },
} as const
/** mmol/L to mg/dL for cholesterol. */
export const MGDL = 38.67

/** The score is valid from this age to this age (inclusive), for people with no known heart attack or stroke. */
export const FRAM_AGE = { min: 30, max: 74 } as const

/** Risk category cut-offs (10-year risk): 20% or more is high, 10% or more is moderate (rule F1 / F2). */
export const FC_CUTS = { high: 0.2, mid: 0.1 } as const

/** Reference person for the heart age: sbp 125 untreated, no smoking, no diabetes, total cholesterol 180 mg/dL, HDL 45 mg/dL, BMI 22.5. */
export const HEART_AGE_REF = { sbp: 125, tcMgdl: 180, hdlMgdl: 45, bmi: 22.5, from: 30, to: 100, iterations: 40 } as const

/** Plausible range of every editable family-profile field (the prototype's slider limits). `step` is the slider step. */
export const FAMILY_RANGES = {
  age: { min: 18, max: 90, step: 1 },
  sbp: { min: 90, max: 200, step: 1 },
  bmi: { min: 16, max: 45, step: 0.5 },
  tc: { min: 2.5, max: 10, step: 0.1 },
  hdl: { min: 0.5, max: 3, step: 0.1 },
  sbpTrend: { min: -5, max: 8, step: 1 },
  bmiTrend: { min: -2, max: 2, step: 0.1 },
  ageM: { min: 1, max: 72, step: 1 },
  overdueW: { min: 0, max: 12, step: 1 },
} as const
export type RangeField = keyof typeof FAMILY_RANGES

/** Plausible range of the sensor inputs of the safety cases (the prototype's sliders). */
export const SAFETY_RANGES = {
  hr: { min: 45, max: 180, step: 1 },
  dur: { min: 0, max: 20, step: 1 },
  floor: { min: 0, max: 30, step: 1 },
  glu: { min: 1.5, max: 15, step: 0.1 },
  spo2: { min: 80, max: 100, step: 1 },
  wt: { min: -2, max: 4, step: 0.1 },
} as const
export type SafetyRangeField = keyof typeof SAFETY_RANGES

/** Plausible range of the prevention inputs (age is months for children, years for adults). */
export const PREV_RANGES = {
  ageChild: { min: 0, max: 84, step: 1 },
  ageAdult: { min: 16, max: 85, step: 1 },
  overdue: { min: 0, max: 26, step: 1 },
  rem: { min: 0, max: 6, step: 1 },
} as const

/**
 * The adult in the "Adult screening never done" case (ifhas): the prototype shows a forecast with these fixed values next to the
 * HbA1c the person enters (age comes from the case input; diabetes switches on from HbA1c 6.5).
 */
export const IFHAS_FORECAST = { sex: 'M', sbp: 142, bpTx: false, smoker: true, tc: 6.4, hdl: 0.9, bmi: 29, sbpTrend: 3, bmiTrend: 0.5, hba1cDm: 6.5 } as const

/**
 * Where each adult's blood pressure and weight come from (prototype famSignals reads this from the member's device text):
 * `app` = BP cuff via the InsideSync app, `cuff` = home BP cuff, `clinic` = clinic reading; weight `scale` = smart scale via the
 * InsideSync app, `clinic` = last clinic visit.
 */
export const FAMILY_DEVICES: Record<string, { bp: 'app' | 'cuff' | 'clinic'; wt: 'scale' | 'clinic' }> = {
  moza: { bp: 'cuff', wt: 'clinic' },
  saeed: { bp: 'cuff', wt: 'clinic' },
  khalid: { bp: 'app', wt: 'scale' },
  amna: { bp: 'app', wt: 'clinic' },
  maitha: { bp: 'clinic', wt: 'clinic' },
  sultan: { bp: 'clinic', wt: 'clinic' },
}
