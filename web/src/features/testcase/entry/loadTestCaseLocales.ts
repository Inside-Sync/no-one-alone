import i18n from '@/i18n'

let loading: Promise<void> | null = null

/**
 * The Test case texts (about 470 KB of JSON in both languages) are not part of the app's first load: they are fetched when the overlay
 * first opens and added to i18next as resource bundles, before the body renders. Only `testcaseShell` (banner and button) is eager.
 * Calling it again returns the same promise.
 */
export function loadTestCaseLocales(): Promise<void> {
  loading ??= Promise.all([import('@/locales/en/testcaseLazy'), import('@/locales/ar/testcaseLazy')])
    .then(([en, ar]) => {
      for (const [lng, bundles] of [['en', en.default], ['ar', ar.default]] as const) {
        for (const [ns, res] of Object.entries(bundles)) i18n.addResourceBundle(lng, ns, res, true, true)
      }
    })
    .catch((e: unknown) => { loading = null; throw e })
  return loading
}
