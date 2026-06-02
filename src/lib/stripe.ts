import { loadStripe, Stripe } from "@stripe/stripe-js";
import { PAYMENTS_CLIENT_TOKEN } from "@/lib/env";

export type StripeEnv = "sandbox" | "live";

const clientToken = PAYMENTS_CLIENT_TOKEN;
const environment: StripeEnv = clientToken?.startsWith("pk_test_") ? "sandbox" : "live";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!clientToken) {
      throw new Error("Stripe client token is not set (VITE_PAYMENTS_CLIENT_TOKEN / NEXT_PUBLIC_PAYMENTS_CLIENT_TOKEN)");
    }
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return environment;
}