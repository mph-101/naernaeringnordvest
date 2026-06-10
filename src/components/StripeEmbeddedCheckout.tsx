import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { PAYMENTS_CLIENT_TOKEN } from "@/lib/env";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  plan: "quarterly" | "yearly" | "business_seat";
  seatCount?: number;
  companyName?: string;
  orgnr?: string;
  emailDomain?: string;
  returnUrl?: string;
}

export function StripeEmbeddedCheckout(props: Props) {
  // No Stripe key configured (e.g. demo deployments). Render a friendly notice
  // instead of mounting the provider — getStripe() would otherwise throw.
  if (!PAYMENTS_CLIENT_TOKEN) {
    return (
      <div className="w-full rounded-lg border border-border bg-muted/40 p-6 text-center">
        <p className="font-subhead font-medium text-foreground">Betaling er ikke tilgjengelig i demomodus</p>
        <p className="text-sm text-muted-foreground mt-1">
          Abonnement kan ikke fullføres her ennå. Ta kontakt med redaksjonen for tilgang.
        </p>
      </div>
    );
  }

  const fetchClientSecret = async (): Promise<string> => {
    const returnUrl =
      props.returnUrl ||
      `${window.location.origin}/abonnement/takk?session_id={CHECKOUT_SESSION_ID}`;

    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        plan: props.plan,
        seatCount: props.seatCount,
        companyName: props.companyName,
        orgnr: props.orgnr,
        emailDomain: props.emailDomain,
        returnUrl,
      },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || "Kunne ikke starte betaling");
    }
    return data.clientSecret;
  };

  return (
    <div id="checkout" className="w-full">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}