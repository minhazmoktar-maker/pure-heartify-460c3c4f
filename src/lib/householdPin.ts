// Household PIN — client-side gate so a child cannot disable Kids Mode
// without the caregiver's 4-digit PIN. Stored as a salted SHA-256 hash so a
// casual glance at localStorage does not reveal the code. This is a UX lock,
// not a cryptographic control — server-side enforcement is unnecessary because
// Kids Mode is a personalization preference, not an authorization boundary.

const HASH_KEY = "heartify:household_pin_hash";
const SALT_KEY = "heartify:household_pin_salt";

function randomSalt(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hasHouseholdPin(): boolean {
  try {
    return !!window.localStorage.getItem(HASH_KEY);
  } catch {
    return false;
  }
}

export async function setHouseholdPin(pin: string): Promise<void> {
  const salt = randomSalt();
  const hash = await sha256(`${salt}:${pin}`);
  window.localStorage.setItem(SALT_KEY, salt);
  window.localStorage.setItem(HASH_KEY, hash);
}

export async function verifyHouseholdPin(pin: string): Promise<boolean> {
  const salt = window.localStorage.getItem(SALT_KEY);
  const hash = window.localStorage.getItem(HASH_KEY);
  if (!salt || !hash) return false;
  const candidate = await sha256(`${salt}:${pin}`);
  return candidate === hash;
}

export function clearHouseholdPin(): void {
  window.localStorage.removeItem(HASH_KEY);
  window.localStorage.removeItem(SALT_KEY);
}
