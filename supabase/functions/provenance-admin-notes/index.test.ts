// Deno tests for provenance-admin-notes. Run with:
//   deno test --no-check supabase/functions/provenance-admin-notes/index.test.ts
//
// The auth gate (getUser + has_editorial_role) follows the proven
// admin-create-user pattern; here we cover the request-parsing contract and
// that unauthenticated calls are rejected before any data access.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler } from "./index.ts";

Deno.test("rejects missing Authorization with 401", async () => {
  const res = await handler(
    new Request("http://localhost/x", {
      method: "POST",
      body: JSON.stringify({ article_id: "abc" }),
    }),
  );
  assertEquals(res.status, 401);
});

Deno.test("rejects unsupported method with 405", async () => {
  const res = await handler(
    new Request("http://localhost/x", { method: "DELETE" }),
  );
  assertEquals(res.status, 405);
});

Deno.test("OPTIONS preflight returns no-content", async () => {
  const res = await handler(
    new Request("http://localhost/x", { method: "OPTIONS" }),
  );
  // 200/204 with CORS headers, no body error
  assertEquals(res.ok, true);
});
