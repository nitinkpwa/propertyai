/** Client-side onboarding persistence. Presentation-only — no server state. */

export const ONBOARDING_COMPLETED_KEY = "areaiq_onboarding_completed";
export const ONBOARDING_ACTIVE_KEY = "areaiq_onboarding_active";
export const ONBOARDING_STEP_KEY = "areaiq_onboarding_step";
export const ONBOARDING_RESTART_EVENT = "areaiq:restart-onboarding";

export function isOnboardingCompleted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === "true";
  } catch {
    return true;
  }
}

export function markOnboardingCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
    sessionStorage.removeItem(ONBOARDING_ACTIVE_KEY);
    sessionStorage.removeItem(ONBOARDING_STEP_KEY);
  } catch {
    /* private mode / quota */
  }
}

export function clearOnboardingCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  } catch {
    /* ignore */
  }
}

export function isOnboardingActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(ONBOARDING_ACTIVE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setOnboardingActive(active: boolean, step = 0): void {
  if (typeof window === "undefined") return;
  try {
    if (active) {
      sessionStorage.setItem(ONBOARDING_ACTIVE_KEY, "true");
      sessionStorage.setItem(ONBOARDING_STEP_KEY, String(step));
    } else {
      sessionStorage.removeItem(ONBOARDING_ACTIVE_KEY);
      sessionStorage.removeItem(ONBOARDING_STEP_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function getOnboardingStep(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(ONBOARDING_STEP_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function setOnboardingStep(step: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ONBOARDING_STEP_KEY, String(step));
  } catch {
    /* ignore */
  }
}

export function requestOnboardingRestart(): void {
  if (typeof window === "undefined") return;
  clearOnboardingCompleted();
  setOnboardingActive(true, 0);
  window.dispatchEvent(new CustomEvent(ONBOARDING_RESTART_EVENT));
}
