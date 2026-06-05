// Pure mapping from a Brønnøysund enhetsregisteret record to an mr_companies
// row. Dependency-free so it can be unit-tested under vitest (CI does not run
// Deno tests under supabase/functions/).

export interface MrCompanyRow {
  orgnr: string;
  navn: string;
  kommunenummer: string;
  antall_ansatte: number;
  naeringsbeskriv: string;
}

export function mapEnhetToMrCompany(e: any): MrCompanyRow | null {
  const orgnr = e?.organisasjonsnummer;
  if (!orgnr) return null;
  return {
    orgnr: String(orgnr),
    navn: e.navn ?? "",
    kommunenummer: e.forretningsadresse?.kommunenummer ?? "",
    antall_ansatte: typeof e.antallAnsatte === "number" ? e.antallAnsatte : 0,
    naeringsbeskriv: e.naeringskode1?.beskrivelse ?? "",
  };
}
