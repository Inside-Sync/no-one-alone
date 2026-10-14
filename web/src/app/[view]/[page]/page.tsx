import { RoutedPage } from '@/features/RoutedPage'
import { allRoutes } from '@/domain/views'

export const dynamicParams = false

export function generateStaticParams() {
  return allRoutes()
}

export default async function Page({ params }: { params: Promise<{ view: string; page: string }> }) {
  const { view, page } = await params
  return <RoutedPage view={view} page={page} />
}
