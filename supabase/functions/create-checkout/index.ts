import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import {
  type StripeEnv,
  createStripeClient,
  corsHeaders,
  getPriceId,
} from "../_shared/stripe.ts";

const BodySchema = z.object({
  plan: z.enum(["quarterly", "yearly", "business_seat"]),
  seatCount: z.number().int().min(1).max(500).optional(),
  companyName: z.string().min(1).max(200).optional(),
  orgnr: z.string().max(20).optional(),
  emailDomain: z
    .string()
    .max(100)
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i)
    .optional(),
  returnUrl: z.string().url(),
  environment: z.enum(["sandbox", "live"]),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string | undefined;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }
    const body = parsed.data;
    const env: StripeEnv = body.environment;
    const stripe = createStripeClient(env);

    // Resolve human-readable price ID -> Stripe price via lookup_keys.
    // For business_seat we pick a volume tier based on seatCount.
    const priceLookupKey = getPriceId(body.plan, body.seatCount);
    const prices = await stripe.prices.list({ lookup_keys: [priceLookupKey], limit: 1 });
    if (!prices.data.length) {
      return new Response(JSON.stringify({ error: "Price not configured" }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const stripePrice = prices.data[0];

    const isBusinessPlan = body.plan === "business_seat";
    const quantity = isBusinessPlan ? Math.max(1, body.seatCount ?? 1) : 1;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity }],
      mode: "subscription",
      ui_mode: "embedded",
      return_url: body.returnUrl,
      ...(userEmail && { customer_email: userEmail }),
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          userId,
          plan: body.plan,
          ...(isBusinessPlan && {
            company_name: body.companyName ?? "",
            orgnr: body.orgnr ?? "",
            email_domain: (body.emailDomain ?? "").toLowerCase(),
            seat_count: String(quantity),
          }),
        },
      },
      metadata: {
        userId,
        plan: body.plan,
      },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("create-checkout error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});