'use client'

import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import './shell.css'
import { useTestCase } from './TestCaseContext'

/** Header button after "Moza's case" (`#runCase`), in the same style family. */
export function TestCaseButton() {
  const { t } = useTranslation('testcaseShell')
  const tc = useTestCase()
  return (
    <button type="button" className="btn" id="runTest" aria-label={t('button.label')} aria-haspopup="dialog" onClick={() => tc.open()}>
      <span className="ic"><Icon name="flask-conical" /></span>
      <span className="t">{t('button.label')}</span>
    </button>
  )
}
