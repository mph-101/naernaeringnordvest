// Privacy-preserving IP hashing for rate limiting.
//
// Security review F4: previously the Supabase service-role key was concatenated
// into the SHA-256 input as a salt. The hash is one-way, so the key was not
// practically recoverable, but a service-role secret should never enter an
// algorithm that doesn't need it. We use a dedicated RATE_LIMIT_SALT instead.
//
// `hashIp` is pure and runtime-agnostic (takes the salt explicitly) so it can be
// unit-tested under Node/vitest without touching Deno globals at import time.
// Edge functions read the salt via `rateLimitSalt()`.

export async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(ip + salt);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Edge-runtime salt source. Falls back to "" if unset — rate limiting still
// works, the counters just aren't keyed to a secret. Set RATE_LIMIT_SALT in
// Supabase for full protection. Guarded so importing this module under Node
// never references the Deno global at import time.
export function rateLimitSalt(): string {
  const d = (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno;
  return d?.env.get("RATE_LIMIT_SALT") ?? "";
}
