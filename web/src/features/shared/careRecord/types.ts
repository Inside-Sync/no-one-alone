/** One of the six stages of a care record (Summary, History, Screening, Results, Treatment, Follow-up). */
export interface CareStep {
  /** Stable id used in the `?step=` query and by `onSelect`. */
  id: string
  /** Display text. */
  label: string
}

/** A chart entry as shown in the drawer. Every string is display text, already translated by the caller. */
export interface CareEntry {
  /** Stable id; `related` and `onOpen` refer to it. */
  id: string
  /** Heading of the entry. */
  title: string
  /** Display name of the stage the entry belongs to (first pill). */
  stage: string
  /** Display name of the entry type, for example "Medicines" (second pill). */
  kind: string
  /** When it happened, in the caller's own format. */
  when: string
  /** Where and who, already joined, for example "Corniche Stroke Centre · Dr Sara Al Mazrouei". */
  where: string
  /** One plain sentence about the entry; an empty string hides it. */
  summary: string
  /** Findings as `[label, value]` rows. */
  findings: ReadonlyArray<readonly [label: string, value: string]>
  /** Ids of related entries, shown as chips that open them. */
  related: readonly string[]
  /** Where the data came from. */
  source: string
}

/** All wording the shared care-record components show. The components own no text. */
export interface CareLabels {
  /** Accessible name of the stepper list. */
  stepsAria: string
  /** `Back: Results` style text for the previous step. */
  backTo: (stepLabel: string) => string
  /** `Next: Follow-up` style text for the next step. */
  nextTo: (stepLabel: string) => string
  /** Heading above the related chips ("Related"). */
  related: string
  /** Position text of an entry, for example "19 / 23". */
  position: (index: number, total: number) => string
  /** Pill shown instead of a next button on the last entry ("Today"). */
  last: string
  /** Accessible name of the previous / next entry buttons' group. */
  entryNavAria: string
  /** Text of the button that opens the whole-case player ("Whole case, start to finish"). */
  startCase: string
  /** Drawer title of the whole-case player. */
  caseTitle: string
  /** Close button of the player. */
  close: string
  /** Optional: when set, the entry summary sits below the findings in a boxed note headed with this text (clinical wording). */
  summaryLabel?: string
}
