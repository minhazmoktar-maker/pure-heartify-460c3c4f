// Strips known PII fields and truncates freeform strings before analytics rows
// hit the database. Analytics properties are typed as JSONB, so any component
// could accidentally log emails, tokens, or full-text search queries with
// personal detail. This is a single choke point every emitter goes through.

const PII_KEY_PATTERNS = [
  /email/i,
  /phone/i,
  /token/i,
  /secret/i,
  /password/i,
  /jwt/i,
  /api[_-]?key/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /credit[_-]?card/i,
  /ssn/i,
];

const MAX_STRING = 512;
const MAX_DEPTH = 4;

export function sanitizeAnalyticsProperties(
  input: unknown,
  depth = 0,
): Record<string, unknown> | null {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) return null;
  if (depth > MAX_DEPTH) return {};

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (PII_KEY_PATTERNS.some((rx) => rx.test(key))) continue;
    out[key] = sanitizeValue(value, depth + 1);
  }
  return out;
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value == null) return value;
  if (typeof value === 'string') {
    // Strip obvious emails inside freeform strings.
    const scrubbed = value.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[redacted-email]');
    return scrubbed.length > MAX_STRING ? scrubbed.slice(0, MAX_STRING) + '…' : scrubbed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => sanitizeValue(v, depth + 1));
  }
  if (typeof value === 'object') {
    if (depth > MAX_DEPTH) return {};
    return sanitizeAnalyticsProperties(value, depth);
  }
  return null;
}
