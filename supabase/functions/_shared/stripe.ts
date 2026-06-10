import { encode } from "https://deno.land/std@0.168.0/encoding/hex.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const getEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = "sandbox" | "live";

function getSecretKey(env: StripeEnv): string {
  return env === "sandbox"
    ? getEnv("STRIPE_TEST_SECRET_KEY")
    : getEnv("STRIPE_LIVE_SECRET_KEY");
}

export function createStripeClient(env: StripeEnv): Stripe {
  return new Stripe(getSecretKey(env), {
    apiVersion: "2025-03-31.basil",
  });
}

// Server-decided Stripe environment (security review F1). The client must NOT
// choose this: if it could, a user could run a checkout with a Stripe test card
// (environment=sandbox) and have the webhook grant real access in prod. Set
// STRIPE_ENVIRONMENT per deploy ("live" in prod, "sandbox" in staging/preview).
// Defaults to "sandbox" so a misconfigured deploy can never accidentally touch
// live keys/data.
export function stripeEnvironment(): StripeEnv {
  return Deno.env.get("STRIPE_ENVIRONMENT") === "live" ? "live" : "sandbox";
}

export async function verifyWebhook(req: Request, env: StripeEnv): Promise<{ id: string; type: string; data: { object: any } }> {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret = env === "sandbox"
    ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
    : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");

  if (!signature || !body) throw new Error("Missing signature or body");

  let timestamp: string | undefined;
  const v1Signatures: string[] = [];
  for (const part of signature.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value;
    if (key === "v1") v1Signatures.push(value);
  }

  if (!timestamp || v1Signatures.length === 0) throw new Error("Invalid signature format");

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error("Webhook timestamp too old");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const expected = new TextDecoder().decode(encode(new Uint8Array(signed)));

  if (!v1Signatures.includes(expected)) throw new Error("Invalid webhook signature");

  return JSON.parse(body);
}

export { corsHeaders } from "./cors.ts";

export type Plan = "quarterly" | "yearly" | "business_seat";

// Lookup keys recognised in Stripe. The business_seat plan now has 3
// volume tiers; business_seat_monthly is kept ONLY so we can still
// recognise existing subscribers on the old monthly price. New
// checkouts always go through getPriceId() below, which picks the
// right tier from seatCount.
const BUSINESS_TIER_KEYS = [
  "business_seat_1_9",
  "business_seat_10_29",
  "business_seat_30_plus",
] as const;
const LEGACY_BUSINESS_KEY = "business_seat_monthly";

/**
 * Resolve the Stripe lookup_key for a given plan + seat count.
 * - quarterly / yearly: ignore seatCount
 * - business_seat: 1-9 → 1_9, 10-29 → 10_29, 30+ → 30_plus
 */
export function getPriceId(plan: Plan, seatCount?: number): string {
  if (plan === "quarterly") return "personal_quarterly";
  if (plan === "yearly") return "personal_yearly";
  if (plan === "business_seat") {
    const seats = Math.max(1, seatCount ?? 1);
    if (seats >= 30) return "business_seat_30_plus";
    if (seats >= 10) return "business_seat_10_29";
    return "business_seat_1_9";
  }
  throw new Error(`Unknown plan: ${plan}`);
}

export function planFromPriceId(priceId: string): Plan | null {
  if (priceId === "personal_quarterly") return "quarterly";
  if (priceId === "personal_yearly") return "yearly";
  if (
    priceId === LEGACY_BUSINESS_KEY ||
    (BUSINESS_TIER_KEYS as readonly string[]).includes(priceId)
  ) {
    return "business_seat";
  }
  return null;
}

/**
 * Backward-compat: existing imports of PRICE_IDS still work. For
 * business_seat we point at the entry-level tier so any code that
 * still reads PRICE_IDS["business_seat"] doesn't reference a price
 * that no longer exists.
 */
export const PRICE_IDS = {
  quarterly: "personal_quarterly",
  yearly: "personal_yearly",
  business_seat: "business_seat_1_9",
} as const;
