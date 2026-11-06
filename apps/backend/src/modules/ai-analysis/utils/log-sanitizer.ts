const REDACT_PATTERNS: Array<[RegExp, string]> = [
  [/password\s*[=:]\s*\S+/gi, "password=[REDACTED]"],
  [/(?:api[_-]?key|apikey)\s*[=:]\s*\S+/gi, "api_key=[REDACTED]"],
  [/secret\s*[=:]\s*\S+/gi, "secret=[REDACTED]"],
  [/token\s*[=:]\s*\S+/gi, "token=[REDACTED]"],
  [/authorization\s*:\s*bearer\s+\S+/gi, "Authorization: Bearer [REDACTED]"],
  [/\b[A-Za-z0-9+/]{24,}={0,2}\b/g, "[BASE64]"],
];

const MAX_LENGTH = 8000;

export function sanitizeLogs(raw: string): string {
  let result = raw;
  for (const [pattern, replacement] of REDACT_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  if (result.length > MAX_LENGTH) {
    result = "..." + result.slice(result.length - MAX_LENGTH);
  }
  return result;
}
