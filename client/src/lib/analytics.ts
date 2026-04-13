/**
 * Umami analytics helper.
 * Tracks custom events via the global `umami` object injected by the Umami script.
 * Gracefully no-ops if Umami is not loaded (e.g. blocked by ad-blocker or missing in dev).
 */

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, string | number | boolean>) => void;
    };
  }
}

export function trackEvent(event: string, data?: Record<string, string | number | boolean>) {
  try {
    window.umami?.track(event, data);
  } catch {
    // silently ignore — analytics should never break the app
  }
}

// Emails excluded from analytics tracking
const EXCLUDED_EMAILS = [
  'bodrovphone@gmail.com',
  'bodrovphone+e2e@gmail.com',
];

/**
 * Set umami.disabled in localStorage for excluded accounts.
 * Umami's tracker checks this flag and skips all tracking when set to '1'.
 */
export function configureAnalyticsForUser(email: string | undefined | null) {
  try {
    if (email && EXCLUDED_EMAILS.includes(email)) {
      localStorage.setItem('umami.disabled', '1');
    } else {
      localStorage.removeItem('umami.disabled');
    }
  } catch {
    // ignore — localStorage may be unavailable
  }
}

// Pre-defined event names for consistency
export const EVENTS = {
  // Navigation
  NAV_LOGIN: 'nav-login-click',
  NAV_SIGNUP: 'nav-signup-click',

  // Hero
  HERO_START_FREE: 'hero-start-free-click',
  HERO_LOGIN: 'hero-login-click',
  HERO_WATCH_DEMO: 'hero-watch-demo-click',

  // Pricing
  PRICING_CTA: 'pricing-cta-click',

  // Bottom CTA
  CTA_GET_STARTED: 'cta-get-started-click',

  // Footer
  FOOTER_LINKEDIN: 'footer-linkedin-click',
  FOOTER_PODCAST: 'footer-podcast-click',

  // Podcast page
  PODCAST_PLAY: 'podcast-play',
  PODCAST_PAUSE: 'podcast-pause',
} as const;
