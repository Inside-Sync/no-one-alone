import { useTranslation } from 'react-i18next'

export function BrandMark() {
  const { t } = useTranslation()
  return (
    <div className="brand">
      <span className="logo" aria-hidden="true"></span>
      <span>
        <b>No One Alone</b>
        <small>{t('nav.brandBy')}</small>
      </span>
    </div>
  );
}
