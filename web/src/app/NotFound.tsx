import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export function NotFound() {
  const { t } = useTranslation()
  return (
    <main className="grid">
      <article className="glass card c12">
        <div className="ch"><h2>{t('notFound.title')}</h2></div>
        <p className="sub">{t('notFound.text')} <Link to="/individual/home">{t('notFound.link')}</Link></p>
      </article>
    </main>
  )
}
