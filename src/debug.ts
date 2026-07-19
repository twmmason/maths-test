/**
 * Debug mode — for testing any combo of parts in any mission without doing
 * the maths. Enable with `?debug` in the URL (persists), disable with
 * `?debug=off`. While on:
 *  - all mission destinations are unlocked in the Hangar
 *  - the VAB gets a "certify all attached parts" button (skips Wrench Time)
 *  - Pre-flight launches immediately (no checklist, no required-parts gate)
 */
export function isDebugMode(): boolean {
  if (typeof window === "undefined") return false;
  const q = window.location.search + window.location.hash;
  if (q.includes("debug=off")) localStorage.removeItem("rocketlab-debug");
  else if (/[?&#]debug/.test(q)) localStorage.setItem("rocketlab-debug", "1");
  return localStorage.getItem("rocketlab-debug") === "1";
}

export function setDebugMode(on: boolean): void {
  if (on) localStorage.setItem("rocketlab-debug", "1");
  else localStorage.removeItem("rocketlab-debug");
}