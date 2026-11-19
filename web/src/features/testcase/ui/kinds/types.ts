import type { ComponentType } from 'react'
import type { Snapshot, StepDef, StepKindName, TestCaseEngine, Txt } from '../../engine'

/** Turns any engine text (`Txt`, key, number) into a string in the current language: `resolveText(x, t, engine.ctx())`. */
export type Resolve = (x: Txt | string | number | null | undefined) => string

/** Props of every step-card component (one per `StepDef.kind`). */
export interface KindProps {
  engine: TestCaseEngine
  snap: Snapshot
  step: StepDef
  r: Resolve
  /** A run is on or paused ("Run it for me", the Judge path): no network calls. */
  running?: boolean
}

/** Props of the phone and the two app windows for a family of cases (safety, prevention, family). */
export interface ScreenProps {
  engine: TestCaseEngine
  snap: Snapshot
  r: Resolve
}

/** Step kind -> card component. Safety (S3) and prevention/family (S4) each export one; the app (S5) merges them. */
export type KindRegistry = Partial<Record<StepKindName, ComponentType<KindProps>>>

/** The screens a case family supplies to the layout's phone, web and noa regions. */
export interface ScreenSet {
  Phone: ComponentType<ScreenProps>
  Web: ComponentType<ScreenProps>
  Noa?: ComponentType<ScreenProps>
}
