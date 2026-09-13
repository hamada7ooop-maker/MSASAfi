/**
 * a11y.ts — shared accessibility primitives.
 *
 * Two concerns live here because both were previously handled ad hoc, or not
 * at all:
 *
 * 1. MOTION. The stylesheets honour `prefers-reduced-motion` with a blanket
 *    rule that collapses CSS animations and transitions. That rule cannot
 *    reach animation driven from JavaScript — a requestAnimationFrame counter
 *    or a canvas-confetti burst runs at full intensity regardless. For a user
 *    who set that preference because motion triggers nausea or vestibular
 *    symptoms, a screenful of particles is exactly what they asked the system
 *    to prevent.
 *
 * 2. ANNOUNCEMENTS. Toasts are how the app confirms that money moved — saved,
 *    deleted, transferred, failed. They were rendered as plain divs, so a
 *    screen-reader user got silence: no confirmation that a transaction was
 *    recorded, and no warning that it failed.
 *
 * Both are deliberately dependency-free so they can be called from anywhere,
 * including non-React modules like toast.ts.
 */

/**
 * True when the user has asked the platform to minimise non-essential motion.
 *
 * Evaluated per call rather than cached: the preference can change while the
 * app is open (OS setting, or a device switching to battery saver), and these
 * call sites are all user-initiated and infrequent, so the cost is irrelevant.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    // Some embedded WebViews throw on unsupported queries. Motion is the
    // historical default, so fall back to allowing it.
    return false;
  }
}

/** Subscribe to changes in the motion preference. Returns an unsubscribe fn. */
export function onReducedMotionChange(cb: (reduced: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  try {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => cb(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  } catch {
    return () => {};
  }
}

/**
 * Run a celebratory effect only when motion is welcome.
 *
 * The reward still happens for reduced-motion users — the toast, the points,
 * the updated total — they simply do not get the particle storm. Accessibility
 * here means removing the animation, not the achievement.
 */
export function celebrate(effect: () => void): void {
  if (prefersReducedMotion()) return;
  try {
    effect();
  } catch {
    // A decorative effect must never break the flow that triggered it.
  }
}

// ── Screen-reader announcements ────────────────────────────────────────────

const LIVE_REGION_ID = 'masarifi-live-region';

/**
 * A single visually-hidden live region, created lazily and reused.
 *
 * One shared region is deliberate: multiple live regions compete and screen
 * readers may drop or reorder their messages.
 */
function getLiveRegion(): HTMLElement | null {
  if (typeof document === 'undefined') return null;

  let region = document.getElementById(LIVE_REGION_ID);
  if (region) return region;

  region = document.createElement('div');
  region.id = LIVE_REGION_ID;
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  region.setAttribute('role', 'status');

  // Visually hidden but still announced. `display:none` and
  // `visibility:hidden` would remove it from the accessibility tree entirely.
  Object.assign(region.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    padding: '0',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
    border: '0',
  });

  document.body.appendChild(region);
  return region;
}

/**
 * Announce a message to assistive technology.
 *
 * @param message What to say.
 * @param assertive Interrupt the user. Reserve for errors — a polite
 *   announcement waits for a pause, which is right for confirmations but wrong
 *   for "payment failed".
 */
export function announce(message: string, assertive = false): void {
  const region = getLiveRegion();
  if (!region || !message) return;

  region.setAttribute('aria-live', assertive ? 'assertive' : 'polite');

  // Re-announce identical consecutive messages: a live region only fires on
  // content CHANGE, so saving twice in a row would be announced once. Clearing
  // first forces the second announcement.
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
}
