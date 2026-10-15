import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getDownloadURL, getStorage, ref } from 'firebase/storage'

/**
 * The Firebase web app (contract section 6: the web config is public by design). Anonymous Auth only: the token
 * proves the call comes from our web app; it is not a per-member login (contract 4.1).
 */
const env = import.meta.env
const config = {
  apiKey: String(env.VITE_FIREBASE_API_KEY ?? '').trim(),
  authDomain: String(env.VITE_FIREBASE_AUTH_DOMAIN ?? '').trim(),
  projectId: String(env.VITE_FIREBASE_PROJECT_ID ?? '').trim(),
  storageBucket: String(env.VITE_FIREBASE_STORAGE_BUCKET ?? '').trim(),
  appId: String(env.VITE_FIREBASE_APP_ID ?? '').trim(),
}

/** True when the env has enough to start the app (API key, project and app ID). */
export const firebaseConfigured = (): boolean => Boolean(config.apiKey && config.projectId && config.appId)

let app: FirebaseApp | null = null

function firebaseApp(): FirebaseApp {
  if (!firebaseConfigured()) throw new Error('Firebase is not configured: set VITE_FIREBASE_* in web/.env.local')
  app ??= initializeApp(config)
  return app
}

let signingIn: Promise<User> | null = null

/** Resolves with the signed-in anonymous user, signing in once if needed. A failed attempt can be retried. */
export function ensureUser(): Promise<User> {
  signingIn ??= new Promise<User>((resolve, reject) => {
    const auth = getAuth(firebaseApp())
    const stop = onAuthStateChanged(auth, (user) => {
      if (!user) return
      stop()
      resolve(user)
    }, reject)
    signInAnonymously(auth).catch((e: unknown) => {
      stop()
      reject(e)
    })
  }).catch((e: unknown) => {
    signingIn = null
    throw e
  })
  return signingIn
}

/** Firebase ID token for `Authorization: Bearer` on core-api routes. */
export async function idToken(): Promise<string> {
  return (await ensureUser()).getIdToken()
}

/** Firestore, after anonymous sign-in (rules: read if `request.auth != null`). */
export async function db(): Promise<Firestore> {
  await ensureUser()
  return getFirestore(firebaseApp())
}

/** A playable URL for an `audio/...` path from an incident (Storage rules: read with auth). */
export async function audioUrl(path: string): Promise<string> {
  await ensureUser()
  return getDownloadURL(ref(getStorage(firebaseApp()), path))
}
