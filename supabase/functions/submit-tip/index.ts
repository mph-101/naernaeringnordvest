import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit configuration
const MAX_SUBMISSIONS_PER_HOUR = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

// Hash IP for privacy (one-way hash)
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Input validation
function validateInput(data: unknown): { 
  valid: boolean; 
  error?: string; 
  parsed?: { 
    journalist_id: string; 
    journalist_name: string; 
    content: string; 
    follow_up_email: string | null; 
  } 
} {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const { journalist_id, journalist_name, content, follow_up_email } = data as Record<string, unknown>;

  // Validate journalist_id
  if (typeof journalist_id !== "string" || journalist_id.trim().length === 0) {
    return { valid: false, error: "journalist_id is required" };
  }
  if (journalist_id.length > 100) {
    return { valid: false, error: "journalist_id exceeds maximum length" };
  }

  // Validate journalist_name
  if (typeof journalist_name !== "string" || journalist_name.trim().length === 0) {
    return { valid: false, error: "journalist_name is required" };
  }
  if (journalist_name.length > 200) {
    return { valid: false, error: "journalist_name exceeds maximum length" };
  }

  // Validate content
  if (typeof content !== "string" || content.trim().length === 0) {
    return { valid: false, error: "content is required" };
  }
  if (content.length > 10000) {
    return { valid: false, error: "content exceeds maximum length of 10000 characters" };
  }

  // Validate email (optional)
  let validatedEmail: string | null = null;
  if (follow_up_email !== null && follow_up_email !== undefined) {
    if (typeof follow_up_email !== "string") {
      return { valid: false, error: "follow_up_email must be a string" };
    }
    const trimmedEmail = follow_up_email.trim();
    if (trimmedEmail.length > 0) {
      // Email format validation
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(trimmedEmail)) {
        return { valid: false, error: "Invalid email format" };
      }
      if (trimmedEmail.length > 255) {
        return { valid: false, error: "Email exceeds maximum length" };
      }
      validatedEmail = trimmedEmail;
    }
  }

  return {
    valid: true,
    parsed: {
      journalist_id: journalist_id.trim(),
      journalist_name: journalist_name.trim(),
      content: content.trim(),
      follow_up_email: validatedEmail,
    },
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    const ipHash = await hashIP(clientIP);

    // Initialize Supabase with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit
    const now = new Date();
    const { data: rateLimit, error: rateLimitError } = await supabase
      .from("tip_rate_limits")
      .select("submission_count, window_start")
      .eq("ip_hash", ipHash)
      .single();

    if (rateLimitError && rateLimitError.code !== "PGRST116") {
      // PGRST116 = no rows, which is fine for first submission
      console.error("Rate limit check error:", rateLimitError);
    }

    if (rateLimit) {
      const windowStart = new Date(rateLimit.window_start);
      const windowElapsed = now.getTime() - windowStart.getTime();

      if (windowElapsed < RATE_LIMIT_WINDOW_MS) {
        // Still within the rate limit window
        if (rateLimit.submission_count >= MAX_SUBMISSIONS_PER_HOUR) {
          return new Response(
            JSON.stringify({ 
              error: "Rate limit exceeded. Please try again later.",
              retry_after_seconds: Math.ceil((RATE_LIMIT_WINDOW_MS - windowElapsed) / 1000)
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validation = validateInput(body);
    if (!validation.valid || !validation.parsed) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert the tip
    const { error: insertError } = await supabase
      .from("tips")
      .insert({
        journalist_id: validation.parsed.journalist_id,
        journalist_name: validation.parsed.journalist_name,
        content: validation.parsed.content,
        follow_up_email: validation.parsed.follow_up_email,
        is_anonymous: true,
      });

    if (insertError) {
      console.error("Tip insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to submit tip" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update rate limit tracking
    if (rateLimit) {
      const windowStart = new Date(rateLimit.window_start);
      const windowElapsed = now.getTime() - windowStart.getTime();

      if (windowElapsed >= RATE_LIMIT_WINDOW_MS) {
        // Reset window
        await supabase
          .from("tip_rate_limits")
          .update({ submission_count: 1, window_start: now.toISOString() })
          .eq("ip_hash", ipHash);
      } else {
        // Increment count
        await supabase
          .from("tip_rate_limits")
          .update({ submission_count: rateLimit.submission_count + 1 })
          .eq("ip_hash", ipHash);
      }
    } else {
      // First submission from this IP
      await supabase
        .from("tip_rate_limits")
        .insert({ ip_hash: ipHash, submission_count: 1, window_start: now.toISOString() });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
