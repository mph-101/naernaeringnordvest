import { describe, it, expect } from "vitest";
import { mapEnhetToMrCompany } from "../../../supabase/functions/refresh-mr-employers/mr-employers-map";

describe("mapEnhetToMrCompany", () => {
  it("maps a full enhetsregisteret record", () => {
    const row = mapEnhetToMrCompany({
      organisasjonsnummer: "923609016",
      navn: "EKORNES AS",
      antallAnsatte: 938,
      forretningsadresse: { kommunenummer: "1528", kommune: "SYKKYLVEN" },
      naeringskode1: { beskrivelse: "Produksjon av møbler" },
    });
    expect(row).toEqual({
      orgnr: "923609016",
      navn: "EKORNES AS",
      kommunenummer: "1528",
      antall_ansatte: 938,
      naeringsbeskriv: "Produksjon av møbler",
    });
  });

  it("returns null when org.nr is missing", () => {
    expect(mapEnhetToMrCompany({ navn: "Uten orgnr" })).toBeNull();
    expect(mapEnhetToMrCompany({})).toBeNull();
  });

  it("defaults missing employee count and fields", () => {
    const row = mapEnhetToMrCompany({ organisasjonsnummer: "111111111", navn: "Liten AS" });
    expect(row).toEqual({
      orgnr: "111111111",
      navn: "Liten AS",
      kommunenummer: "",
      antall_ansatte: 0,
      naeringsbeskriv: "",
    });
  });
});
