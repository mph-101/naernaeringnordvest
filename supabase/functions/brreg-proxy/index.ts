import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const BRREG_BASE = "https://data.brreg.no";

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
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
      const pageNum = parseInt(page, 10) || 0;
      const pageSize = parseInt(size, 10) || 20;

      let enheter: any[] = [];
      let totalElements = 0;
      let totalPages = 0;

      if (isOrgnr) {
        let apiUrl = `${BRREG_BASE}/enhetsregisteret/api/enheter?organisasjonsnummer=${query.trim()}&page=${page}&size=${size}`;
        if (kommune) apiUrl += `&kommunenummer=${kommune}`;
        const res = await fetch(apiUrl, { headers: { Accept: "application/json" } });
        const data = await res.json();
        enheter = data?._embedded?.enheter || [];
        totalElements = data?.page?.totalElements || 0;
        totalPages = data?.page?.totalPages || 0;
      } else {
        // Brreg's `navn=` works best as a single-token prefix search. Multi-word
        // queries like "Veøy AS" become fulltext-AND that returns 400k+ rows in
        // alphabetical order and pushes the actual match past the candidate window.
        // Strategy:
        //   1. Strip the legal suffix and use the most distinctive token as the query.
        //   2. Fetch candidates without an organisasjonsform filter so foreign
        //      entities (UTLA/NUF) like SCHENKER AB are not excluded.
        //   3. Rank against the original query so "Veøy AS" still beats "Veøy Buss AS".
        const cleaned = query.trim().toLowerCase();
        const stripped = cleaned.replace(/\s+(as|asa|sa|ans|da|ba)$/i, "").trim();
        // Use the longest token as the primary Brreg query — most distinctive,
        // narrows candidate pool dramatically (e.g. "veøy" → 6 hits, not 423k).
        const tokens = stripped.split(/\s+/).filter(Boolean);
        const primaryToken = tokens.sort((a, b) => b.length - a.length)[0] || stripped;

        const candidateSize = 100;
        const tryFetch = async (q: string, withOrgFormFilter: boolean): Promise<any[]> => {
          let apiUrl = `${BRREG_BASE}/enhetsregisteret/api/enheter?navn=${encodeURIComponent(q)}&size=${candidateSize}&sort=navn,asc`;
          if (withOrgFormFilter) apiUrl += `&organisasjonsform=AS,ASA`;
          if (kommune) apiUrl += `&kommunenummer=${kommune}`;
          if (naeringskode) apiUrl += `&naeringskode=${naeringskode}`;
          const res = await fetch(apiUrl, { headers: { Accept: "application/json" } });
          const data = await res.json();
          return data?._embedded?.enheter || [];
        };

        // 1) Primary token, no orgform filter (catches UTLA/NUF foreign entities).
        let candidates = await tryFetch(primaryToken, false);
        // 2) Fallback: full stripped query if primary returned nothing useful.
        if (candidates.length === 0 && stripped !== primaryToken) {
          candidates = await tryFetch(stripped, false);
        }

        const score = (navn: string): number => {
          const n = (navn || "").toLowerCase();
          if (n === cleaned) return 100;
          if (n === `${stripped} as` || n === `${stripped} asa`) return 95;
          if (n === stripped) return 92;
          if (n.startsWith(`${cleaned} `)) return 85;
          if (n.startsWith(`${stripped} `)) return 75;
          if (n.startsWith(cleaned)) return 70;
          if (n.startsWith(stripped)) return 60;
          if (n.includes(` ${stripped} `) || n.endsWith(` ${stripped}`)) return 50;
          if (n.includes(stripped)) return 30;
          // Multi-word queries: also accept names containing the primary token.
          if (tokens.length > 1 && n.includes(primaryToken)) return 20;
          return 0;
        };

        const ranked = candidates
          .map((e) => ({ e, s: score(e.navn) }))
          .filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s)
          .map((x) => x.e);

        totalElements = ranked.length;
        totalPages = Math.ceil(totalElements / pageSize);
        enheter = ranked.slice(pageNum * pageSize, (pageNum + 1) * pageSize);
      }

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
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (action === "financials") {
      const orgnr = url.searchParams.get("orgnr");
      if (!orgnr) {
        return new Response(JSON.stringify({ error: "orgnr required" }), {
          status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }

      const sb = getSupabaseAdmin();

      // 1. Fetch fresh data from BRREG (latest filing)
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

      // Parse fresh BRREG data
      const freshRows = allRegnskaper.map((r: any) => {
        const resultat = r.resultatregnskapResultat || {};
        const driftsres = resultat.driftsresultat;
        const eiendeler = r.eiendeler || {};
        const egenkapitalGjeld = r.egenkapitalGjeld || {};
        return {
          orgnr,
          year: r.regnskapsperiode?.fraDato?.substring(0, 4) || r.journalnr || "",
          omsetning: driftsres?.driftsinntekter?.sumDriftsinntekter || resultat.driftsinntekter?.sumDriftsinntekter || 0,
          driftsresultat: typeof driftsres === "number" ? driftsres : (driftsres?.driftsresultat || 0),
          arsresultat: resultat.ordinaertResultatFoerSkattekostnad || resultat.aarsresultat || 0,
          egenkapital: egenkapitalGjeld.sumEgenkapitalGjeld || egenkapitalGjeld.egenkapital?.sumEgenkapital || 0,
          sum_eiendeler: eiendeler.sumEiendeler || 0,
        };
      }).filter((r: any) => r.year);

      // 2. Upsert fresh data into cache (ON CONFLICT DO UPDATE to refresh values)
      if (freshRows.length > 0) {
        await sb.from("company_financials").upsert(
          freshRows.map((r: any) => ({
            orgnr: r.orgnr,
            year: r.year,
            omsetning: r.omsetning,
            driftsresultat: r.driftsresultat,
            arsresultat: r.arsresultat,
            egenkapital: r.egenkapital,
            sum_eiendeler: r.sum_eiendeler,
            fetched_at: new Date().toISOString(),
          })),
          { onConflict: "orgnr,year" }
        );
      }

      // 3. Return ALL cached years for this company (historical + fresh)
      const { data: cached } = await sb
        .from("company_financials")
        .select("year, omsetning, driftsresultat, arsresultat, egenkapital, sum_eiendeler")
        .eq("orgnr", orgnr)
        .order("year", { ascending: false });

      const years = (cached || []).map((r: any) => ({
        year: r.year,
        omsetning: r.omsetning,
        driftsresultat: r.driftsresultat,
        arsresultat: r.arsresultat,
        egenkapital: r.egenkapital,
        sumEiendeler: r.sum_eiendeler,
      }));

      return new Response(JSON.stringify({ financials: years }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (action === "roles") {
      const orgnr = url.searchParams.get("orgnr");
      if (!orgnr) {
        return new Response(JSON.stringify({ error: "orgnr required" }), {
          status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }

      const res = await fetch(`${BRREG_BASE}/enhetsregisteret/api/enheter/${orgnr}/roller`, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        return new Response(JSON.stringify({ roles: [] }), {
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
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
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (action === "new_establishments") {
      const kommune = url.searchParams.get("kommune") || "";
      const fraDate = url.searchParams.get("fra") || "";
      const tilDate = url.searchParams.get("til") || "";

      let apiUrl = `${BRREG_BASE}/enhetsregisteret/api/enheter?organisasjonsform=AS,ASA&size=50&sort=stiftelsesdato,desc`;
      if (fraDate) apiUrl += `&fraStiftelsesdato=${fraDate}`;
      if (tilDate) apiUrl += `&tilStiftelsesdato=${tilDate}`;
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
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (action === "bankruptcies") {
      const kommune = url.searchParams.get("kommune") || "";
      const fraDate = url.searchParams.get("fra") || "";
      const tilDate = url.searchParams.get("til") || "";
      // Brreg supports neither date-range filter nor sort on konkursdato.
      // Fetch a larger pool sorted by registration date, then filter client-side on konkursdato.
      let apiUrl = `${BRREG_BASE}/enhetsregisteret/api/enheter?organisasjonsform=AS,ASA&konkurs=true&size=200&sort=registreringsdatoEnhetsregisteret,desc`;
      if (kommune) apiUrl += `&kommunenummer=${kommune}`;

      const res = await fetch(apiUrl, { headers: { Accept: "application/json" } });
      const data = await res.json();
      let enheter = data?._embedded?.enheter || [];

      // Filter on konkursdato if a range is provided
      if (fraDate || tilDate) {
        enheter = enheter.filter((e: any) => {
          const k = e.konkursdato || "";
          if (!k) return false;
          if (fraDate && k < fraDate) return false;
          if (tilDate && k > tilDate) return false;
          return true;
        });
      }

      // Sort by konkursdato desc
      enheter.sort((a: any, b: any) => (b.konkursdato || "").localeCompare(a.konkursdato || ""));

      const total = enheter.length;
      const companies = enheter.slice(0, 50).map((e: any) => ({
        orgnr: e.organisasjonsnummer,
        navn: e.navn,
        stiftelsesdato: e.stiftelsesdato,
        registreringsdato: e.konkursdato || e.registreringsdatoEnhetsregisteret,
        kommune: e.forretningsadresse?.kommune || "",
        naeringsbeskriv: e.naeringskode1?.beskrivelse || "",
        antallAnsatte: e.antallAnsatte || 0,
      }));

      return new Response(JSON.stringify({ companies, total }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (action === "batch_financials") {
      const orgnrs = url.searchParams.get("orgnrs") || "";
      const orgnrList = orgnrs.split(",").filter(Boolean).slice(0, 50);
      if (!orgnrList.length) {
        return new Response(JSON.stringify({ financials: {} }), {
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }

      const sb = getSupabaseAdmin();
      const results: Record<string, any> = {};
      const rowsToCache: any[] = [];

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
            const egenkapitalGjeld = r.egenkapitalGjeld || {};
            const eiendeler = r.eiendeler || {};
            const year = r.regnskapsperiode?.fraDato?.substring(0, 4) || "";
            const row = {
              year,
              omsetning: driftsres?.driftsinntekter?.sumDriftsinntekter || resultat.driftsinntekter?.sumDriftsinntekter || 0,
              driftsresultat: typeof driftsres === "number" ? driftsres : (driftsres?.driftsresultat || 0),
              arsresultat: resultat.ordinaertResultatFoerSkattekostnad || resultat.aarsresultat || 0,
            };
            results[orgnr] = row;
            if (year) {
              rowsToCache.push({
                orgnr,
                year,
                omsetning: row.omsetning,
                driftsresultat: row.driftsresultat,
                arsresultat: row.arsresultat,
                egenkapital: egenkapitalGjeld.sumEgenkapitalGjeld || egenkapitalGjeld.egenkapital?.sumEgenkapital || 0,
                sum_eiendeler: eiendeler.sumEiendeler || 0,
                fetched_at: new Date().toISOString(),
              });
            }
          } catch { results[orgnr] = null; }
        })
      );

      // Cache all fetched data
      if (rowsToCache.length > 0) {
        await sb.from("company_financials").upsert(rowsToCache, { onConflict: "orgnr,year" });
      }

      return new Response(JSON.stringify({ financials: results }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
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
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }


    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("brreg-proxy error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
