import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
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
        environment: getStripeEnvironment(),
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