import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook, stripeEnvironment } from "../_shared/stripe.ts";

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

async function handleJobPremiumCheckout(session: any, env: StripeEnv) {
  const purpose = session.metadata?.purpose;
  if (purpose !== "job_premium") return;
  const jobListingId = session.metadata?.jobListingId;
  if (!jobListingId) {
    console.error("job_premium checkout missing jobListingId", session.id);
    return;
  }
  const sb = getSupabase();
  await sb
    .from("job_listings")
    .update({
      is_premium: true,
      premium_paid_at: new Date().toISOString(),
      premium_payment_method: "stripe",
      premium_amount_nok: Math.round((session.amount_total ?? 0) / 100),
      premium_stripe_session_id: session.id,
      featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobListingId);
  console.log("Marked job as premium:", jobListingId, "env:", env);
}

async function handleEventFeaturedCheckout(session: any, env: StripeEnv) {
  const purpose = session.metadata?.purpose;
  if (purpose !== "event_featured") return;
  const eventId = session.metadata?.eventId;
  if (!eventId) {
    console.error("event_featured checkout missing eventId", session.id);
    return;
  }
  const sb = getSupabase();
  const { data: ev } = await sb
    .from("events")
    .select("start_at")
    .eq("id", eventId)
    .maybeSingle();
  const featuredUntil = ev?.start_at ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await sb
    .from("events")
    .update({
      is_featured: true,
      featured_paid_at: new Date().toISOString(),
      featured_amount_nok: Math.round((session.amount_total ?? 0) / 100),
      featured_stripe_session_id: session.id,
      featured_until: featuredUntil,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);
  console.log("Marked event as featured:", eventId, "env:", env);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  const sb = getSupabase();

  const { error: insertError } = await sb
    .from("stripe_events")
    .insert({
      event_id: event.id,
      type: event.type,
      payload: event,
    });

  if (insertError) {
    if (insertError.code === "23505") {
      // Already seen. Only skip if the previous attempt fully completed
      // (processed_at set). If a prior attempt crashed after this insert but
      // before processing, processed_at is still NULL — fall through and
      // re-process. All handlers below are idempotent (upserts keyed on
      // provider_subscription_id), so re-processing is safe. (F6)
      const { data: existing } = await sb
        .from("stripe_events")
        .select("processed_at")
        .eq("event_id", event.id)
        .maybeSingle();
      if (existing?.processed_at) {
        console.log("Duplicate already-processed webhook, skipping:", event.id);
        return;
      }
      console.warn("Re-processing webhook whose prior attempt did not complete:", event.id);
    } else {
      console.error("Failed to record stripe event:", insertError);
    }
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpsert(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    case "customer.subscription.trial_will_end":
      // Stripe sends this 3 days before a trial ends. We just log for
      // now; in a later iteration we can send the journalist an email
      // via Resend. The subscription will move to status='active' or
      // 'past_due' automatically when the trial ends.
      console.log("Trial ending soon:", event.data.object.id);
      break;
    case "invoice.payment_failed":
      // Stripe.Smart Retries will keep trying; subscription.status
      // moves to 'past_due' which triggers handleSubscriptionUpsert
      // separately. Just log here; we don't double-handle.
      console.log("Payment failed for invoice:", event.data.object.id);
      break;
    case "charge.refunded":
      // If the refund is total AND the subscription was canceled,
      // customer.subscription.deleted will fire separately. We log
      // here for audit; granular handling (e.g. revoke role
      // immediately for a partial refund on a partial-period invoice)
      // can be added when the editorial team needs it.
      console.log("Charge refunded:", event.data.object.id);
      break;
    case "charge.dispute.created":
      // A chargeback was opened. Mark sensitive — Magnus should review
      // the user and possibly revoke access manually. We log loudly.
      console.warn("DISPUTE CREATED:", event.data.object.id, event.data.object.customer);
      break;
    case "checkout.session.completed":
      await handleJobPremiumCheckout(event.data.object, env);
      await handleEventFeaturedCheckout(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }

  await sb
    .from("stripe_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("event_id", event.id);
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
  // Environment isolation (F1, design choice A): this deploy only processes its
  // own environment's events. A sandbox event hitting the prod (live) webhook —
  // even if correctly signed with the sandbox secret — is ignored, so sandbox
  // data can never land in the prod database.
  const deployEnv = stripeEnvironment();
  if (rawEnv !== deployEnv) {
    console.warn(`Webhook env mismatch: event env=${rawEnv}, deploy env=${deployEnv} — ignoring`);
    return new Response(JSON.stringify({ received: true, ignored: "env mismatch" }), {
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