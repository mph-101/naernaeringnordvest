import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const BRREG_BASE = "https://data.brreg.no";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "search") {
      const query = url.searchParams.get("q") || "";
      const page = url.searchParams.get("page") || "0";
      const size = url.searchParams.get("size") || "20";
      const kommune = url.searchParams.get("kommune") || "";
      const naeringskode = url.searchParams.get("naeringskode") || "";

      let apiUrl = `${BRREG_BASE}/enhetsregisteret/api/enheter?navn=${encodeURIComponent(query)}&organisasjonsform=AS,ASA&page=${page}&size=${size}&sort=navn,asc`;
      if (kommune) apiUrl += `&kommunenummer=${kommune}`;
      if (naeringskode) apiUrl += `&naeringskode=${naeringskode}`;

      const res = await fetch(apiUrl, { headers: { Accept: "application/json" } });
      const data = await res.json();

      const enheter = data?._embedded?.enheter || [];
      const totalElements = data?.page?.totalElements || 0;
      const totalPages = data?.page?.totalPages || 0;

      const companies = enheter.map((e: any) => ({
        orgnr: e.organisasjonsnummer,
        navn: e.navn,
        organisasjonsform: e.organisasjonsform?.kode,
        stiftelsesdato: e.stiftelsesdato,
        registreringsdato: e.registreringsdatoEnhetsregisteret,
        kommune: e.forretningsadresse?.kommune || e.postadresse?.kommune || "",
        kommunenummer: e.forretningsadresse?.kommunenummer || "",
        poststed: e.forretningsadresse?.poststed || e.postadresse?.poststed || "",
        naeringskode: e.naeringskode1?.kode || "",
        naeringsbeskriv: e.naeringskode1?.beskrivelse || "",
        antallAnsatte: e.antallAnsatte || 0,
        konkurs: e.konkurs || false,
        underAvvikling: e.underAvvikling || false,
        underTvangsavviklingEllerTvangsopplosning: e.underTvangsavviklingEllerTvangsopplosning || false,
      }));

      return new Response(JSON.stringify({ companies, totalElements, totalPages }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "financials") {
      const orgnr = url.searchParams.get("orgnr");
      if (!orgnr) {
        return new Response(JSON.stringify({ error: "orgnr required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(`${BRREG_BASE}/regnskapsregisteret/regnskap/${orgnr}`, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const text = await res.text();
        return new Response(JSON.stringify({ error: "No financials found", details: text }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const years = (Array.isArray(data) ? data : data?._embedded?.regnskaper || []).map((r: any) => ({
        year: r.regnskapsperiode?.fraDato?.substring(0, 4) || r.journalnr,
        omsetning: r.resultatregnskapResultat?.driftsinntekter?.sumDriftsinntekter || 0,
        driftsresultat: r.resultatregnskapResultat?.driftsresultat || 0,
        arsresultat: r.resultatregnskapResultat?.ordinaertResultatFoerSkattekostnad || 0,
        egenkapital: r.eiendeler?.sumEgenkapitalGjeldOgAvsetningForForpliktelser || 0,
        sumEiendeler: r.eiendeler?.sumEiendeler || 0,
      }));

      return new Response(JSON.stringify({ financials: years }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "roles") {
      const orgnr = url.searchParams.get("orgnr");
      if (!orgnr) {
        return new Response(JSON.stringify({ error: "orgnr required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(`${BRREG_BASE}/enhetsregisteret/api/enheter/${orgnr}/roller`, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        return new Response(JSON.stringify({ roles: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const rollegrupper = data?.rollegrupper || [];
      const roles = rollegrupper.flatMap((g: any) =>
        (g.roller || []).map((r: any) => ({
          type: g.type?.kode || "",
          typeBeskrivelse: g.type?.beskrivelse || "",
          person: r.person
            ? { fornavn: r.person.fornavn, etternavn: r.person.etternavn }
            : null,
          enhet: r.enhet
            ? { orgnr: r.enhet.organisasjonsnummer, navn: r.enhet.navn }
            : null,
          fratradt: r.fratradt || false,
        }))
      );

      return new Response(JSON.stringify({ roles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "new_establishments") {
      const kommune = url.searchParams.get("kommune") || "";
      const fraDate = url.searchParams.get("fra") || "";
      const tilDate = url.searchParams.get("til") || "";

      let apiUrl = `${BRREG_BASE}/enhetsregisteret/api/enheter?organisasjonsform=AS,ASA&size=50&sort=stiftelsesdato,desc`;
      if (kommune) apiUrl += `&kommunenummer=${kommune}`;
      if (fraDate) apiUrl += `&registrertIMerverdiavgiftsregisteretDato.fra=${fraDate}`;
      if (tilDate) apiUrl += `&registrertIMerverdiavgiftsregisteretDato.til=${tilDate}`;

      // For new establishments, filter by registration date
      if (fraDate) apiUrl = `${BRREG_BASE}/enhetsregisteret/api/enheter?organisasjonsform=AS,ASA&size=50&sort=registreringsdatoEnhetsregisteret,desc&registreringsdatoEnhetsregisteret.fra=${fraDate}`;
      if (tilDate) apiUrl += `&registreringsdatoEnhetsregisteret.til=${tilDate}`;
      if (kommune) apiUrl += `&kommunenummer=${kommune}`;

      const res = await fetch(apiUrl, { headers: { Accept: "application/json" } });
      const data = await res.json();
      const enheter = data?._embedded?.enheter || [];
      const total = data?.page?.totalElements || 0;

      const companies = enheter.map((e: any) => ({
        orgnr: e.organisasjonsnummer,
        navn: e.navn,
        stiftelsesdato: e.stiftelsesdato,
        registreringsdato: e.registreringsdatoEnhetsregisteret,
        kommune: e.forretningsadresse?.kommune || "",
        naeringsbeskriv: e.naeringskode1?.beskrivelse || "",
        konkurs: e.konkurs || false,
      }));

      return new Response(JSON.stringify({ companies, total }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bankruptcies") {
      const kommune = url.searchParams.get("kommune") || "";
      let apiUrl = `${BRREG_BASE}/enhetsregisteret/api/enheter?organisasjonsform=AS,ASA&konkurs=true&size=50&sort=registreringsdatoEnhetsregisteret,desc`;
      if (kommune) apiUrl += `&kommunenummer=${kommune}`;

      const res = await fetch(apiUrl, { headers: { Accept: "application/json" } });
      const data = await res.json();
      const enheter = data?._embedded?.enheter || [];
      const total = data?.page?.totalElements || 0;

      const companies = enheter.map((e: any) => ({
        orgnr: e.organisasjonsnummer,
        navn: e.navn,
        stiftelsesdato: e.stiftelsesdato,
        kommune: e.forretningsadresse?.kommune || "",
        naeringsbeskriv: e.naeringskode1?.beskrivelse || "",
      }));

      return new Response(JSON.stringify({ companies, total }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("brreg-proxy error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
