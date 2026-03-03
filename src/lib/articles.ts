export interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  sport: string;
  readTime: string;
  publishedAt: string;
  author: string;
  type: "article" | "video" | "podcast";
  premium: boolean;
  keyPoints: string[];
  body: string;
  image?: string;
}

// Generate a deterministic gradient thumbnail based on article id and category
export function getArticleImage(id: string, category: string): string {
  // Return a CSS gradient string used as background
  const gradients: Record<string, string> = {
    "Medierettigheter": "linear-gradient(135deg, hsl(220, 70%, 50%), hsl(260, 60%, 40%))",
    "Media Rights": "linear-gradient(135deg, hsl(220, 70%, 50%), hsl(260, 60%, 40%))",
    "Transaksjoner": "linear-gradient(135deg, hsl(150, 60%, 40%), hsl(180, 50%, 35%))",
    "Transactions": "linear-gradient(135deg, hsl(150, 60%, 40%), hsl(180, 50%, 35%))",
    "Analyser": "linear-gradient(135deg, hsl(25, 80%, 50%), hsl(45, 70%, 45%))",
    "Analysis": "linear-gradient(135deg, hsl(25, 80%, 50%), hsl(45, 70%, 45%))",
    "Ligaer": "linear-gradient(135deg, hsl(0, 65%, 50%), hsl(340, 60%, 40%))",
    "Leagues": "linear-gradient(135deg, hsl(0, 65%, 50%), hsl(340, 60%, 40%))",
    "Sponsorater": "linear-gradient(135deg, hsl(280, 60%, 50%), hsl(310, 50%, 40%))",
    "Sponsorship": "linear-gradient(135deg, hsl(280, 60%, 50%), hsl(310, 50%, 40%))",
    "Verdivurderinger": "linear-gradient(135deg, hsl(200, 70%, 45%), hsl(220, 60%, 35%))",
    "Valuations": "linear-gradient(135deg, hsl(200, 70%, 45%), hsl(220, 60%, 35%))",
  };
  return gradients[category] || "linear-gradient(135deg, hsl(30, 70%, 50%), hsl(20, 60%, 40%))";
}

export const articlesNo: Article[] = [
  {
    id: "1",
    title: "Eliteserien TV-avtale: Viaplay og NRK forhandler om ny milliardpakke fra 2026",
    excerpt: "Rettighetene til Eliteserien er verdt anslagsvis 500–700 millioner kroner årlig. Viaplay møter sterk konkurranse fra Discovery og en overraskende NRK-offensiv.",
    category: "Medierettigheter",
    sport: "Fotball",
    readTime: "6 min lesing",
    publishedAt: "2 timer siden",
    author: "Kristoffer Haugen",
    type: "article",
    premium: false,
    keyPoints: [
      "Viaplay og NRK er de fremste kandidatene for ny Eliteserien-avtale fra 2026",
      "Rettighetene estimeres til 500–700 millioner kroner årlig – opp fra dagens nivå",
      "Discovery+ og en ny strømmeallianase er mørke hester i budrunden"
    ],
    body: `Kampen om Eliteserien-rettighetene begynner å ta form. Gjeldende avtale med Viaplay og NRK løper ut etter 2025-sesongen, og forhandlingene om neste periode er allerede i gang bak lukkede dører.

Norges Fotballforbund (NFF) og Norsk Toppfotball (NTF) har engasjert mediebyrået Wasserman Media Group som rådgiver i prosessen. Målet er å maksimere inntektene fra en ny pakke som anslås å være verdt 500–700 millioner kroner per år.

Viaplay, som har slitt med nedgangen i abonnenter de siste to årene, er tydelig på at Eliteserien er et kjerneprodukt. Selskapet har signalisert vilje til å strekke seg langt for å beholde rettighetene.

"Norsk fotball er ryggraden i vår sportsportefølje i Norden," uttalte Viaplays norske direktør i et intervju med Kampanje denne uken.

NRK, på sin side, er under press fra politisk hold for å sikre gratis tilgang til norsk toppfotball. En NRK-offensiv for minst én kamp per runde gratis er ventet i den endelige pakken, uavhengig av hvem som vinner hoverettighetene.

Analytikere mener en samlet pakke kan lande på mellom 550 og 650 millioner kroner per år – en betydelig økning fra dagens anslåtte 400 millioner. Det ville gi Eliteserien-klubbene en kollektiv inntektsøkning på over 100 millioner kroner årlig.`
  },
  {
    id: "2",
    title: "Bodø/Glimt-salg slår rekord: Klubben hentet 195 MNOK på spillersalg i 2023",
    excerpt: "Gultrøyene fra nord er Norges ubestridte eksportmaskin. Vi går gjennom hvem som ble solgt, til hvilke klubber og hva det betyr for egenkapitalen.",
    category: "Transaksjoner",
    sport: "Fotball",
    readTime: "5 min lesing",
    publishedAt: "4 timer siden",
    author: "Marte Solberg",
    type: "article",
    premium: false,
    keyPoints: [
      "Bodø/Glimt genererte 195 MNOK i spillersalgsinntekter i 2023 – ny klubbrekord",
      "Tre spillere solgt til Serie A og Premier League-klubber",
      "Egenkapitalen har økt med over 300% siden 2019"
    ],
    body: `Bodø/Glimt skriver norsk fotballhistorie – ikke bare på banen, men i regnskapene. Med 195 millioner kroner i spillersalgsinntekter i 2023 satte den nordnorske klubben en ny nasjonal rekord.

Salget av Jens Petter Hauge til Genoa (40 MNOK), Ola Solbakken til Roma (18 MNOK) og ytterligere transaksjoner til Premier League-klubber utgjorde hoveddelen av inntektene. I tillegg kom salgsbonuser fra tidligere salg av Patrick Berg og Ulrik Saltnes.

Regnskapet for 2023 viser en total omsetning på 312 millioner kroner, opp fra 287 millioner i 2022. Driftsresultatet landet på solide 67 millioner kroner, og egenkapitalen passerte 200 millioner for første gang i klubbens historie.

"Vi har bygget en modell som er finansielt bærekraftig og fotballmessig ambisiøs," sier daglig leder Frode Thomassen i et intervju med Finansavisen.

Analysebyrået Football Benchmark rangerer nå Bodø/Glimt blant de ti mest effektive spillerutviklingsklubbene i Europa, målt ved avkastning på akademiinvesteringer. Det er et bemerkelsesverdig bragd for en klubb fra en by med 52 000 innbyggere nord for polarsirkelen.`
  },
  {
    id: "3",
    title: "Dokumentar: Rosenborgs fall og forsøket på å bygge seg opp igjen",
    excerpt: "Fra 26 seriemesterskap og Champions League til en omsetning som halveres. Vi ser nærmere på hva som gikk galt — og hva som er gjort for å snu trenden.",
    category: "Analyser",
    sport: "Fotball",
    readTime: "24 min video",
    publishedAt: "6 timer siden",
    author: "Dokumentarteamet",
    type: "video",
    premium: true,
    keyPoints: [
      "Rosenborgs omsetning falt fra 350 MNOK i 2019 til under 180 MNOK i 2022",
      "Klubben mistet Champions League-inntektene og solgte nøkkelspillere",
      "En ny sportslig og kommersiell strategi er iverksatt fra 2023"
    ],
    body: `Historien om Rosenborg BK de siste fem årene er historien om en stolt institusjon som møtte veggen. Fra å være Norges dominerende lag gjennom tre tiår, opplevde trønderne en dramatisk nedtur – både sportslig og økonomisk.

Omsetningen falt fra 350 millioner kroner i 2019 til 178 millioner i 2022. Bortfallet av Champions League-inntekter, kombinert med covid-19 og kostbare satsinger på dyre spillere som ikke fungerte, skapte en perfekt storm av utfordringer.

Denne dokumentaren følger klubbens forsøk på å reise seg. Vi snakker med tidligere og nåværende spillere, ledere og fotballanalytikere om hva som gikk galt, og hva som nå gjøres for å gjenreise RBK som Norges fremste fotballklubb.`
  },
  {
    id: "4",
    title: "Norsk toppfotball samlet: 2,1 milliarder i omsetning — men bare halvparten er lønnsomme",
    excerpt: "En gjennomgang av regnskapene til alle 16 Eliteserien-klubber avslører store forskjeller i lønnsomhet, gjeldsgrad og fremtidsutsikter.",
    category: "Analyser",
    sport: "Fotball",
    readTime: "8 min lesing",
    publishedAt: "8 timer siden",
    author: "Sindre Bakke",
    type: "article",
    premium: false,
    keyPoints: [
      "Eliteserien-klubbene omsatte samlet for 2,1 milliarder kroner i 2023",
      "Bare 8 av 16 klubber gikk med overskudd",
      "Bodø/Glimt og Molde er de mest lønnsomme, Stabæk og HamKam sliter mest"
    ],
    body: `En systematisk gjennomgang av regnskapene til alle 16 Eliteserien-klubber maler et nyansert bilde av norsk toppfotballs økonomi. Den gode nyheten: total omsetning passerte 2,1 milliarder kroner for første gang. Den mindre gode: lønnsomheten er svært ujevnt fordelt.

Bodø/Glimt og Molde FK skiller seg ut med driftsresultater på henholdsvis 67 og 41 millioner kroner. Begge klubber kombinerer sterk akademimodell med god kostnadsstyring.

I den andre enden av skalaen finner vi Stabæk IF og HamKam, som begge rapporterte negative driftsresultater på over 15 millioner kroner. Disse klubbene sliter med å balansere ambisjoner mot de kommersielle realitetene i et marked dominert av Bodø/Glimt og Rosenborg.

Lønnskostnadene som andel av omsetning varierer fra 48% (Bodø/Glimt) til over 80% (Stabæk). Europeisk beste praksis tilsier maks 60-65%, noe bare fem norske klubber oppnår.`
  },
  {
    id: "5",
    title: "Ukens transfers: Norske spillere til og fra Eliteserien",
    excerpt: "En komplett oversikt over ukens inn- og utleieaktivitet, kjøpesum, kontraktslengder og hvilke agenter som er involvert.",
    category: "Transaksjoner",
    sport: "Fotball",
    readTime: "15 min lesing",
    publishedAt: "10 timer siden",
    author: "Transferteamet",
    type: "podcast",
    premium: true,
    keyPoints: [
      "Tre norske spillere er på vei til utenlandske klubber denne uken",
      "Agenten Rune Hauge er involvert i to av de største transaksjonene",
      "Molde avviste et bud på 25 MNOK for sin toppscorer"
    ],
    body: `I denne ukens transferoppdatering gjennomgår vi alle bekreftede og nært forestående spillerbevegelser i og rundt Eliteserien. Fra sommerens tidlige aktivitet til utlånsavtaler som er på plass frem mot overgangsvinduets slutt.

Vi ser nærmere på agentbildet bak de største avtalene, og analyserer hva de ulike kjøpesummene sier om prisutviklingen for norsk-utviklete spillere internasjonalt.`
  },
  {
    id: "6",
    title: "Viking FK får ny storaksjonsær — Stavanger-investorer skyter inn 80 MNOK",
    excerpt: "En gruppe regionale investorer med tilknytning til oljeindustrien tar en betydelig eierandel i Viking FK. Hva betyr det for klubbens ambisjoner?",
    category: "Transaksjoner",
    sport: "Fotball",
    readTime: "5 min lesing",
    publishedAt: "12 timer siden",
    author: "Eirik Johnsen",
    type: "article",
    premium: false,
    keyPoints: [
      "Ny investorgruppe skyter inn 80 MNOK i Viking FK",
      "Investeringen gir dem 22% eierandel i klubben",
      "Midlene øremerkes spilleranskaffelser og akademiutbygging"
    ],
    body: `En gruppe Stavanger-baserte investorer med bakgrunn fra olje- og gassindustrien har inngått en avtale om å investere 80 millioner kroner i Viking FK. Transaksjonen gir investorgruppen en eierandel på 22% i klubben og representerer den største private kapitalinjeksjonen i klubbens nyere historie.

Daglig leder i Viking FK, Eirik Stephansen, sier midlene vil gå direkte til å styrke sportslig kapasitet.

"Dette gir oss muligheten til å hente inn to-tre spillere vi ellers ikke ville hatt råd til, og til å investere langsiktig i akademiet," sier Stephansen.

Transaksjonen speiler en bredere trend der regionale næringslivsprofiler ser på norske fotballklubber som attraktive investeringsobjekter – både kommersielt og som del av et lokal-identitetsprosjekt.`
  }
];

export const articlesEn: Article[] = [
  {
    id: "1",
    title: "Eliteserien TV Deal: Viaplay and NRK Negotiate New Billion-Kroner Package from 2026",
    excerpt: "The rights to Eliteserien are estimated at NOK 500–700 million annually. Viaplay faces stiff competition from Discovery and a surprising NRK offensive.",
    category: "Media Rights",
    sport: "Football",
    readTime: "6 min read",
    publishedAt: "2 hours ago",
    author: "Kristoffer Haugen",
    type: "article",
    premium: false,
    keyPoints: [
      "Viaplay and NRK are the leading candidates for the new Eliteserien deal from 2026",
      "Rights estimated at NOK 500–700 million annually — up from current levels",
      "Discovery+ and a new streaming alliance are dark horses in the bidding"
    ],
    body: `The battle for Eliteserien broadcasting rights is taking shape. The current deal with Viaplay and NRK expires after the 2025 season, and negotiations for the next period are already underway behind closed doors.

The Norwegian Football Federation (NFF) and Norwegian Top Football (NTF) have engaged Wasserman Media Group as an advisor. The goal is to maximise revenue from a new package estimated to be worth NOK 500–700 million per year.

Viaplay, which has struggled with declining subscribers over the past two years, is clear that Eliteserien is a core product. The company has signalled willingness to stretch significantly to retain the rights.

"Norwegian football is the backbone of our sports portfolio in the Nordics," said Viaplay's Norwegian director in an interview with Kampanje this week.

NRK, meanwhile, is under political pressure to secure free access to Norwegian top football. An NRK push for at least one free match per round is expected in the final package, regardless of who wins the main rights.

Analysts believe a combined package could land between NOK 550 and 650 million per year — a significant increase from the estimated NOK 400 million today. This would give Eliteserien clubs a collective revenue increase of over NOK 100 million annually.`
  },
  {
    id: "2",
    title: "Bodø/Glimt Player Sales Break Records: Club Generated 195 MNOK in 2023",
    excerpt: "The yellow-and-black club from the north is Norway's undisputed export machine. We break down who was sold, to which clubs, and what it means for equity.",
    category: "Transactions",
    sport: "Football",
    readTime: "5 min read",
    publishedAt: "4 hours ago",
    author: "Marte Solberg",
    type: "article",
    premium: false,
    keyPoints: [
      "Bodø/Glimt generated NOK 195 million in player sales in 2023 — a new club record",
      "Three players sold to Serie A and Premier League clubs",
      "Equity has increased by over 300% since 2019"
    ],
    body: `Bodø/Glimt is writing Norwegian football history — not only on the pitch, but in the accounts. With NOK 195 million in player sale revenues in 2023, the northern Norwegian club set a new national record.

The sales of Jens Petter Hauge to Genoa (NOK 40m), Ola Solbakken to Roma (NOK 18m), and further transactions to Premier League clubs made up the bulk of revenues. Add-on fees from earlier sales of Patrick Berg and Ulrik Saltnes also contributed.

The 2023 accounts show total revenue of NOK 312 million, up from NOK 287 million in 2022. Operating profit landed at a solid NOK 67 million, and equity passed NOK 200 million for the first time in the club's history.

"We have built a model that is financially sustainable and footballing ambitious," says CEO Frode Thomassen in an interview with Finansavisen.

Analytics firm Football Benchmark now ranks Bodø/Glimt among the ten most efficient player development clubs in Europe, measured by return on academy investment. A remarkable achievement for a club from a city of 52,000 north of the Arctic Circle.`
  },
  {
    id: "3",
    title: "Documentary: Rosenborg's Decline and the Effort to Rebuild",
    excerpt: "From 26 league titles and Champions League nights to halved revenues. We examine what went wrong — and what has been done to reverse the trend.",
    category: "Analysis",
    sport: "Football",
    readTime: "24 min watch",
    publishedAt: "6 hours ago",
    author: "Documentary Team",
    type: "video",
    premium: true,
    keyPoints: [
      "Rosenborg's revenue fell from NOK 350m in 2019 to under NOK 180m in 2022",
      "The club lost Champions League revenues and sold key players",
      "A new sporting and commercial strategy has been implemented from 2023"
    ],
    body: `The story of Rosenborg BK over the past five years is the story of a proud institution that hit a wall. From being Norway's dominant club for three decades, the Trondheim side experienced a dramatic downturn — both on and off the pitch.

Revenue fell from NOK 350 million in 2019 to NOK 178 million in 2022. The loss of Champions League income, combined with the covid-19 pandemic and costly signings that didn't work out, created a perfect storm of challenges.

This documentary follows the club's attempt to recover. We speak with former and current players, executives, and football analysts about what went wrong and what is now being done to restore RBK as Norway's leading football club.`
  },
  {
    id: "4",
    title: "Norwegian Top Football Combined: NOK 2.1 Billion Revenue — But Only Half Are Profitable",
    excerpt: "A review of all 16 Eliteserien clubs' accounts reveals large differences in profitability, debt levels and future prospects.",
    category: "Analysis",
    sport: "Football",
    readTime: "8 min read",
    publishedAt: "8 hours ago",
    author: "Sindre Bakke",
    type: "article",
    premium: false,
    keyPoints: [
      "Eliteserien clubs generated a combined NOK 2.1 billion in revenue in 2023",
      "Only 8 of 16 clubs turned a profit",
      "Bodø/Glimt and Molde are the most profitable; Stabæk and HamKam struggle most"
    ],
    body: `A systematic review of the accounts of all 16 Eliteserien clubs paints a nuanced picture of Norwegian top football's finances. The good news: total revenue passed NOK 2.1 billion for the first time. The less good: profitability is very unevenly distributed.

Bodø/Glimt and Molde FK stand out with operating results of NOK 67 million and NOK 41 million respectively. Both clubs combine a strong academy model with good cost management.

At the other end of the scale, Stabæk IF and HamKam both reported negative operating results of over NOK 15 million. These clubs struggle to balance ambitions against the commercial realities of a market dominated by Bodø/Glimt and Rosenborg.

Wage costs as a share of revenue vary from 48% (Bodø/Glimt) to over 80% (Stabæk). European best practice suggests a maximum of 60–65%, which only five Norwegian clubs achieve.`
  },
  {
    id: "5",
    title: "Week in Transfers: Norwegian Players In and Out of Eliteserien",
    excerpt: "A complete overview of this week's loan and transfer activity, fees, contract lengths and the agents involved.",
    category: "Transactions",
    sport: "Football",
    readTime: "15 min listen",
    publishedAt: "10 hours ago",
    author: "Transfer Team",
    type: "podcast",
    premium: true,
    keyPoints: [
      "Three Norwegian players heading to foreign clubs this week",
      "Agent Rune Hauge is involved in two of the biggest transactions",
      "Molde rejected a NOK 25m bid for their top scorer"
    ],
    body: `In this week's transfer update, we cover all confirmed and imminent player movements in and around Eliteserien. From early summer activity to loan deals in place ahead of the window's close.

We look closely at the agent landscape behind the biggest deals and analyse what the various fees tell us about the price trend for Norwegian-developed players internationally.`
  },
  {
    id: "6",
    title: "Viking FK Gets New Major Shareholder — Stavanger Investors Inject NOK 80 Million",
    excerpt: "A group of regional investors with ties to the oil industry take a significant stake in Viking FK. What does it mean for the club's ambitions?",
    category: "Transactions",
    sport: "Football",
    readTime: "5 min read",
    publishedAt: "12 hours ago",
    author: "Eirik Johnsen",
    type: "article",
    premium: false,
    keyPoints: [
      "New investor group injects NOK 80 million into Viking FK",
      "The investment gives them a 22% stake in the club",
      "Funds earmarked for player acquisitions and academy development"
    ],
    body: `A group of Stavanger-based investors with backgrounds in the oil and gas industry have agreed to invest NOK 80 million in Viking FK. The transaction gives the investor group a 22% stake in the club and represents the largest private capital injection in the club's recent history.

Viking FK CEO Eirik Stephansen says the funds will go directly to strengthening sporting capacity.

"This gives us the opportunity to bring in two or three players we otherwise wouldn't have been able to afford, and to invest long-term in the academy," says Stephansen.

The transaction mirrors a broader trend of regional business figures viewing Norwegian football clubs as attractive investment targets — both commercially and as a local identity project.`
  }
];

export const getArticles = (language: "no" | "en"): Article[] => {
  return language === "no" ? articlesNo : articlesEn;
};

export const getArticleById = (id: string, language: "no" | "en"): Article | undefined => {
  const articles = getArticles(language);
  return articles.find(article => article.id === id);
};
