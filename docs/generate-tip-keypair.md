# Generere nøkkelpar for tips-kryptering

Kjør dette i Deno (eller Node med tilpassede imports) for å generere et keypair:

```typescript
import sodium from "npm:libsodium-wrappers-sumo@0.7.15";

await sodium.ready;
const keypair = sodium.crypto_box_keypair();
const publicKey = sodium.to_base64(keypair.publicKey, sodium.base64_variants.ORIGINAL);
const privateKey = sodium.to_base64(keypair.privateKey, sodium.base64_variants.ORIGINAL);

console.log("PUBLIC KEY (sett som TIP_ENCRYPTION_PUBLIC_KEY i Supabase):");
console.log(publicKey);
console.log("");
console.log("PRIVATE KEY (distribuer KUN til journalister, ALDRI lagre i Supabase):");
console.log(privateKey);
```

Kjør med: `deno run --allow-net generate-keypair.ts`

## Oppbevaring

- **Public key** → Supabase Edge Function secret: `TIP_ENCRYPTION_PUBLIC_KEY`
- **Private key** → Kun lokalt hos journalister. Distribuer via Signal eller fysisk.
- Lag backup av privatnøkkelen på et sikkert sted (offline).
- Hvis privatnøkkelen går tapt, kan krypterte e-poster IKKE dekrypteres.
