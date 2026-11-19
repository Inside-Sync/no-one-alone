'use client'

import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import './shell.css'
import { useTestCase } from './TestCaseContext'

/** The glass card under the header on every view, with a brand border (prototype `#tcBanner`). */
export function TestCaseBanner() {
  const { t } = useTranslation('testcaseShell')
  const tc = useTestCase()
  return (
    <section className="glass tc-banner" id="tcBanner" aria-labelledby="tcBannerT">
      <div className="tc-banner-txt">
        <b id="tcBannerT">{t('banner.title')}</b>
        <span>{t('banner.text')}</span>
      </div>
      <button type="button" className="btn" id="tcBannerBtn" aria-haspopup="dialog" onClick={() => tc.openJudge()}>
        <span className="ic"><Icon name="play" /></span>
        {t('banner.start')}
      </button>
    </section>
  )
}
