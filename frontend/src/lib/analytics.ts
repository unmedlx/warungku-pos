/*
 * ==========================================
 * OFFLINE MODE - GOOGLE ANALYTICS DISABLED
 * ==========================================
 * Google Analytics functionality has been disabled for offline mode.
 * All analytics tracking features are now stubbed.
 */

const OPT_OUT_KEY = 'kg_analytics_opt_out';

/** True when the user has explicitly opted out of analytics. Default: tracking on. */
export function isAnalyticsOptedOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === '1';
  } catch {
    return false;
  }
}

/** Convenience inverse used by the Settings toggle. */
export function isAnalyticsEnabled(): boolean {
  return !isAnalyticsOptedOut();
}

/** Persist the user's choice. */
export function setAnalyticsEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.removeItem(OPT_OUT_KEY);
    } else {
      localStorage.setItem(OPT_OUT_KEY, '1');
    }
  } catch {
    // ignore storage errors (private mode, etc.)
  }
}

/** Initialize analytics - no-op in offline mode */
export function initAnalytics(): void {
  // No-op in offline mode
}

/** Send a SPA page_view - no-op in offline mode */
export function trackPageView(path: string): void {
  // No-op in offline mode
}

/** Send a custom event - no-op in offline mode */
export function trackEvent(name: string, params?: Record<string, string | number | boolean>): void {
  // No-op in offline mode
}
