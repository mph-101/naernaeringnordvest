export interface ClubFinancials {
  year: number;
  omsetning: number; // Revenue in MNOK
  driftsresultat: number; // Operating result in MNOK
  aarsresultat: number; // Net result in MNOK
  totalkapital: number; // Total assets in MNOK
  egenkapital: number; // Equity in MNOK
  inntektskilder: {
    spillerinntekter: number; // Player sales
    billettinntekter: number; // Ticket revenue
    sponsorinntekter: number; // Sponsorship
    tvPenger: number; // TV/Media rights
    andreInntekter: number; // Other
  };
}

export interface Club {
  id: string;
  navn: string;
  by: string;
  grunnlagt: number;
  stadion: string;
  stadionKapasitet: number;
  farger: string;
  liga: "Eliteserien";
  finansdata: ClubFinancials[];
  beskrivelse: string;
  titler: number; // Norwegian championship titles
}

export const clubs: Club[] = [
  {
    id: "bodo-glimt",
    navn: "FK Bodø/Glimt",
    by: "Bodø",
    grunnlagt: 1916,
    stadion: "Aspmyra Stadion",
    stadionKapasitet: 8000,
    farger: "Gul/Sort",
    liga: "Eliteserien",
    titler: 5,
    beskrivelse: "Regjerende mester og Norges mest suksessfulle klubb det siste tiåret. Kjent for sin offensive 4-3-3-stil og eventyrlige Europa-reiser.",
    finansdata: [
      { year: 2020, omsetning: 138, driftsresultat: 22, aarsresultat: 18, totalkapital: 145, egenkapital: 62, inntektskilder: { spillerinntekter: 55, billettinntekter: 4, sponsorinntekter: 28, tvPenger: 38, andreInntekter: 13 } },
      { year: 2021, omsetning: 185, driftsresultat: 38, aarsresultat: 31, totalkapital: 192, egenkapital: 93, inntektskilder: { spillerinntekter: 82, billettinntekter: 8, sponsorinntekter: 35, tvPenger: 45, andreInntekter: 15 } },
      { year: 2022, omsetning: 312, driftsresultat: 72, aarsresultat: 58, totalkapital: 285, egenkapital: 148, inntektskilder: { spillerinntekter: 168, billettinntekter: 18, sponsorinntekter: 48, tvPenger: 58, andreInntekter: 20 } },
      { year: 2023, omsetning: 378, driftsresultat: 88, aarsresultat: 71, totalkapital: 342, egenkapital: 215, inntektskilder: { spillerinntekter: 195, billettinntekter: 22, sponsorinntekter: 62, tvPenger: 72, andreInntekter: 27 } },
    ],
  },
  {
    id: "rosenborg",
    navn: "Rosenborg BK",
    by: "Trondheim",
    grunnlagt: 1917,
    stadion: "Lerkendal Stadion",
    stadionKapasitet: 21166,
    farger: "Sort/Hvit",
    liga: "Eliteserien",
    titler: 26,
    beskrivelse: "Norges største klubb historisk sett med 26 seriemesterskap. Champions League-deltagere på 1990- og 2000-tallet.",
    finansdata: [
      { year: 2020, omsetning: 182, driftsresultat: -12, aarsresultat: -18, totalkapital: 245, egenkapital: 88, inntektskilder: { spillerinntekter: 42, billettinntekter: 22, sponsorinntekter: 55, tvPenger: 42, andreInntekter: 21 } },
      { year: 2021, omsetning: 168, driftsresultat: -8, aarsresultat: -14, totalkapital: 228, egenkapital: 74, inntektskilder: { spillerinntekter: 38, billettinntekter: 18, sponsorinntekter: 52, tvPenger: 42, andreInntekter: 18 } },
      { year: 2022, omsetning: 195, driftsresultat: 8, aarsresultat: 4, totalkapital: 235, egenkapital: 78, inntektskilder: { spillerinntekter: 55, billettinntekter: 28, sponsorinntekter: 58, tvPenger: 42, andreInntekter: 12 } },
      { year: 2023, omsetning: 218, driftsresultat: 15, aarsresultat: 11, totalkapital: 252, egenkapital: 89, inntektskilder: { spillerinntekter: 68, billettinntekter: 32, sponsorinntekter: 62, tvPenger: 42, andreInntekter: 14 } },
    ],
  },
  {
    id: "molde",
    navn: "Molde FK",
    by: "Molde",
    grunnlagt: 1911,
    stadion: "Aker Stadion",
    stadionKapasitet: 11800,
    farger: "Blå/Hvit",
    liga: "Eliteserien",
    titler: 6,
    beskrivelse: "Ole Gunnar Solskjærs tidligere klubb og en av Norges mest konsistente toppklubber. Kjent for sin stabile økonomi og spillerutvikling.",
    finansdata: [
      { year: 2020, omsetning: 148, driftsresultat: 18, aarsresultat: 14, totalkapital: 185, egenkapital: 95, inntektskilder: { spillerinntekter: 52, billettinntekter: 12, sponsorinntekter: 38, tvPenger: 38, andreInntekter: 8 } },
      { year: 2021, omsetning: 172, driftsresultat: 24, aarsresultat: 19, totalkapital: 212, egenkapital: 114, inntektskilder: { spillerinntekter: 68, billettinntekter: 16, sponsorinntekter: 42, tvPenger: 38, andreInntekter: 8 } },
      { year: 2022, omsetning: 195, driftsresultat: 28, aarsresultat: 22, totalkapital: 238, egenkapital: 135, inntektskilder: { spillerinntekter: 78, billettinntekter: 22, sponsorinntekter: 48, tvPenger: 38, andreInntekter: 9 } },
      { year: 2023, omsetning: 225, driftsresultat: 35, aarsresultat: 28, totalkapital: 268, egenkapital: 162, inntektskilder: { spillerinntekter: 95, billettinntekter: 25, sponsorinntekter: 55, tvPenger: 42, andreInntekter: 8 } },
    ],
  },
  {
    id: "valerenga",
    navn: "Vålerenga IF",
    by: "Oslo",
    grunnlagt: 1913,
    stadion: "Intility Arena",
    stadionKapasitet: 17700,
    farger: "Blå/Hvit",
    liga: "Eliteserien",
    titler: 5,
    beskrivelse: "Oslos mest populære klubb med sterk supporterkultur. Spiller på moderne Intility Arena og er en viktig merkevare i norsk fotball.",
    finansdata: [
      { year: 2020, omsetning: 125, driftsresultat: -8, aarsresultat: -12, totalkapital: 198, egenkapital: 45, inntektskilder: { spillerinntekter: 22, billettinntekter: 28, sponsorinntekter: 42, tvPenger: 38, andreInntekter: -5 } },
      { year: 2021, omsetning: 138, driftsresultat: 5, aarsresultat: 2, totalkapital: 205, egenkapital: 47, inntektskilder: { spillerinntekter: 28, billettinntekter: 22, sponsorinntekter: 45, tvPenger: 38, andreInntekter: 5 } },
      { year: 2022, omsetning: 162, driftsresultat: 12, aarsresultat: 8, totalkapital: 218, egenkapital: 55, inntektskilder: { spillerinntekter: 38, billettinntekter: 38, sponsorinntekter: 48, tvPenger: 38, andreInntekter: 0 } },
      { year: 2023, omsetning: 178, driftsresultat: 18, aarsresultat: 14, totalkapital: 235, egenkapital: 69, inntektskilder: { spillerinntekter: 48, billettinntekter: 42, sponsorinntekter: 52, tvPenger: 42, andreInntekter: -6 } },
    ],
  },
  {
    id: "brann",
    navn: "SK Brann",
    by: "Bergen",
    grunnlagt: 1908,
    stadion: "Brann Stadion",
    stadionKapasitet: 17686,
    farger: "Rød/Hvit",
    liga: "Eliteserien",
    titler: 3,
    beskrivelse: "Vestlandets stolthet med lidenskapelige supportere. Endelig tilbake i Eliteserien og ser en sterk oppsving etter turbulente år.",
    finansdata: [
      { year: 2020, omsetning: 95, driftsresultat: -22, aarsresultat: -28, totalkapital: 125, egenkapital: 18, inntektskilder: { spillerinntekter: 8, billettinntekter: 18, sponsorinntekter: 35, tvPenger: 28, andreInntekter: 6 } },
      { year: 2021, omsetning: 102, driftsresultat: -15, aarsresultat: -18, totalkapital: 118, egenkapital: 12, inntektskilder: { spillerinntekter: 12, billettinntekter: 15, sponsorinntekter: 38, tvPenger: 28, andreInntekter: 9 } },
      { year: 2022, omsetning: 128, driftsresultat: 8, aarsresultat: 5, totalkapital: 135, egenkapital: 28, inntektskilder: { spillerinntekter: 25, billettinntekter: 28, sponsorinntekter: 42, tvPenger: 28, andreInntekter: 5 } },
      { year: 2023, omsetning: 158, driftsresultat: 18, aarsresultat: 14, totalkapital: 162, egenkapital: 42, inntektskilder: { spillerinntekter: 42, billettinntekter: 35, sponsorinntekter: 48, tvPenger: 28, andreInntekter: 5 } },
    ],
  },
  {
    id: "viking",
    navn: "Viking FK",
    by: "Stavanger",
    grunnlagt: 1899,
    stadion: "Viking Stadion",
    stadionKapasitet: 16300,
    farger: "Mørkeblå/Gul",
    liga: "Eliteserien",
    titler: 8,
    beskrivelse: "En av Norges eldste og mest meritterte klubber. Sterkt forankret i oljebyen Stavanger med ambisiøse eiere.",
    finansdata: [
      { year: 2020, omsetning: 112, driftsresultat: -5, aarsresultat: -8, totalkapital: 155, egenkapital: 52, inntektskilder: { spillerinntekter: 18, billettinntekter: 22, sponsorinntekter: 38, tvPenger: 28, andreInntekter: 6 } },
      { year: 2021, omsetning: 135, driftsresultat: 8, aarsresultat: 5, totalkapital: 168, egenkapital: 57, inntektskilder: { spillerinntekter: 32, billettinntekter: 25, sponsorinntekter: 42, tvPenger: 28, andreInntekter: 8 } },
      { year: 2022, omsetning: 168, driftsresultat: 18, aarsresultat: 14, totalkapital: 192, egenkapital: 72, inntektskilder: { spillerinntekter: 55, billettinntekter: 32, sponsorinntekter: 48, tvPenger: 28, andreInntekter: 5 } },
      { year: 2023, omsetning: 185, driftsresultat: 22, aarsresultat: 18, totalkapital: 218, egenkapital: 89, inntektskilder: { spillerinntekter: 62, billettinntekter: 35, sponsorinntekter: 52, tvPenger: 28, andreInntekter: 8 } },
    ],
  },
  {
    id: "lillestrom",
    navn: "Lillestrøm SK",
    by: "Lillestrøm",
    grunnlagt: 1917,
    stadion: "Åråsen Stadion",
    stadionKapasitet: 12250,
    farger: "Gul/Sort",
    liga: "Eliteserien",
    titler: 5,
    beskrivelse: "Tradisjonrik klubb fra Romerike med fem seriemesterskap. Sterk lokal forankring og god spillerutvikling.",
    finansdata: [
      { year: 2020, omsetning: 88, driftsresultat: -5, aarsresultat: -8, totalkapital: 112, egenkapital: 35, inntektskilder: { spillerinntekter: 15, billettinntekter: 12, sponsorinntekter: 28, tvPenger: 28, andreInntekter: 5 } },
      { year: 2021, omsetning: 102, driftsresultat: 5, aarsresultat: 3, totalkapital: 122, egenkapital: 38, inntektskilder: { spillerinntekter: 22, billettinntekter: 15, sponsorinntekter: 32, tvPenger: 28, andreInntekter: 5 } },
      { year: 2022, omsetning: 128, driftsresultat: 12, aarsresultat: 9, totalkapital: 138, egenkapital: 47, inntektskilder: { spillerinntekter: 38, billettinntekter: 18, sponsorinntekter: 35, tvPenger: 28, andreInntekter: 9 } },
      { year: 2023, omsetning: 145, driftsresultat: 15, aarsresultat: 12, totalkapital: 158, egenkapital: 59, inntektskilder: { spillerinntekter: 45, billettinntekter: 20, sponsorinntekter: 38, tvPenger: 28, andreInntekter: 14 } },
    ],
  },
  {
    id: "stabak",
    navn: "Stabæk IF",
    by: "Bærum",
    grunnlagt: 1912,
    stadion: "Nadderud Stadion",
    stadionKapasitet: 7000,
    farger: "Blå/Hvit",
    liga: "Eliteserien",
    titler: 1,
    beskrivelse: "Vestfold-klubben kjent for å utvikle talenter. Har hatt mange sesong i øverste divisjon og er stolt av sin akademimodell.",
    finansdata: [
      { year: 2020, omsetning: 62, driftsresultat: -8, aarsresultat: -10, totalkapital: 85, egenkapital: 22, inntektskilder: { spillerinntekter: 12, billettinntekter: 8, sponsorinntekter: 18, tvPenger: 18, andreInntekter: 6 } },
      { year: 2021, omsetning: 72, driftsresultat: 2, aarsresultat: 1, totalkapital: 92, egenkapital: 23, inntektskilder: { spillerinntekter: 18, billettinntekter: 10, sponsorinntekter: 20, tvPenger: 18, andreInntekter: 6 } },
      { year: 2022, omsetning: 85, driftsresultat: 5, aarsresultat: 4, totalkapital: 102, egenkapital: 27, inntektskilder: { spillerinntekter: 22, billettinntekter: 12, sponsorinntekter: 22, tvPenger: 18, andreInntekter: 11 } },
      { year: 2023, omsetning: 95, driftsresultat: 8, aarsresultat: 6, totalkapital: 112, egenkapital: 33, inntektskilder: { spillerinntekter: 28, billettinntekter: 14, sponsorinntekter: 25, tvPenger: 18, andreInntekter: 10 } },
    ],
  },
  {
    id: "odd",
    navn: "Odd BK",
    by: "Skien",
    grunnlagt: 1894,
    stadion: "Skagerak Arena",
    stadionKapasitet: 13500,
    farger: "Hvit/Sort",
    liga: "Eliteserien",
    titler: 0,
    beskrivelse: "En av Norges eldste klubber med røtter tilbake til 1894. Stabil Eliteserien-klubb med god lokal støtte fra Telemark.",
    finansdata: [
      { year: 2020, omsetning: 78, driftsresultat: 5, aarsresultat: 3, totalkapital: 98, egenkapital: 38, inntektskilder: { spillerinntekter: 18, billettinntekter: 12, sponsorinntekter: 22, tvPenger: 22, andreInntekter: 4 } },
      { year: 2021, omsetning: 88, driftsresultat: 8, aarsresultat: 6, totalkapital: 108, egenkapital: 44, inntektskilder: { spillerinntekter: 22, billettinntekter: 14, sponsorinntekter: 25, tvPenger: 22, andreInntekter: 5 } },
      { year: 2022, omsetning: 102, driftsresultat: 12, aarsresultat: 9, totalkapital: 122, egenkapital: 53, inntektskilder: { spillerinntekter: 28, billettinntekter: 18, sponsorinntekter: 28, tvPenger: 22, andreInntekter: 6 } },
      { year: 2023, omsetning: 118, driftsresultat: 15, aarsresultat: 11, totalkapital: 138, egenkapital: 64, inntektskilder: { spillerinntekter: 35, billettinntekter: 20, sponsorinntekter: 32, tvPenger: 22, andreInntekter: 9 } },
    ],
  },
  {
    id: "tromso",
    navn: "Tromsø IL",
    by: "Tromsø",
    grunnlagt: 1920,
    stadion: "Alfheim Stadion",
    stadionKapasitet: 7500,
    farger: "Rød/Hvit",
    liga: "Eliteserien",
    titler: 0,
    beskrivelse: "Nordens nordligste toppklubb. Unik atmosfære under midnattssolen og mørketiden. Sterk lokal identitet i Tromsø.",
    finansdata: [
      { year: 2020, omsetning: 52, driftsresultat: -12, aarsresultat: -15, totalkapital: 72, egenkapital: 12, inntektskilder: { spillerinntekter: 5, billettinntekter: 8, sponsorinntekter: 18, tvPenger: 18, andreInntekter: 3 } },
      { year: 2021, omsetning: 62, driftsresultat: -5, aarsresultat: -7, totalkapital: 78, egenkapital: 15, inntektskilder: { spillerinntekter: 8, billettinntekter: 10, sponsorinntekter: 20, tvPenger: 18, andreInntekter: 6 } },
      { year: 2022, omsetning: 82, driftsresultat: 5, aarsresultat: 3, totalkapital: 92, egenkapital: 25, inntektskilder: { spillerinntekter: 18, billettinntekter: 14, sponsorinntekter: 22, tvPenger: 22, andreInntekter: 6 } },
      { year: 2023, omsetning: 98, driftsresultat: 8, aarsresultat: 6, totalkapital: 108, egenkapital: 31, inntektskilder: { spillerinntekter: 25, billettinntekter: 16, sponsorinntekter: 28, tvPenger: 22, andreInntekter: 7 } },
    ],
  },
  {
    id: "fredrikstad",
    navn: "Fredrikstad FK",
    by: "Fredrikstad",
    grunnlagt: 1903,
    stadion: "Fredrikstad Stadion",
    stadionKapasitet: 12800,
    farger: "Rød/Hvit/Sort",
    liga: "Eliteserien",
    titler: 9,
    beskrivelse: "Historisk gigant med 9 seriemesterskap – flest i Norge! Tilbake i Eliteserien og bygger på stolt tradisjon.",
    finansdata: [
      { year: 2020, omsetning: 45, driftsresultat: -8, aarsresultat: -10, totalkapital: 58, egenkapital: 8, inntektskilder: { spillerinntekter: 5, billettinntekter: 8, sponsorinntekter: 15, tvPenger: 12, andreInntekter: 5 } },
      { year: 2021, omsetning: 58, driftsresultat: 2, aarsresultat: 1, totalkapital: 68, egenkapital: 14, inntektskilder: { spillerinntekter: 8, billettinntekter: 12, sponsorinntekter: 18, tvPenger: 12, andreInntekter: 8 } },
      { year: 2022, omsetning: 75, driftsresultat: 8, aarsresultat: 6, totalkapital: 85, egenkapital: 25, inntektskilder: { spillerinntekter: 15, billettinntekter: 18, sponsorinntekter: 22, tvPenger: 15, andreInntekter: 5 } },
      { year: 2023, omsetning: 98, driftsresultat: 12, aarsresultat: 9, totalkapital: 108, egenkapital: 34, inntektskilder: { spillerinntekter: 25, billettinntekter: 22, sponsorinntekter: 28, tvPenger: 18, andreInntekter: 5 } },
    ],
  },
  {
    id: "haugesund",
    navn: "FK Haugesund",
    by: "Haugesund",
    grunnlagt: 1993,
    stadion: "Haugesund Stadion",
    stadionKapasitet: 7902,
    farger: "Hvit/Sort",
    liga: "Eliteserien",
    titler: 0,
    beskrivelse: "Relativt ung klubb som etablerte seg i Eliteserien på 2000-tallet. Sterk lokal støtte fra Haugalandet-regionen.",
    finansdata: [
      { year: 2020, omsetning: 68, driftsresultat: 2, aarsresultat: 1, totalkapital: 82, egenkapital: 28, inntektskilder: { spillerinntekter: 12, billettinntekter: 10, sponsorinntekter: 22, tvPenger: 18, andreInntekter: 6 } },
      { year: 2021, omsetning: 75, driftsresultat: 5, aarsresultat: 4, totalkapital: 88, egenkapital: 32, inntektskilder: { spillerinntekter: 15, billettinntekter: 12, sponsorinntekter: 24, tvPenger: 18, andreInntekter: 6 } },
      { year: 2022, omsetning: 82, driftsresultat: 8, aarsresultat: 6, totalkapital: 95, egenkapital: 38, inntektskilder: { spillerinntekter: 18, billettinntekter: 14, sponsorinntekter: 26, tvPenger: 18, andreInntekter: 6 } },
      { year: 2023, omsetning: 88, driftsresultat: 5, aarsresultat: 4, totalkapital: 102, egenkapital: 42, inntektskilder: { spillerinntekter: 20, billettinntekter: 15, sponsorinntekter: 28, tvPenger: 18, andreInntekter: 7 } },
    ],
  },
  {
    id: "hamkam",
    navn: "HamKam",
    by: "Hamar",
    grunnlagt: 1918,
    stadion: "Briskeby Gressbane",
    stadionKapasitet: 8000,
    farger: "Grønn/Hvit",
    liga: "Eliteserien",
    titler: 0,
    beskrivelse: "Innlandslagets stolthet. HamKam representerer Hamar og Hedmarken med lang fotballtradisjon.",
    finansdata: [
      { year: 2020, omsetning: 42, driftsresultat: -5, aarsresultat: -6, totalkapital: 55, egenkapital: 15, inntektskilder: { spillerinntekter: 5, billettinntekter: 7, sponsorinntekter: 15, tvPenger: 12, andreInntekter: 3 } },
      { year: 2021, omsetning: 52, driftsresultat: 2, aarsresultat: 1, totalkapital: 62, egenkapital: 18, inntektskilder: { spillerinntekter: 8, billettinntekter: 9, sponsorinntekter: 18, tvPenger: 12, andreInntekter: 5 } },
      { year: 2022, omsetning: 68, driftsresultat: 6, aarsresultat: 5, totalkapital: 75, egenkapital: 23, inntektskilder: { spillerinntekter: 12, billettinntekter: 12, sponsorinntekter: 20, tvPenger: 18, andreInntekter: 6 } },
      { year: 2023, omsetning: 78, driftsresultat: 5, aarsresultat: 4, totalkapital: 88, egenkapital: 27, inntektskilder: { spillerinntekter: 15, billettinntekter: 14, sponsorinntekter: 22, tvPenger: 18, andreInntekter: 9 } },
    ],
  },
  {
    id: "stromsgodset",
    navn: "Strømsgodset IF",
    by: "Drammen",
    grunnlagt: 1907,
    stadion: "Marienlyst Stadion",
    stadionKapasitet: 8935,
    farger: "Blå/Hvit",
    liga: "Eliteserien",
    titler: 2,
    beskrivelse: "Drammenslaget kjent for sin underholdende spillestil og fokus på ungt talent. Seriemestere i 2013.",
    finansdata: [
      { year: 2020, omsetning: 72, driftsresultat: -2, aarsresultat: -4, totalkapital: 92, egenkapital: 32, inntektskilder: { spillerinntekter: 15, billettinntekter: 10, sponsorinntekter: 22, tvPenger: 18, andreInntekter: 7 } },
      { year: 2021, omsetning: 82, driftsresultat: 5, aarsresultat: 3, totalkapital: 98, egenkapital: 35, inntektskilder: { spillerinntekter: 20, billettinntekter: 12, sponsorinntekter: 25, tvPenger: 18, andreInntekter: 7 } },
      { year: 2022, omsetning: 95, driftsresultat: 8, aarsresultat: 6, totalkapital: 108, egenkapital: 41, inntektskilder: { spillerinntekter: 25, billettinntekter: 15, sponsorinntekter: 28, tvPenger: 18, andreInntekter: 9 } },
      { year: 2023, omsetning: 105, driftsresultat: 10, aarsresultat: 8, totalkapital: 118, egenkapital: 49, inntektskilder: { spillerinntekter: 28, billettinntekter: 16, sponsorinntekter: 32, tvPenger: 22, andreInntekter: 7 } },
    ],
  },
  {
    id: "sandefjord",
    navn: "Sandefjord Fotball",
    by: "Sandefjord",
    grunnlagt: 1998,
    stadion: "Komplett.no Arena",
    stadionKapasitet: 7000,
    farger: "Blå/Hvit",
    liga: "Eliteserien",
    titler: 0,
    beskrivelse: "En av de yngre klubbene i Eliteserien. Godt støttet av lokalt næringsliv i Vestfold.",
    finansdata: [
      { year: 2020, omsetning: 38, driftsresultat: -3, aarsresultat: -4, totalkapital: 48, egenkapital: 12, inntektskilder: { spillerinntekter: 5, billettinntekter: 6, sponsorinntekter: 15, tvPenger: 8, andreInntekter: 4 } },
      { year: 2021, omsetning: 45, driftsresultat: 2, aarsresultat: 1, totalkapital: 55, egenkapital: 15, inntektskilder: { spillerinntekter: 8, billettinntekter: 8, sponsorinntekter: 17, tvPenger: 8, andreInntekter: 4 } },
      { year: 2022, omsetning: 55, driftsresultat: 4, aarsresultat: 3, totalkapital: 65, egenkapital: 18, inntektskilder: { spillerinntekter: 10, billettinntekter: 10, sponsorinntekter: 20, tvPenger: 10, andreInntekter: 5 } },
      { year: 2023, omsetning: 62, driftsresultat: 5, aarsresultat: 4, totalkapital: 72, egenkapital: 22, inntektskilder: { spillerinntekter: 12, billettinntekter: 11, sponsorinntekter: 22, tvPenger: 12, andreInntekter: 5 } },
    ],
  },
  {
    id: "aalesund",
    navn: "Aalesund FK",
    by: "Ålesund",
    grunnlagt: 1914,
    stadion: "Color Line Stadion",
    stadionKapasitet: 10778,
    farger: "Oransje/Hvit",
    liga: "Eliteserien",
    titler: 0,
    beskrivelse: "Møre-og-Romsdals stolthet. Kjent for en lojal supporterbase og mange år i Eliteserien.",
    finansdata: [
      { year: 2020, omsetning: 55, driftsresultat: -5, aarsresultat: -7, totalkapital: 68, egenkapital: 18, inntektskilder: { spillerinntekter: 8, billettinntekter: 9, sponsorinntekter: 18, tvPenger: 15, andreInntekter: 5 } },
      { year: 2021, omsetning: 65, driftsresultat: 3, aarsresultat: 2, totalkapital: 75, egenkapital: 22, inntektskilder: { spillerinntekter: 12, billettinntekter: 11, sponsorinntekter: 20, tvPenger: 15, andreInntekter: 7 } },
      { year: 2022, omsetning: 78, driftsresultat: 6, aarsresultat: 5, totalkapital: 88, egenkapital: 27, inntektskilder: { spillerinntekter: 18, billettinntekter: 13, sponsorinntekter: 22, tvPenger: 18, andreInntekter: 7 } },
      { year: 2023, omsetning: 88, driftsresultat: 8, aarsresultat: 6, totalkapital: 98, egenkapital: 33, inntektskilder: { spillerinntekter: 22, billettinntekter: 15, sponsorinntekter: 26, tvPenger: 18, andreInntekter: 7 } },
    ],
  },
];

export function getClubById(id: string): Club | undefined {
  return clubs.find((c) => c.id === id);
}

export function getLatestFinancials(club: Club): ClubFinancials {
  return club.finansdata[club.finansdata.length - 1];
}

export function formatMNOK(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)} mrd`;
  }
  return `${value} MNOK`;
}
