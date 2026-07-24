/**
 * Jumu‘ah (Friday) detection. Islamic Friday spans from Maghrib on Thursday
 * to Maghrib on Friday, but for a purely presentational banner we use the
 * viewer's local calendar Friday. Pure function, no network, safe to call
 * on every render.
 */
export function isJumuahDay(date: Date = new Date()): boolean {
  return date.getDay() === 5;
}

/**
 * Between Thursday evening (18:00 local) and Friday 23:59 local, we consider
 * the "Jumu‘ah window" open — this is when the reminder banner is useful.
 */
export function isJumuahWindow(date: Date = new Date()): boolean {
  const day = date.getDay();
  const hour = date.getHours();
  if (day === 5) return true;
  if (day === 4 && hour >= 18) return true;
  return false;
}
