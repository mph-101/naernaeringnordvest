import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook, stripeEnvironment, createStripeClient } from "../_shared/stripe.ts";
import { decideWebhookGuard } from "../_shared/webhook-idempotency.ts";

// Permissive default generics (SupabaseClient<any,...>) so table writes type-check
// under `deno check`; the strict ReturnType<typeof createClient> resolved every
// .from(...).update(...) to `never`. Runtime behaviour is unchanged.
let _supabase: SupabaseClient | null = null;
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
  const { error } = await sb.from("user_roles").upsert(
    { user_id: userId, role: "subscriber" },
    { onConflict: "user_id,role", ignoreDuplicates: true }
  );
  if (error) throw new Error(`grantSubscriberRole failed: ${error.message}`);
}

async function grantBusinessRole(userId: string) {
  const sb = getSupabase();
  const { error } = await sb.from("user_roles").upsert(
    { user_id: userId, role: "business" },
    { onConflict: "user_id,role", ignoreDuplicates: true }
  );
  if (error) throw new Error(`grantBusinessRole failed: ${error.message}`);
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
    const { data: existing, error: selErr } = await sb
      .from("business_accounts")
      .select("id, domain_verification_token, email_domain")
      .eq("provider", "stripe")
      .eq("provider_subscription_id", subscription.id)
      .maybeSingle();
    if (selErr) throw new Error(`business_accounts lookup failed: ${selErr.message}`);

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

    const { error: accErr } = existing
      ? await sb.from("business_accounts").update(accountRow).eq("id", existing.id)
      : await sb.from("business_accounts").insert(accountRow);
    if (accErr) throw new Error(`business_accounts write failed: ${accErr.message}`);

    await grantBusinessRole(userId);
    await grantSubscriberRole(userId);
  } else {
    const { error: subErr } = await sb.from("subscriptions").upsert(
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
    if (subErr) throw new Error(`subscriptions upsert failed: ${subErr.message}`);

    if (["trialing", "active", "past_due"].includes(status)) {
      await grantSubscriberRole(userId);
    }
  }
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const sb = getSupabase();
  const plan = subscription.metadata?.plan as string | undefined;

  const { error } = plan === "business_seat"
    ? await sb
        .from("business_accounts")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("provider", "stripe")
        .eq("provider_subscription_id", subscription.id)
    : await sb
        .from("subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("provider", "stripe")
        .eq("provider_subscription_id", subscription.id);
  if (error) throw new Error(`handleSubscriptionDeleted write failed: ${error.message}`);
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
  const { error } = await sb
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
  if (error) throw new Error(`job_premium update failed: ${error.message}`);
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
  const { data: ev, error: evErr } = await sb
    .from("events")
    .select("start_at")
    .eq("id", eventId)
    .maybeSingle();
  if (evErr) throw new Error(`event lookup failed: ${evErr.message}`);
  const featuredUntil = ev?.start_at ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await sb
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
  if (error) throw new Error(`event_featured update failed: ${error.message}`);
  console.log("Marked event as featured:", eventId, "env:", env);
}

// Chargeback handling (3-D1): flag the disputing customer's subscription and
// business account as "disputed" so has_active_subscription() stops counting them
// (that function treats trialing/active/past_due — and canceled-until-period-end —
// as active, but not "disputed"). Best-effort customer resolution.
async function flagDisputedCustomer(dispute: any, env: StripeEnv) {
  let customerId: string | null = (dispute.customer as string) ?? null;
  // Dispute payloads don't always carry the customer; resolve via the charge.
  if (!customerId && dispute.charge) {
    try {
      const charge = await createStripeClient(env).charges.retrieve(String(dispute.charge));
      customerId = (charge.customer as string) ?? null;
    } catch (e) {
      // Stripe keys may be unset (pre-launch) or the retrieve failed — degrade to
      // a loud log rather than throwing; a missing customer isn't retryable.
      console.error("Could not resolve customer for dispute:", dispute.id, e);
    }
  }
  if (!customerId) {
    console.warn("Dispute has no resolvable customer; needs manual review:", dispute.id);
    return;
  }
  const sb = getSupabase();
  const { error: sErr } = await sb
    .from("subscriptions")
    .update({ status: "disputed", updated_at: new Date().toISOString() })
    .eq("provider", "stripe")
    .eq("provider_customer_id", customerId)
    .eq("environment", env);
  if (sErr) throw new Error(`dispute subscriptions update failed: ${sErr.message}`);
  const { error: bErr } = await sb
    .from("business_accounts")
    .update({ status: "disputed", updated_at: new Date().toISOString() })
    .eq("provider", "stripe")
    .eq("provider_customer_id", customerId)
    .eq("environment", env);
  if (bErr) throw new Error(`dispute business_accounts update failed: ${bErr.message}`);
  console.warn("Flagged customer as disputed for manual review:", customerId, "env:", env);
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

  // Only look up processed_at when the insert hit a duplicate — otherwise the
  // row we just inserted is fresh (processed_at is NULL by definition).
  let existingProcessedAt: string | null = null;
  if (insertError?.code === "23505") {
    const { data: existing } = await sb
      .from("stripe_events")
      .select("processed_at")
      .eq("event_id", event.id)
      .maybeSingle();
    existingProcessedAt = (existing?.processed_at as string | null) ?? null;
  }

  const guard = decideWebhookGuard(insertError, existingProcessedAt);
  if (guard.action === "skip") {
    console.log("Duplicate already-processed webhook, skipping:", event.id);
    return;
  }
  if (guard.action === "fail") {
    // No dedup record written; processing now would risk double-processing on
    // Stripe's retry. Throw so the outer handler returns 400 → Stripe retries.
    throw new Error(`Failed to record stripe event ${event.id}: ${guard.reason}`);
  }
  if (guard.action === "reprocess") {
    // Prior attempt crashed after insert but before processed_at was set. All
    // handlers are idempotent (upserts keyed on provider_subscription_id), so
    // re-processing is safe. (F6)
    console.warn("Re-processing webhook whose prior attempt did not complete:", event.id);
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
      // A chargeback was opened. Flag the customer's subscription/business account
      // as "disputed" so has_active_subscription() stops returning true, and log
      // loudly for manual review (3-D1, minimal handling).
      console.warn("DISPUTE CREATED:", event.data.object.id, "charge:", event.data.object.charge);
      await flagDisputedCustomer(event.data.object, env);
      break;
    case "checkout.session.completed":
      await handleJobPremiumCheckout(event.data.object, env);
      await handleEventFeaturedCheckout(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }

  const { error: procErr } = await sb
    .from("stripe_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("event_id", event.id);
  // If marking fails after successful processing, throw so Stripe retries; the
  // retry finds processed_at still NULL and safely re-processes (idempotent).
  if (procErr) throw new Error(`Failed to mark event processed ${event.id}: ${procErr.message}`);
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