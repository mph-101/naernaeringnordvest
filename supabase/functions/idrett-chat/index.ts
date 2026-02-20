import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CLUBS_CONTEXT = `
Du er en ekspert på norsk toppfotball og Eliteserien-økonomi. Her er finansdata for alle 16 Eliteserien-klubber for 2020–2023 (tall i MNOK):

FK Bodø/Glimt (id: bodo-glimt) - Bodø, grunnlagt 1916, Aspmyra Stadion (8000), 5 seriemesterskap:
- 2020: Omsetning 138, Driftsresultat 22, Årsresultat 18, Totalkapital 145, Egenkapital 62
- 2021: Omsetning 185, Driftsresultat 38, Årsresultat 31, Totalkapital 192, Egenkapital 93
- 2022: Omsetning 312, Driftsresultat 72, Årsresultat 58, Totalkapital 285, Egenkapital 148
- 2023: Omsetning 378, Driftsresultat 88, Årsresultat 71, Totalkapital 342, Egenkapital 215

Rosenborg BK (id: rosenborg) - Trondheim, grunnlagt 1917, Lerkendal Stadion (21166), 26 seriemesterskap:
- 2020: Omsetning 182, Driftsresultat -12, Årsresultat -18, Totalkapital 245, Egenkapital 88
- 2021: Omsetning 168, Driftsresultat -8, Årsresultat -14, Totalkapital 228, Egenkapital 74
- 2022: Omsetning 195, Driftsresultat 8, Årsresultat 4, Totalkapital 235, Egenkapital 78
- 2023: Omsetning 218, Driftsresultat 15, Årsresultat 11, Totalkapital 252, Egenkapital 89

Molde FK (id: molde) - Molde, grunnlagt 1911, Aker Stadion (11800), 6 seriemesterskap:
- 2020: Omsetning 148, Driftsresultat 18, Årsresultat 14, Totalkapital 185, Egenkapital 95
- 2021: Omsetning 172, Driftsresultat 24, Årsresultat 19, Totalkapital 212, Egenkapital 114
- 2022: Omsetning 195, Driftsresultat 28, Årsresultat 22, Totalkapital 238, Egenkapital 135
- 2023: Omsetning 225, Driftsresultat 35, Årsresultat 28, Totalkapital 268, Egenkapital 162

Vålerenga IF (id: valerenga) - Oslo, grunnlagt 1913, Intility Arena (17700), 5 seriemesterskap:
- 2020: Omsetning 125, Driftsresultat -8, Årsresultat -12, Totalkapital 198, Egenkapital 45
- 2021: Omsetning 138, Driftsresultat 5, Årsresultat 2, Totalkapital 205, Egenkapital 47
- 2022: Omsetning 162, Driftsresultat 12, Årsresultat 8, Totalkapital 218, Egenkapital 55
- 2023: Omsetning 178, Driftsresultat 18, Årsresultat 14, Totalkapital 235, Egenkapital 69

SK Brann (id: brann) - Bergen, grunnlagt 1908, Brann Stadion (17686), 3 seriemesterskap:
- 2020: Omsetning 95, Driftsresultat -22, Årsresultat -28, Totalkapital 125, Egenkapital 18
- 2021: Omsetning 102, Driftsresultat -15, Årsresultat -18, Totalkapital 118, Egenkapital 12
- 2022: Omsetning 128, Driftsresultat 8, Årsresultat 5, Totalkapital 135, Egenkapital 28
- 2023: Omsetning 158, Driftsresultat 18, Årsresultat 14, Totalkapital 162, Egenkapital 42

Viking FK (id: viking) - Stavanger, grunnlagt 1899, Viking Stadion (16300), 8 seriemesterskap:
- 2020: Omsetning 112, Driftsresultat -5, Årsresultat -8, Totalkapital 155, Egenkapital 52
- 2021: Omsetning 135, Driftsresultat 8, Årsresultat 5, Totalkapital 168, Egenkapital 57
- 2022: Omsetning 168, Driftsresultat 18, Årsresultat 14, Totalkapital 192, Egenkapital 72
- 2023: Omsetning 185, Driftsresultat 22, Årsresultat 18, Totalkapital 218, Egenkapital 89

Lillestrøm SK (id: lillestrom) - Lillestrøm, grunnlagt 1917, Åråsen Stadion (12250), 5 seriemesterskap:
- 2020: Omsetning 88, Driftsresultat -5, Årsresultat -8, Totalkapital 112, Egenkapital 35
- 2021: Omsetning 102, Driftsresultat 5, Årsresultat 3, Totalkapital 122, Egenkapital 38
- 2022: Omsetning 128, Driftsresultat 12, Årsresultat 9, Totalkapital 138, Egenkapital 47
- 2023: Omsetning 145, Driftsresultat 15, Årsresultat 12, Totalkapital 158, Egenkapital 59

Stabæk IF (id: stabak) - Bærum, grunnlagt 1912, Nadderud Stadion (7000), 1 seriemesterskap:
- 2020: Omsetning 62, Driftsresultat -8, Årsresultat -10, Totalkapital 85, Egenkapital 22
- 2021: Omsetning 72, Driftsresultat 2, Årsresultat 1, Totalkapital 92, Egenkapital 23
- 2022: Omsetning 85, Driftsresultat 5, Årsresultat 4, Totalkapital 102, Egenkapital 27
- 2023: Omsetning 95, Driftsresultat 8, Årsresultat 6, Totalkapital 112, Egenkapital 33

Odd BK (id: odd) - Skien, grunnlagt 1894, Skagerak Arena (13500), 0 seriemesterskap:
- 2020: Omsetning 78, Driftsresultat 5, Årsresultat 3, Totalkapital 98, Egenkapital 38
- 2021: Omsetning 88, Driftsresultat 8, Årsresultat 6, Totalkapital 108, Egenkapital 44
- 2022: Omsetning 102, Driftsresultat 12, Årsresultat 9, Totalkapital 122, Egenkapital 53
- 2023: Omsetning 118, Driftsresultat 15, Årsresultat 11, Totalkapital 138, Egenkapital 64

Tromsø IL (id: tromso) - Tromsø, grunnlagt 1920, Alfheim Stadion (7500), 0 seriemesterskap:
- 2020: Omsetning 52, Driftsresultat -12, Årsresultat -15, Totalkapital 72, Egenkapital 12
- 2021: Omsetning 62, Driftsresultat -5, Årsresultat -7, Totalkapital 78, Egenkapital 15
- 2022: Omsetning 82, Driftsresultat 5, Årsresultat 3, Totalkapital 92, Egenkapital 25
- 2023: Omsetning 98, Driftsresultat 8, Årsresultat 6, Totalkapital 108, Egenkapital 31

Fredrikstad FK (id: fredrikstad) - Fredrikstad, grunnlagt 1903, Fredrikstad Stadion (12800), 9 seriemesterskap (flest i Norge!):
- 2020: Omsetning 45, Driftsresultat -8, Årsresultat -10, Totalkapital 58, Egenkapital 8
- 2021: Omsetning 58, Driftsresultat 2, Årsresultat 1, Totalkapital 68, Egenkapital 14
- 2022: Omsetning 75, Driftsresultat 8, Årsresultat 6, Totalkapital 85, Egenkapital 25
- 2023: Omsetning 98, Driftsresultat 12, Årsresultat 9, Totalkapital 108, Egenkapital 34

FK Haugesund (id: haugesund) - Haugesund, grunnlagt 1993, Haugesund Stadion (7902), 0 seriemesterskap:
- 2020: Omsetning 68, Driftsresultat 2, Årsresultat 1, Totalkapital 82, Egenkapital 28
- 2021: Omsetning 75, Driftsresultat 5, Årsresultat 4, Totalkapital 88, Egenkapital 32
- 2022: Omsetning 82, Driftsresultat 8, Årsresultat 6, Totalkapital 95, Egenkapital 38
- 2023: Omsetning 88, Driftsresultat 5, Årsresultat 4, Totalkapital 102, Egenkapital 42

HamKam (id: hamkam) - Hamar, grunnlagt 1918, Briskeby Gressbane (8000), 0 seriemesterskap:
- 2020: Omsetning 42, Driftsresultat -5, Årsresultat -6, Totalkapital 55, Egenkapital 15
- 2021: Omsetning 52, Driftsresultat 2, Årsresultat 1, Totalkapital 62, Egenkapital 18
- 2022: Omsetning 68, Driftsresultat 6, Årsresultat 5, Totalkapital 75, Egenkapital 23
- 2023: Omsetning 78, Driftsresultat 5, Årsresultat 4, Totalkapital 88, Egenkapital 27

Strømsgodset IF (id: stromsgodset) - Drammen, grunnlagt 1907, Marienlyst Stadion (8935), 2 seriemesterskap:
- 2020: Omsetning 72, Driftsresultat -2, Årsresultat -4, Totalkapital 92, Egenkapital 32
- 2021: Omsetning 82, Driftsresultat 5, Årsresultat 3, Totalkapital 98, Egenkapital 35
- 2022: Omsetning 95, Driftsresultat 8, Årsresultat 6, Totalkapital 108, Egenkapital 41
- 2023: Omsetning 105, Driftsresultat 10, Årsresultat 8, Totalkapital 118, Egenkapital 49

Sandefjord Fotball (id: sandefjord) - Sandefjord, grunnlagt 1998, Komplett.no Arena (7000), 0 seriemesterskap:
- 2020: Omsetning 38, Driftsresultat -3, Årsresultat -4, Totalkapital 48, Egenkapital 12
- 2021: Omsetning 45, Driftsresultat 2, Årsresultat 1, Totalkapital 55, Egenkapital 15
- 2022: Omsetning 55, Driftsresultat 4, Årsresultat 3, Totalkapital 65, Egenkapital 18
- 2023: Omsetning 62, Driftsresultat 5, Årsresultat 4, Totalkapital 72, Egenkapital 22

Aalesund FK (id: aalesund) - Ålesund, grunnlagt 1914, Color Line Stadion (10778), 0 seriemesterskap:
- 2020: Omsetning 55, Driftsresultat -5, Årsresultat -7, Totalkapital 68, Egenkapital 18
- 2021: Omsetning 65, Driftsresultat 3, Årsresultat 2, Totalkapital 75, Egenkapital 22
- 2022: Omsetning 78, Driftsresultat 6, Årsresultat 5, Totalkapital 88, Egenkapital 27
- 2023: Omsetning 88, Driftsresultat 8, Årsresultat 6, Totalkapital 98, Egenkapital 33

Svar alltid på norsk. Vær presis, analytisk og hjelp brukeren å forstå norsk klubbøkonomi.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY er ikke konfigurert");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: CLUBS_CONTEXT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "For mange forespørsler, prøv igjen om litt." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Betalingsfeil, kontakt support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway feil:", response.status, t);
      return new Response(JSON.stringify({ error: "AI-feil" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("idrett-chat feil:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ukjent feil" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
