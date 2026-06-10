// Deno test for the tip-email sealed box. Run with:
//   deno test --node-modules-dir=auto supabase/functions/_shared/tip-crypto.test.ts
//
// CI runs only vitest (src/**), so this is a manual/local check. It proves the
// seal format round-trips through the exact decrypt path used by
// decrypt-tip-email (strip \x, parse hex, crypto_box_seal_open).

import sodium from "npm:libsodium-wrappers-sumo@0.7.15";
import { assertEquals, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { sealEmailToBytea } from "./tip-crypto.ts";

Deno.test("sealEmailToBytea seals an email that only the secret key can open", async () => {
  await sodium.ready;
  const kp = sodium.crypto_box_keypair();
  const pubB64 = sodium.to_base64(kp.publicKey, sodium.base64_variants.ORIGINAL);
  const email = "kilde@eksempel.no";

  const bytea = await sealEmailToBytea(email, pubB64);

  // Stored as a Postgres bytea hex literal.
  assertMatch(bytea, /^\\x[0-9a-f]+$/);

  // Reverse exactly as decrypt-tip-email does.
  const ciphertext = new Uint8Array(
    bytea.slice(2).match(/.{2}/g)!.map((b) => parseInt(b, 16)),
  );
  const opened = sodium.crypto_box_seal_open(
    ciphertext,
    kp.publicKey,
    kp.privateKey,
  );
  assertEquals(sodium.to_string(opened), email);
});

Deno.test("a different secret key cannot open the sealed email", async () => {
  await sodium.ready;
  const kp = sodium.crypto_box_keypair();
  const attacker = sodium.crypto_box_keypair();
  const pubB64 = sodium.to_base64(kp.publicKey, sodium.base64_variants.ORIGINAL);

  const bytea = await sealEmailToBytea("kilde@eksempel.no", pubB64);
  const ciphertext = new Uint8Array(
    bytea.slice(2).match(/.{2}/g)!.map((b) => parseInt(b, 16)),
  );

  // crypto_box_seal_open returns null / throws for the wrong keypair.
  let opened: Uint8Array | null = null;
  try {
    opened = sodium.crypto_box_seal_open(
      ciphertext,
      attacker.publicKey,
      attacker.privateKey,
    );
  } catch {
    opened = null;
  }
  assertEquals(opened, null);
});
