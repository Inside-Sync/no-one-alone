import { useTranslation } from 'react-i18next'
import { AgentOrb } from '@/components/noa/AgentOrb'

export function BrandMark() {
  const { t } = useTranslation()
  return (
    <div className="brand">
      <span className="logo"><AgentOrb size={44} /></span>
      <span>
        <b>No One Alone</b>
        <small>{t('nav.brandBy')}</small>
      </span>
    </div>
  );
}
