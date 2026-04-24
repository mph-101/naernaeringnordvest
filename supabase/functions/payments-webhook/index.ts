import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
  }
  return _supabase;
}

function tsToIso(ts: number | null | undefined): string | null {
  if (!ts) return null;
  return new Date(ts * 1000).toISOString();
}

function genToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function grantSubscriberRole(userId: string) {
  const sb = getSupabase();
  await sb.from("user_roles").upsert(
    { user_id: userId, role: "subscriber" },
    { onConflict: "user_id,role", ignoreDuplicates: true }
  );
}

async function grantBusinessRole(userId: string) {
  const sb = getSupabase();
  await sb.from("user_roles").upsert(
    { user_id: userId, role: "business" },
    { onConflict: "user_id,role", ignoreDuplicates: true }
  );
}

async function handleSubscriptionUpsert(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("Subscription missing metadata.userId", subscription.id);
    return;
  }
  const plan = subscription.metadata?.plan as string | undefined;
  if (!plan) {
    console.error("Subscription missing metadata.plan", subscription.id);
    return;
  }

  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const trialEnd = subscription.trial_end;
  const status = subscription.status as string;
  const sb = getSupabase();

  if (plan === "business_seat") {
    // Upsert business account by (provider, provider_subscription_id)
    const { data: existing } = await sb
      .from("business_accounts")
      .select("id, domain_verification_token, email_domain")
      .eq("provider", "stripe")
      .eq("provider_subscription_id", subscription.id)
      .maybeSingle();

    const seatCount = parseInt(subscription.metadata?.seat_count || "1", 10);
    const companyName = subscription.metadata?.company_name || "Bedrift";
    const orgnr = subscription.metadata?.orgnr || null;
    const emailDomain = (subscription.metadata?.email_domain || "").toLowerCase() || null;
    const verificationToken = existing?.domain_verification_token ?? (emailDomain ? genToken() : null);

    const accountRow: Record<string, unknown> = {
      owner_user_id: userId,
      company_name: companyName,
      orgnr,
      provider: "stripe",
      provider_subscription_id: subscription.id,
      provider_customer_id: subscription.customer,
      seat_count: seatCount,
      email_domain: emailDomain,
      domain_verification_token: verificationToken,
      status,
      trial_ends_at: tsToIso(trialEnd),
      current_period_end: tsToIso(periodEnd),
      environment: env,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await sb.from("business_accounts").update(accountRow).eq("id", existing.id);
    } else {
      await sb.from("business_accounts").insert(accountRow);
    }

    await grantBusinessRole(userId);
    await grantSubscriberRole(userId);
  } else {
    await sb.from("subscriptions").upsert(
      {
        user_id: userId,
        provider: "stripe",
        provider_subscription_id: subscription.id,
        provider_customer_id: subscription.customer,
        plan,
        price_id: priceId,
        product_id: productId,
        status,
        trial_ends_at: tsToIso(trialEnd),
        current_period_start: tsToIso(periodStart),
        current_period_end: tsToIso(periodEnd),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider,provider_subscription_id" }
    );

    if (["trialing", "active", "past_due"].includes(status)) {
      await grantSubscriberRole(userId);
    }
  }
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const sb = getSupabase();
  const plan = subscription.metadata?.plan as string | undefined;

  if (plan === "business_seat") {
    await sb
      .from("business_accounts")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("provider", "stripe")
      .eq("provider_subscription_id", subscription.id);
  } else {
    await sb
      .from("subscriptions")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("provider", "stripe")
      .eq("provider_subscription_id", subscription.id);
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpsert(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Webhook missing env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    await handleWebhook(req, rawEnv);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});