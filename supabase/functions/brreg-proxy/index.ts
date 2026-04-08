const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

      // If query looks like an org number (9 digits), search by organisasjonsnummer
      const isOrgnr = /^\d{9}$/.test(query.trim());
      let apiUrl: string;
      if (isOrgnr) {
        apiUrl = `${BRREG_BASE}/enhetsregisteret/api/enheter?organisasjonsnummer=${query.trim()}&page=${page}&size=${size}`;
      } else {
        apiUrl = `${BRREG_BASE}/enhetsregisteret/api/enheter?navn=${encodeURIComponent(query)}&organisasjonsform=AS,ASA&page=${page}&size=${size}&sort=navn,asc`;
      }
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

      // Fetch all available years (paginated)
      let allRegnskaper: any[] = [];
      let page = 0;
      const size = 50;
      while (true) {
        const res = await fetch(
          `${BRREG_BASE}/regnskapsregisteret/regnskap/${orgnr}?size=${size}&page=${page}`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) break;
        const data = await res.json();
        const items = Array.isArray(data) ? data : data?._embedded?.regnskaper || [];
        if (items.length === 0) break;
        allRegnskaper = allRegnskaper.concat(items);
        const totalPages = data?.page?.totalPages || 1;
        page++;
        if (page >= totalPages) break;
      }

      if (allRegnskaper.length === 0) {
        return new Response(JSON.stringify({ financials: [] }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Deduplicate by year (keep first = most recent filing per year)
      const seenYears = new Set<string>();
      const years = allRegnskaper
        .map((r: any) => {
          const resultat = r.resultatregnskapResultat || {};
          const driftsres = resultat.driftsresultat;
          const eiendeler = r.eiendeler || {};
          const egenkapitalGjeld = r.egenkapitalGjeld || {};
          return {
            year: r.regnskapsperiode?.fraDato?.substring(0, 4) || r.journalnr,
            omsetning: driftsres?.driftsinntekter?.sumDriftsinntekter || resultat.driftsinntekter?.sumDriftsinntekter || 0,
            driftsresultat: typeof driftsres === 'number' ? driftsres : (driftsres?.driftsresultat || 0),
            arsresultat: resultat.ordinaertResultatFoerSkattekostnad || resultat.aarsresultat || 0,
            egenkapital: egenkapitalGjeld.sumEgenkapitalGjeld || egenkapitalGjeld.egenkapital?.sumEgenkapital || 0,
            sumEiendeler: eiendeler.sumEiendeler || 0,
          };
        })
        .filter((y: any) => {
          if (seenYears.has(y.year)) return false;
          seenYears.add(y.year);
          return true;
        })
        .sort((a: any, b: any) => b.year.localeCompare(a.year));

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
          person: r.person && (r.person.fornavn || r.person.navn?.fornavn)
            ? { fornavn: r.person.fornavn || r.person.navn?.fornavn || "", etternavn: r.person.etternavn || r.person.navn?.etternavn || "" }
            : null,
          enhet: r.enhet
            ? { orgnr: r.enhet.organisasjonsnummer, navn: Array.isArray(r.enhet.navn) ? r.enhet.navn[0] : r.enhet.navn }
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
      if (fraDate) apiUrl += `&stiftelsesdato.fra=${fraDate}`;
      if (tilDate) apiUrl += `&stiftelsesdato.til=${tilDate}`;
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
        antallAnsatte: e.antallAnsatte || 0,
        konkurs: e.konkurs || false,
      }));

      return new Response(JSON.stringify({ companies, total }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bankruptcies") {
      const kommune = url.searchParams.get("kommune") || "";
      const fraDate = url.searchParams.get("fra") || "";
      const tilDate = url.searchParams.get("til") || "";
      let apiUrl = `${BRREG_BASE}/enhetsregisteret/api/enheter?organisasjonsform=AS,ASA&konkurs=true&size=50&sort=registreringsdatoEnhetsregisteret,desc`;
      if (kommune) apiUrl += `&kommunenummer=${kommune}`;
      if (fraDate) apiUrl += `&registreringsdatoEnhetsregisteret.fra=${fraDate}`;
      if (tilDate) apiUrl += `&registreringsdatoEnhetsregisteret.til=${tilDate}`;

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
        antallAnsatte: e.antallAnsatte || 0,
      }));

      return new Response(JSON.stringify({ companies, total }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "batch_financials") {
      const orgnrs = url.searchParams.get("orgnrs") || "";
      const orgnrList = orgnrs.split(",").filter(Boolean).slice(0, 50);
      if (!orgnrList.length) {
        return new Response(JSON.stringify({ financials: {} }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: Record<string, any> = {};
      await Promise.all(
        orgnrList.map(async (orgnr) => {
          try {
            const res = await fetch(
              `${BRREG_BASE}/regnskapsregisteret/regnskap/${orgnr}?size=1&page=0`,
              { headers: { Accept: "application/json" } }
            );
            if (!res.ok) { results[orgnr] = null; return; }
            const data = await res.json();
            const items = Array.isArray(data) ? data : data?._embedded?.regnskaper || [];
            if (!items.length) { results[orgnr] = null; return; }
            const r = items[0];
            const resultat = r.resultatregnskapResultat || {};
            const driftsres = resultat.driftsresultat;
            results[orgnr] = {
              year: r.regnskapsperiode?.fraDato?.substring(0, 4) || "",
              omsetning: driftsres?.driftsinntekter?.sumDriftsinntekter || resultat.driftsinntekter?.sumDriftsinntekter || 0,
              driftsresultat: typeof driftsres === "number" ? driftsres : (driftsres?.driftsresultat || 0),
              arsresultat: resultat.ordinaertResultatFoerSkattekostnad || resultat.aarsresultat || 0,
            };
          } catch { results[orgnr] = null; }
        })
      );

      return new Response(JSON.stringify({ financials: results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "top") {
      const page = url.searchParams.get("page") || "0";
      const size = url.searchParams.get("size") || "30";
      const sort = url.searchParams.get("sort") || "antallAnsatte";
      const order = url.searchParams.get("order") || "desc";
      const kommune = url.searchParams.get("kommune") || "";

      let apiUrl = `${BRREG_BASE}/enhetsregisteret/api/enheter?organisasjonsform=AS,ASA&page=${page}&size=${size}&sort=${sort},${order}`;
      if (kommune) apiUrl += `&kommunenummer=${kommune}`;

      const res = await fetch(apiUrl, { headers: { Accept: "application/json" } });
      const data = await res.json();
      const enheter = data?._embedded?.enheter || [];
      const totalElements = data?.page?.totalElements || 0;

      const companies = enheter.map((e: any) => ({
        orgnr: e.organisasjonsnummer,
        navn: e.navn,
        kommune: e.forretningsadresse?.kommune || e.postadresse?.kommune || "",
        naeringsbeskriv: e.naeringskode1?.beskrivelse || "",
        antallAnsatte: e.antallAnsatte || 0,
        stiftelsesdato: e.stiftelsesdato,
        konkurs: e.konkurs || false,
      }));

      return new Response(JSON.stringify({ companies, totalElements }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "announcements") {
      const orgnr = url.searchParams.get("orgnr");
      if (!orgnr) {
        return new Response(JSON.stringify({ error: "orgnr required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // BRREG kunngjøringer API (via data.brreg.no to avoid DNS issues)
      const res = await fetch(
        `https://data.brreg.no/enhetsregisteret/api/enheter/${orgnr}/roller`,
        { headers: { Accept: "application/json" } }
      );

      if (!res.ok) {
        return new Response(JSON.stringify({ announcements: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const items = data?._embedded?.kunngjoeringer || data?.kunngjoeringer || [];

      const announcements = items.map((k: any) => ({
        id: k.id || `${k.kunngjoring_dato}-${k.kunngjoringstype}`,
        kunngjoringstype: k.kunngjoringstype || k.type || "Ukjent",
        dato: k.kunngjoring_dato || k.dato || "",
        beskrivelse: k.beskrivelse || k.innhold || "",
      }));

      return new Response(JSON.stringify({ announcements }), {
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
