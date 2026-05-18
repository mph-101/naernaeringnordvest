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

export const PRICE_IDS = {
  quarterly: "personal_quarterly",
  yearly: "personal_yearly",
  business_seat: "business_seat_monthly",
} as const;

export type Plan = keyof typeof PRICE_IDS;

export function planFromPriceId(priceId: string): Plan | null {
  for (const [plan, id] of Object.entries(PRICE_IDS)) {
    if (id === priceId) return plan as Plan;
  }
  return null;
}
