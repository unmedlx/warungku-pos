/*
 * ==========================================
 * OFFLINE MODE - GOOGLE AUTH DISABLED
 * ==========================================
 * Google Authentication functionality has been disabled for offline mode.
 * All auth-related features are now stubs.
 */

/** Login Google native; mengembalikan Google ID token (JWT). */
export async function nativeGoogleSignIn(): Promise<string> {
  throw new Error('Google auth disabled in offline mode');
}

/** Logout dari sesi Google native (best-effort). */
export async function nativeGoogleSignOut(): Promise<void> {
  // No-op in offline mode
}
