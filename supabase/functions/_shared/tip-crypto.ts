import sodium from "npm:libsodium-wrappers-sumo@0.7.15";

// Source protection (security review F2). Tip follow-up emails are encrypted at
// submission with a libsodium sealed box (anonymous crypto_box_seal): only the
// recipient PUBLIC key is needed to seal, and only the matching SECRET key —
// held by journalists and pasted into the decrypt-tip-email function — can open
// it. The server that stores the tip can never read the email back.
//
// Returns a Postgres `bytea` hex literal (`\x...`) ready to insert via PostgREST.
// decrypt-tip-email reverses this exact format (strips `\x`, parses hex,
// crypto_box_seal_open).
export async function sealEmailToBytea(
  email: string,
  publicKeyB64: string,
): Promise<string> {
  await sodium.ready;
  const publicKey = sodium.from_base64(
    publicKeyB64,
    sodium.base64_variants.ORIGINAL,
  );
  const sealed = sodium.crypto_box_seal(sodium.from_string(email), publicKey);
  const bytes = new Uint8Array(sealed as ArrayLike<number>);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `\\x${hex}`;
}
