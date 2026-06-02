import { PAYMENTS_CLIENT_TOKEN } from "@/lib/env";

const clientToken = PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;
  return (
    <div className="w-full bg-accent/10 border-b border-accent/20 px-4 py-2 text-center text-xs font-body text-accent-foreground">
      Testmodus — bruk kortnummer 4242 4242 4242 4242 for å prøve abonnementet uten ekte betaling.
    </div>
  );
}