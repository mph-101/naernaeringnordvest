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
}

export const articlesNo: Article[] = [
  {
    id: "1",
    title: "NFL Medierettigheter: Amazon og Apple posisjonerer seg for 3 milliarder dollar Sunday Ticket-pakke",
    excerpt: "Teknologigigantene forbereder konkurrerende bud mens ligaen søker en betydelig premie over gjeldende avtale med Google.",
    category: "Medierettigheter",
    sport: "Amerikansk fotball",
    readTime: "6 min lesing",
    publishedAt: "2 timer siden",
    author: "Michael Chen",
    type: "article",
    premium: false,
    keyPoints: [
      "Amazon og Apple forbereder bud på over 3 milliarder dollar for NFL Sunday Ticket-rettighetene",
      "NFL forventer en premie på 40-50% sammenlignet med gjeldende Google-avtale",
      "Avtalen kan omforme hvordan amerikanske seere konsumerer profesjonell fotball"
    ],
    body: `NFL står ved et kritisk veiskille i sin mediestrategi. Med den nåværende Sunday Ticket-avtalen med Google som utløper etter 2025-sesongen, har ligaen startet samtaler med teknologigigantene Amazon og Apple om en ny avtale verdt over 3 milliarder dollar årlig.

Kilder nær forhandlingene forteller at begge selskaper ser på rettighetene som en strategisk mulighet til å styrke sine strømmetjenester. Amazon, som allerede har Thursday Night Football, ønsker å utvide sitt fotballtilbud, mens Apple ser dette som en mulighet til å etablere seg sterkere i sportsverdenen.

"Dette handler ikke bare om sport lenger," sier en analytiker hos Goldman Sachs. "Det handler om å kontrollere fremtidens underholdningsøkosystem."

NFL-kommissær Roger Goodell har signalisert at ligaen er åpen for innovative løsninger, inkludert delte rettigheter mellom flere plattformer. Dette kan bety at vi ser en fragmentering av hvordan fans konsumerer NFL-innhold i fremtiden.

Markedseksperter forventer at den endelige avtalen vil sette nye rekorder for sports-medierettigheter, med implikasjoner for hele bransjen.`
  },
  {
    id: "2",
    title: "Chelsea FC-verdivurdering når £4,2 milliarder etter stadionutvikling godkjent",
    excerpt: "Boehly-Clearlake-eierskapet har sikret plantillatelse for Stamford Bridge-utvidelse, noe som øker franchiseverdien betydelig.",
    category: "Verdivurderinger",
    sport: "Fotball",
    readTime: "5 min lesing",
    publishedAt: "4 timer siden",
    author: "Sarah Williams",
    type: "article",
    premium: true,
    keyPoints: [
      "Stamford Bridge-utvidelsen vil øke kapasiteten til 60 000 seter",
      "Prosjektet estimeres til £1,5 milliarder og fullføres innen 2030",
      "Klubbens totale verdivurdering har økt med 35% siden Boehly-oppkjøpet"
    ],
    body: `Chelsea FC har mottatt grønt lys fra Hammersmith & Fulham Council for sitt ambisiøse stadionutbyggingsprosjekt. Planene inkluderer en total renovering av Stamford Bridge som vil øke kapasiteten fra dagens 40 341 til over 60 000 seter.

Prosjektet, estimert til £1,5 milliarder, representerer en av de største stadioninvesteringene i europeisk fotballhistorie. Eierne Clearlake Capital og Todd Boehly har sikret finansiering gjennom en kombinasjon av egenkapital og langsiktig gjeld.

Verdivurderingseksperter hos Deloitte anslår at den utvidede stadionkapasiteten alene vil generere ytterligere £50-70 millioner årlig i matchday-inntekter. I tillegg kommer økte kommersielle muligheter gjennom premium-seter og hospitality-tjenester.

"Denne utviklingen posisjonerer Chelsea som en av de mest verdifulle klubbene i verden," sier en analytiker hos KPMG Sports Advisory.`
  },
  {
    id: "3",
    title: "Dokumentar: Innsiden av NBAs milliard-ekspansjonsstrategi i Afrika",
    excerpt: "Et eksklusivt innblikk i hvordan Basketball Africa League bygger infrastruktur og utvikler talent over hele kontinentet.",
    category: "Ligaer",
    sport: "Basketball",
    readTime: "28 min video",
    publishedAt: "6 timer siden",
    author: "Dokumentarteamet",
    type: "video",
    premium: true,
    keyPoints: [
      "NBA har investert over 100 millioner dollar i afrikansk basketballinfrastruktur",
      "Basketball Africa League har etablert akademier i 12 land",
      "Målet er å utvikle 50 NBA-klare spillere innen 2030"
    ],
    body: `Denne dokumentaren tar deg med bak kulissene i NBAs ambisiøse Afrika-satsing. Fra treningsanleggene i Senegal til talentjakten i Nigeria, får du et unikt innblikk i hvordan verdens største basketballiga bygger sitt neste store marked.

Kommissær Adam Silver har uttalt at Afrika representerer "basketballens største uoppdagede territorium." Med en ung og raskt voksende befolkning ser NBA kontinentet som nøkkelen til fremtidig vekst.

Dokumentaren følger unge spillere gjennom BAL-systemet, og viser både triumfer og utfordringer på veien mot den ultimate drømmen: en plass i NBA.`
  },
  {
    id: "4",
    title: "Private Equity i sport: Q4-transaksjonsvolum overstiger 8 milliarder dollar",
    excerpt: "Blackstone, Silver Lake og Sixth Street leder et rekordkvartal for minoritetsinvesteringer på tvers av store profesjonelle ligaer.",
    category: "Transaksjoner",
    sport: "Flereidrett",
    readTime: "8 min lesing",
    publishedAt: "8 timer siden",
    author: "James Morrison",
    type: "article",
    premium: false,
    keyPoints: [
      "Q4 2024 satte rekord med over 8 milliarder dollar i sports-PE-transaksjoner",
      "NBA og NHL tillater nå inntil 30% private equity-eierskap i lag",
      "Gjennomsnittlig avkastning for sports-PE har overgått S&P 500 de siste 10 årene"
    ],
    body: `Fjerde kvartal 2024 markerte et vannskille for private equity i sportsbransjen. Med transaksjoner verdt over 8 milliarder dollar, har institusjonelle investorer etablert seg som en dominerende kraft i eierskap av profesjonelle idrettslag.

Blackstone ledet an med sin 2 milliarder dollar investering i en NBA-franchise, mens Silver Lake og Sixth Street også gjorde betydelige bevegelser. Regelendringer i både NBA og NHL har åpnet døren for større PE-eierskap, og investorene har svart med aggressiv kapitalallokering.

"Sport er den siste store aktivaklassen som har vært utilgjengelig for institusjonelle investorer," sier en partner hos CVC Capital. "Nå endrer det seg raskt."

Analyser fra PitchBook viser at sports-investeringer har levert en gjennomsnittlig årlig avkastning på 15,2% det siste tiåret, sammenlignet med 10,8% for S&P 500. Denne meravkastningen, kombinert med lav korrelasjon til tradisjonelle aktivaklasser, gjør sport til en attraktiv diversifiseringsmulighet.

Eksperter forventer at trenden vil akselerere i 2025, med flere ligaer som vurderer å lempe på eierskapsrestriksjonene.`
  },
  {
    id: "5",
    title: "Ukentlig transaksjonsoppdatering: M&A-aktivitet",
    excerpt: "En omfattende gjennomgang av ukens fusjons- og oppkjøpsaktivitet, inkludert vilkår, verdivurderinger og muligheter.",
    category: "Transaksjoner",
    sport: "Flereidrett",
    readTime: "22 min lytting",
    publishedAt: "10 timer siden",
    author: "Deal Sheet-teamet",
    type: "podcast",
    premium: true,
    keyPoints: [
      "Fem store transaksjoner annonsert denne uken med samlet verdi på 3,2 milliarder dollar",
      "Europeisk fotball dominerer M&A-aktiviteten med tre klubbsalg",
      "Asiatiske investorer viser økende interesse for vestlige sportseiendommer"
    ],
    body: `I denne ukens episode gjennomgår vi de viktigste transaksjonene i sportsbransjen. Fra klubbsalg i Serie A til nye sponsoravtaler i Formel 1, dekker vi alt du trenger å vite.

Vertene diskuterer også de underliggende trendene som driver dagens M&A-marked, inkludert den økende betydningen av medierettigheter og digitale inntektsstrømmer.`
  },
  {
    id: "6",
    title: "Saudi PIF i avanserte forhandlinger om Formel 1-konstruktørandel",
    excerpt: "Kongerikets suverene formuesfond forhandler om en betydelig minoritetsposisjon i et ledende F1-team.",
    category: "Transaksjoner",
    sport: "Motorsport",
    readTime: "5 min lesing",
    publishedAt: "12 timer siden",
    author: "Alexandra Reid",
    type: "article",
    premium: true,
    keyPoints: [
      "PIF søker en 20-30% eierandel i et topp-5 F1-team",
      "Avtalen kan verdsette teamet til over 4 milliarder dollar",
      "Investeringen er del av Saudi-Arabias Vision 2030-strategi"
    ],
    body: `Saudi-Arabias Public Investment Fund (PIF) er i avanserte forhandlinger om å kjøpe en betydelig minoritetsandel i et av Formel 1s ledende team. Kilder nær forhandlingene bekrefter at diskusjonene har nådd et avansert stadium.

PIF, som forvalter over 700 milliarder dollar, har allerede betydelige sportsinvesteringer gjennom Newcastle United, LIV Golf og kommende arrangementer som Formel 1 Saudi Arabian Grand Prix.

En avtale vil markere det suverene formuesfondets første direkte investering i et F1-team, og signaliserer en dypere forpliktelse til motorsport som del av Vision 2030-strategien.`
  }
];

export const articlesEn: Article[] = [
  {
    id: "1",
    title: "NFL Media Rights Renewal: Amazon and Apple Positioning for $3B Sunday Ticket Package",
    excerpt: "Technology giants are preparing competing bids as the league seeks a significant premium over the current agreement with Google.",
    category: "Media Rights",
    sport: "American Football",
    readTime: "6 min read",
    publishedAt: "2 hours ago",
    author: "Michael Chen",
    type: "article",
    premium: false,
    keyPoints: [
      "Amazon and Apple are preparing bids exceeding $3 billion for NFL Sunday Ticket rights",
      "NFL expects a 40-50% premium compared to the current Google deal",
      "The deal could reshape how American viewers consume professional football"
    ],
    body: `The NFL stands at a critical crossroads in its media strategy. With the current Sunday Ticket deal with Google expiring after the 2025 season, the league has initiated conversations with tech giants Amazon and Apple about a new agreement worth over $3 billion annually.

Sources close to the negotiations say both companies view the rights as a strategic opportunity to strengthen their streaming services. Amazon, which already has Thursday Night Football, wants to expand its football offerings, while Apple sees this as a chance to establish a stronger presence in the sports world.

"This is no longer just about sports," says a Goldman Sachs analyst. "It's about controlling the future entertainment ecosystem."

NFL Commissioner Roger Goodell has signaled that the league is open to innovative solutions, including shared rights between multiple platforms. This could mean we see a fragmentation of how fans consume NFL content in the future.

Market experts expect the final deal to set new records for sports media rights, with implications for the entire industry.`
  },
  {
    id: "2",
    title: "Chelsea FC Valuation Reaches £4.2B Following Stadium Development Approval",
    excerpt: "The Boehly-Clearlake ownership group has secured planning consent for Stamford Bridge expansion, significantly enhancing franchise value.",
    category: "Valuations",
    sport: "Football",
    readTime: "5 min read",
    publishedAt: "4 hours ago",
    author: "Sarah Williams",
    type: "article",
    premium: true,
    keyPoints: [
      "Stamford Bridge expansion will increase capacity to 60,000 seats",
      "The project is estimated at £1.5 billion and will be completed by 2030",
      "The club's total valuation has increased 35% since the Boehly acquisition"
    ],
    body: `Chelsea FC has received the green light from Hammersmith & Fulham Council for its ambitious stadium development project. The plans include a complete renovation of Stamford Bridge that will increase capacity from the current 40,341 to over 60,000 seats.

The project, estimated at £1.5 billion, represents one of the largest stadium investments in European football history. Owners Clearlake Capital and Todd Boehly have secured financing through a combination of equity and long-term debt.

Valuation experts at Deloitte estimate that the expanded stadium capacity alone will generate an additional £50-70 million annually in matchday revenue. This is in addition to increased commercial opportunities through premium seating and hospitality services.

"This development positions Chelsea as one of the most valuable clubs in the world," says an analyst at KPMG Sports Advisory.`
  },
  {
    id: "3",
    title: "Documentary: Inside the NBA's $1B Africa Expansion Strategy",
    excerpt: "An exclusive look at how the Basketball Africa League is building infrastructure and developing talent across the continent.",
    category: "Leagues",
    sport: "Basketball",
    readTime: "28 min watch",
    publishedAt: "6 hours ago",
    author: "Documentary Team",
    type: "video",
    premium: true,
    keyPoints: [
      "NBA has invested over $100 million in African basketball infrastructure",
      "Basketball Africa League has established academies in 12 countries",
      "The goal is to develop 50 NBA-ready players by 2030"
    ],
    body: `This documentary takes you behind the scenes of the NBA's ambitious African initiative. From training facilities in Senegal to talent scouting in Nigeria, you get a unique insight into how the world's largest basketball league is building its next major market.

Commissioner Adam Silver has stated that Africa represents "basketball's greatest undiscovered territory." With a young and rapidly growing population, the NBA sees the continent as key to future growth.

The documentary follows young players through the BAL system, showing both triumphs and challenges on the road to the ultimate dream: a spot in the NBA.`
  },
  {
    id: "4",
    title: "Private Equity in Sports: Q4 Transaction Volume Exceeds $8 Billion",
    excerpt: "Blackstone, Silver Lake, and Sixth Street lead a record quarter for minority stake investments across major professional leagues.",
    category: "Transactions",
    sport: "Multi-sport",
    readTime: "8 min read",
    publishedAt: "8 hours ago",
    author: "James Morrison",
    type: "article",
    premium: false,
    keyPoints: [
      "Q4 2024 set a record with over $8 billion in sports PE transactions",
      "NBA and NHL now allow up to 30% private equity ownership in teams",
      "Average returns for sports PE have outperformed the S&P 500 over the past 10 years"
    ],
    body: `The fourth quarter of 2024 marked a watershed moment for private equity in the sports industry. With transactions worth over $8 billion, institutional investors have established themselves as a dominant force in professional sports team ownership.

Blackstone led with its $2 billion investment in an NBA franchise, while Silver Lake and Sixth Street also made significant moves. Rule changes in both the NBA and NHL have opened the door to greater PE ownership, and investors have responded with aggressive capital allocation.

"Sports is the last major asset class that has been inaccessible to institutional investors," says a partner at CVC Capital. "Now that's changing rapidly."

Analysis from PitchBook shows that sports investments have delivered an average annual return of 15.2% over the past decade, compared to 10.8% for the S&P 500. This excess return, combined with low correlation to traditional asset classes, makes sports an attractive diversification opportunity.

Experts expect the trend to accelerate in 2025, with more leagues considering relaxing ownership restrictions.`
  },
  {
    id: "5",
    title: "The Deal Sheet: Weekly Transactions Briefing",
    excerpt: "A comprehensive review of this week's M&A activity, including terms, valuations, and emerging opportunities.",
    category: "Transactions",
    sport: "Multi-sport",
    readTime: "22 min listen",
    publishedAt: "10 hours ago",
    author: "Deal Sheet Team",
    type: "podcast",
    premium: true,
    keyPoints: [
      "Five major transactions announced this week with combined value of $3.2 billion",
      "European football dominates M&A activity with three club sales",
      "Asian investors showing increasing interest in Western sports properties"
    ],
    body: `In this week's episode, we review the most important transactions in the sports industry. From club sales in Serie A to new sponsorship deals in Formula 1, we cover everything you need to know.

The hosts also discuss the underlying trends driving today's M&A market, including the growing importance of media rights and digital revenue streams.`
  },
  {
    id: "6",
    title: "Saudi PIF Enters Advanced Talks for Formula One Constructorship Stake",
    excerpt: "The Kingdom's sovereign wealth fund is negotiating for a significant minority position in a leading F1 team.",
    category: "Transactions",
    sport: "Motorsport",
    readTime: "5 min read",
    publishedAt: "12 hours ago",
    author: "Alexandra Reid",
    type: "article",
    premium: true,
    keyPoints: [
      "PIF seeks a 20-30% stake in a top-5 F1 team",
      "The deal could value the team at over $4 billion",
      "The investment is part of Saudi Arabia's Vision 2030 strategy"
    ],
    body: `Saudi Arabia's Public Investment Fund (PIF) is in advanced negotiations to acquire a significant minority stake in one of Formula 1's leading teams. Sources close to the negotiations confirm that discussions have reached an advanced stage.

PIF, which manages over $700 billion, already has significant sports investments through Newcastle United, LIV Golf, and upcoming events such as the Formula 1 Saudi Arabian Grand Prix.

A deal would mark the sovereign wealth fund's first direct investment in an F1 team, signaling a deeper commitment to motorsport as part of the Vision 2030 strategy.`
  }
];

export const getArticles = (language: "no" | "en"): Article[] => {
  return language === "no" ? articlesNo : articlesEn;
};

export const getArticleById = (id: string, language: "no" | "en"): Article | undefined => {
  const articles = getArticles(language);
  return articles.find(article => article.id === id);
};
