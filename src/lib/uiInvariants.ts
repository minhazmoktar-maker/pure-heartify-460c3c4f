/**
 * Runtime UI invariants.
 *
 * Some regressions are invisible to type-checking and cheap to detect at
 * runtime: an error fallback rendered *while* something is still loading tells
 * a viewer the video is broken before it ever started. When such an invariant
 * breaks we log it and raise a monitoring alert once per session per invariant,
 * so QA and production both surface it instead of relying on someone noticing.
 */
import { reportAlert } from "@/lib/alerts";

const reported = new Set<string>();

export function reportUiInvariant(
  invariant: string,
  detail?: Record<string, unknown>,
): void {
  if (reported.has(invariant)) return;
  reported.add(invariant);
  console.error(`[ui-invariant] ${invariant}`, detail ?? {});
  void reportAlert({
    kind: "ui_invariant",
    severity: "warn",
    message: `UI invariant broken: ${invariant}`,
    context: detail ?? {},
  });
}

/**
 * Assert an invariant holds. `condition === false` reports once.
 * Safe to call from render — reporting is fire-and-forget and de-duplicated.
 */
export function assertUiInvariant(
  condition: boolean,
  invariant: string,
  detail?: Record<string, unknown>,
): void {
  if (condition) return;
  reportUiInvariant(invariant, detail);
}

/** Test helper — forget which invariants were already reported. */
export function resetUiInvariants(): void {
  reported.clear();
}
