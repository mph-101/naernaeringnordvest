// getArticleImage moved to its own module so feed components can use it
// without dragging this file's mock dataset into their chunk. Re-exported
// here so existing importers keep working.
export { getArticleImage } from "@/lib/article-image";

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

export const articlesNo: Article[] = [
  {
    id: "1",
    title: "Ny næringspark åpner i Ålesund: 200 arbeidsplasser og 500 MNOK i investeringer",
    excerpt: "Et konsortium av lokale investorer satser stort med en ny næringspark på Moa. Prosjektet er ventet å tiltrekke teknologibedrifter fra hele Vestlandet.",
    category: "Eiendom",
    sport: "Nordvestlandet",
    readTime: "6 min lesing",
    publishedAt: "2 timer siden",
    author: "Kristoffer Haugen",
    type: "article",
    premium: false,
    keyPoints: [
      "Næringsparken på Moa dekker 25 000 kvadratmeter og åpner i 2027",
      "Investorgruppen består av tre lokale eiendomsselskaper med 500 MNOK i samlet kapital",
      "Ålesund kommune har gitt tilsagn om redusert eiendomsskatt de første fem årene"
    ],
    body: `En ny næringspark i Ålesund tar form. Konsortiet bak prosjektet, som består av tre regionale eiendomsselskaper, har sikret finansiering på 500 millioner kroner for utviklingen av et 25 000 kvadratmeter stort næringsareal på Moa.

Prosjektet er designet for å tiltrekke seg teknologi- og innovasjonsbedrifter, med fleksible kontorløsninger, felles møterom og et dedikert gründersenter. Planen inkluderer også et laboratorium for marin teknologi, tilpasset regionens sterke maritim-klynge.

"Vi ser et enormt potensial i Ålesund som teknologiby. Med denne næringsparken ønsker vi å skape et miljø der bedrifter kan vokse sammen," sier prosjektleder Astrid Myklebust.

Ålesund kommune har signalisert støtte gjennom redusert eiendomsskatt de første fem årene, og det er allerede signert intensjonsavtaler med fire teknologibedrifter som ønsker å flytte inn ved åpning i 2027.`
  },
  {
    id: "2",
    title: "Lokal teknologibedrift vokser internasjonalt — tredobler omsetningen på to år",
    excerpt: "TechNord AS fra Tromsø har gått fra 30 til 120 ansatte og leverer nå til kunder i hele Norden. Vi ser på suksessoppskriften.",
    category: "Teknologi",
    sport: "Nord-Norge",
    readTime: "5 min lesing",
    publishedAt: "4 timer siden",
    author: "Marte Solberg",
    type: "article",
    premium: false,
    keyPoints: [
      "TechNord AS har tredoblet omsetningen fra 45 MNOK til 135 MNOK på to år",
      "Selskapet har gått fra 30 til 120 ansatte med hovedkontor i Tromsø",
      "Nordisk ekspansjon startet med et pilotprosjekt i Finland som ble en stor suksess"
    ],
    body: `TechNord AS fra Tromsø skriver nordnorsk næringshistorie. Det lille programvareselskapet som startet med tre gründere i 2019 har på rekordtid vokst til 120 ansatte og en omsetning på 135 millioner kroner.

Suksessoppskriften? En skybasert plattform for logistikkstyring i arktiske strøk, utviklet spesielt for utfordringene med vær, avstand og infrastruktur i nordlige regioner.

"Vi bygget noe ingen andre hadde — en løsning som faktisk forstår forholdene i nord," forklarer CEO Lena Kristiansen.

Gjennombruddet kom da finske transportselskaper oppdaget plattformen og signerte en storkontrakt verdt 40 MNOK årlig. Nå leverer TechNord til kunder i hele Norden, og en ekspansjon mot Island og Grønland er under planlegging.

Tromsø kommune har trukket frem TechNord som et eksempel på hvordan nordnorsk kompetanse kan bygge globalt konkurransedyktige selskaper.`
  },
  {
    id: "3",
    title: "Dokumentar: Havbruksnæringens fremtid på Vestlandet",
    excerpt: "Fra tradisjonelt fiske til teknologidrevet akvakultur. Vi utforsker hvordan vestlandsbedrifter innoverer for bærekraftig vekst.",
    category: "Industri",
    sport: "Vestlandet",
    readTime: "24 min video",
    publishedAt: "6 timer siden",
    author: "Dokumentarteamet",
    type: "video",
    premium: true,
    keyPoints: [
      "Vestlandets havbruksnæring omsetter for over 80 milliarder kroner årlig",
      "Nye landbaserte oppdrettsanlegg reduserer miljøpåvirkningen med opptil 70%",
      "Tre vestlandske selskaper leder utviklingen av autonom fôringsteknologi"
    ],
    body: `Vestlandet er hjertet av Norges havbruksnæring, med en samlet omsetning på over 80 milliarder kroner. Men næringen står ved et veiskille: strengere miljøkrav, fallende laksepriser og økende internasjonal konkurranse tvinger frem innovasjon.

Denne dokumentaren følger tre vestlandske selskaper som leder an i omstillingen. Fra landbaserte oppdrettsanlegg i Hardanger som reduserer miljøpåvirkningen med 70%, til autonome fôringssystemer utviklet i Bergen som bruker kunstig intelligens for å optimalisere fiskehelsen.

Vi besøker også Austevoll, der en ny generasjon fiskere kombinerer tradisjonell kunnskap med moderne teknologi for å skape bærekraftige arbeidsplasser i en bygd som ellers kunne ha dødd ut.`
  },
  {
    id: "4",
    title: "Handelsstanden i krise? Butikkdøden rammer små og mellomstore byer hardest",
    excerpt: "En gjennomgang av handelsdata viser at sentrumsbutikkene sliter mest i byer med under 50 000 innbyggere. Men det finnes lyspunkter.",
    category: "Handel",
    sport: "Midt-Norge",
    readTime: "8 min lesing",
    publishedAt: "8 timer siden",
    author: "Sindre Bakke",
    type: "article",
    premium: false,
    keyPoints: [
      "Sentrumshandelen i byer med under 50 000 innbyggere har falt med 23% siden 2019",
      "Steinkjer og Namsos er blant de hardest rammede i Trøndelag",
      "Lokale initiativer som «Handl lokalt»-kampanjen i Levanger viser lovende resultater"
    ],
    body: `Butikkdøden i norske småbyer er ikke bare et fenomen — det er en strukturell krise som truer sentrumslivet i byer over hele landet. Nye tall fra Virke viser at sentrumshandelen i byer med under 50 000 innbyggere har falt med 23% siden 2019.

I Trøndelag er Steinkjer og Namsos blant de hardest rammede. I Steinkjer har antall butikker i sentrum gått fra 87 i 2018 til 54 i dag. Hovedårsakene er netthandel, kjøpesentre utenfor sentrum og endret forbrukermønster etter pandemien.

Men det finnes lyspunkter. I Levanger har handelsstanden samlet seg om «Handl lokalt»-kampanjen, som kombinerer digitale lojalitetsprogram med lokale opplevelser. Resultatet: en økning i sentrumshandelen på 8% det siste året — mot den nasjonale trenden.

"Folk vil handle lokalt, men de trenger en grunn til å komme til sentrum," sier kampanjeleder Grete Hovde.`
  },
  {
    id: "5",
    title: "Ukens næringslivsnyheter: Hvem selger, kjøper og investerer i din region?",
    excerpt: "En komplett oversikt over ukens viktigste transaksjoner, nyetableringer og investeringer fra hele landet.",
    category: "Finans",
    sport: "Østlandet",
    readTime: "15 min lesing",
    publishedAt: "10 timer siden",
    author: "Redaksjonen",
    type: "podcast",
    premium: true,
    keyPoints: [
      "Tre store oppkjøp i Oslofjord-regionen denne uken — samlet verdi over 1,2 milliarder",
      "Drammen-basert logistikkselskap kjøpt opp av dansk konsern",
      "Rekordmange nyetableringer i Asker og Bærum i første kvartal"
    ],
    body: `Denne ukens næringslivsoppdatering dekker de viktigste transaksjonene og bevegelsene i regionalt næringsliv. Tre store oppkjøp i Oslofjord-regionen dominerer nyhetene, med en samlet transaksjonsverdi på over 1,2 milliarder kroner.

Det største er salget av Drammens Logistikk AS til det danske konsernet DSV Group, i en avtale verdt 680 millioner kroner. Selskapet har 340 ansatte og er en av de største aktørene innen tredjepartslogistikk i Sør-Norge.

I tillegg ser vi på rekordtallene for nyetableringer i Asker og Bærum, der 487 nye selskaper ble registrert i første kvartal — en økning på 34% fra samme periode i fjor.`
  },
  {
    id: "6",
    title: "Reiselivet satser: Ny hotellkjede investerer 80 MNOK i Lofoten",
    excerpt: "Arctic Hotels planlegger tre nye boutique-hoteller i Lofoten-regionen. Hva betyr det for det lokale næringslivet?",
    category: "Reiseliv",
    sport: "Nord-Norge",
    readTime: "5 min lesing",
    publishedAt: "12 timer siden",
    author: "Eirik Johnsen",
    type: "article",
    premium: false,
    keyPoints: [
      "Arctic Hotels investerer 80 MNOK i tre nye boutique-hoteller i Lofoten",
      "Prosjektet skaper 65 nye helårsarbeidsplasser i regionen",
      "Hotellet i Henningsvær åpner allerede til sommeren 2027"
    ],
    body: `Reiselivsbransjen i Lofoten får et betydelig løft. Arctic Hotels, et nystartet hotellselskap med base i Bodø, har annonsert en investering på 80 millioner kroner i tre boutique-hoteller i Lofoten-regionen.

Det første hotellet, med 45 rom i Henningsvær, er planlagt ferdigstilt til sommeren 2027. De to øvrige — i Reine og Svolvær — følger i 2028 og 2029.

"Lofoten har en unik posisjon i det internasjonale reisemarkedet, men mangler kvalitetshoteller som er åpne hele året," sier CEO Markus Fredriksen.

Prosjektet vil skape 65 nye helårsarbeidsplasser, noe som er spesielt viktig for en region der sesongarbeid har vært normen. Nordland fylkeskommune har bidratt med 12 millioner kroner i støtte gjennom regionalt næringsfond.

Lokale næringslivsaktører ser investeringen som et vendepunkt. "Dette viser at det er mulig å bygge bærekraftig helårsturisme i Lofoten," sier leder for Lofoten Næringsforum, Ingvild Strand.`
  }
];

export const articlesEn: Article[] = [
  {
    id: "1",
    title: "New Business Park Opens in Ålesund: 200 Jobs and NOK 500M in Investments",
    excerpt: "A consortium of local investors is making a big bet with a new business park at Moa. The project is expected to attract tech companies from across Western Norway.",
    category: "Real Estate",
    sport: "Nordvestlandet",
    readTime: "6 min read",
    publishedAt: "2 hours ago",
    author: "Kristoffer Haugen",
    type: "article",
    premium: false,
    keyPoints: [
      "The business park at Moa covers 25,000 sqm and opens in 2027",
      "The investor group consists of three local real estate companies with NOK 500M in combined capital",
      "Ålesund municipality has committed to reduced property tax for the first five years"
    ],
    body: `A new business park in Ålesund is taking shape. The consortium behind the project, consisting of three regional real estate companies, has secured NOK 500 million in financing for the development of a 25,000 square metre commercial area at Moa.

The project is designed to attract technology and innovation companies, with flexible office solutions, shared meeting rooms and a dedicated startup centre. Plans also include a marine technology laboratory, tailored to the region's strong maritime cluster.

"We see enormous potential in Ålesund as a technology city. With this business park, we want to create an environment where companies can grow together," says project manager Astrid Myklebust.

Ålesund municipality has signalled support through reduced property tax for the first five years, and letters of intent have already been signed with four technology companies wishing to move in when the park opens in 2027.`
  },
  {
    id: "2",
    title: "Local Tech Company Goes International — Triples Revenue in Two Years",
    excerpt: "TechNord AS from Tromsø has grown from 30 to 120 employees and now serves customers across the Nordics.",
    category: "Technology",
    sport: "Northern Norway",
    readTime: "5 min read",
    publishedAt: "4 hours ago",
    author: "Marte Solberg",
    type: "article",
    premium: false,
    keyPoints: [
      "TechNord AS has tripled revenue from NOK 45M to NOK 135M in two years",
      "The company has grown from 30 to 120 employees with headquarters in Tromsø",
      "Nordic expansion started with a pilot project in Finland that became a major success"
    ],
    body: `TechNord AS from Tromsø is writing northern Norwegian business history. The small software company that started with three founders in 2019 has grown at record speed to 120 employees and revenue of NOK 135 million.

The recipe for success? A cloud-based platform for logistics management in Arctic conditions, developed specifically for the challenges of weather, distance and infrastructure in northern regions.

"We built something no one else had — a solution that actually understands conditions in the north," explains CEO Lena Kristiansen.

The breakthrough came when Finnish transport companies discovered the platform and signed a major contract worth NOK 40M annually. TechNord now serves customers across the Nordics, and expansion towards Iceland and Greenland is being planned.

Tromsø municipality has highlighted TechNord as an example of how northern Norwegian expertise can build globally competitive companies.`
  },
  {
    id: "3",
    title: "Documentary: The Future of Aquaculture in Western Norway",
    excerpt: "From traditional fishing to tech-driven aquaculture. We explore how Western Norwegian companies innovate for sustainable growth.",
    category: "Industry",
    sport: "Western Norway",
    readTime: "24 min watch",
    publishedAt: "6 hours ago",
    author: "Documentary Team",
    type: "video",
    premium: true,
    keyPoints: [
      "Western Norway's aquaculture industry generates over NOK 80 billion annually",
      "New land-based farming facilities reduce environmental impact by up to 70%",
      "Three Western Norwegian companies lead development of autonomous feeding technology"
    ],
    body: `Western Norway is the heart of Norway's aquaculture industry, with combined revenues exceeding NOK 80 billion. But the industry stands at a crossroads: stricter environmental regulations, falling salmon prices and increasing international competition are forcing innovation.

This documentary follows three Western Norwegian companies leading the transformation. From land-based farming facilities in Hardanger that reduce environmental impact by 70%, to autonomous feeding systems developed in Bergen that use artificial intelligence to optimise fish health.

We also visit Austevoll, where a new generation of fishers combines traditional knowledge with modern technology to create sustainable jobs in a village that might otherwise have disappeared.`
  },
  {
    id: "4",
    title: "Retail Crisis? Small and Mid-Size Towns Hit Hardest by Store Closures",
    excerpt: "A review of retail data shows that city centre shops struggle most in towns with under 50,000 residents. But there are bright spots.",
    category: "Retail",
    sport: "Midt-Norge",
    readTime: "8 min read",
    publishedAt: "8 hours ago",
    author: "Sindre Bakke",
    type: "article",
    premium: false,
    keyPoints: [
      "City centre retail in towns under 50,000 has fallen 23% since 2019",
      "Steinkjer and Namsos are among the hardest hit in Trøndelag",
      "Local initiatives like the 'Shop Local' campaign in Levanger show promising results"
    ],
    body: `The decline of retail in Norwegian small towns is not just a phenomenon — it's a structural crisis threatening the vitality of town centres across the country. New figures from Virke show that city centre retail in towns under 50,000 has fallen 23% since 2019.

In Trøndelag, Steinkjer and Namsos are among the hardest hit. In Steinkjer, the number of city centre shops has gone from 87 in 2018 to 54 today. The main causes are online shopping, out-of-town shopping centres and changed consumer patterns after the pandemic.

But there are bright spots. In Levanger, retailers have united around the 'Shop Local' campaign, combining digital loyalty programmes with local experiences. The result: an 8% increase in city centre retail over the past year — against the national trend.

"People want to shop locally, but they need a reason to come to the town centre," says campaign leader Grete Hovde.`
  },
  {
    id: "5",
    title: "Weekly Business News: Who's Buying, Selling and Investing in Your Region?",
    excerpt: "A complete overview of the week's key transactions, new businesses and investments from across the country.",
    category: "Finance",
    sport: "Eastern Norway",
    readTime: "15 min listen",
    publishedAt: "10 hours ago",
    author: "Editorial Team",
    type: "podcast",
    premium: true,
    keyPoints: [
      "Three major acquisitions in the Oslo Fjord region this week — combined value over NOK 1.2 billion",
      "Drammen-based logistics company acquired by Danish group",
      "Record number of new businesses registered in Asker and Bærum in Q1"
    ],
    body: `This week's business update covers the most important transactions and movements in regional business. Three major acquisitions in the Oslo Fjord region dominate the news, with a combined transaction value exceeding NOK 1.2 billion.

The largest is the sale of Drammens Logistikk AS to the Danish group DSV Group, in a deal worth NOK 680 million. The company has 340 employees and is one of the largest third-party logistics operators in southern Norway.

We also look at the record figures for new business registrations in Asker and Bærum, where 487 new companies were registered in Q1 — an increase of 34% from the same period last year.`
  },
  {
    id: "6",
    title: "Tourism Boom: New Hotel Chain Invests NOK 80M in Lofoten",
    excerpt: "Arctic Hotels plans three new boutique hotels in the Lofoten region. What does it mean for the local business landscape?",
    category: "Tourism",
    sport: "Northern Norway",
    readTime: "5 min read",
    publishedAt: "12 hours ago",
    author: "Eirik Johnsen",
    type: "article",
    premium: false,
    keyPoints: [
      "Arctic Hotels is investing NOK 80M in three new boutique hotels in Lofoten",
      "The project creates 65 new year-round jobs in the region",
      "The Henningsvær hotel opens as early as summer 2027"
    ],
    body: `The tourism industry in Lofoten is getting a significant boost. Arctic Hotels, a newly established hotel company based in Bodø, has announced an NOK 80 million investment in three boutique hotels in the Lofoten region.

The first hotel, with 45 rooms in Henningsvær, is planned for completion by summer 2027. The remaining two — in Reine and Svolvær — will follow in 2028 and 2029.

"Lofoten has a unique position in the international travel market, but lacks quality hotels that are open year-round," says CEO Markus Fredriksen.

The project will create 65 new year-round jobs, which is especially important for a region where seasonal work has been the norm. Nordland county council has contributed NOK 12 million in support through the regional business fund.

Local business leaders see the investment as a turning point. "This shows it's possible to build sustainable year-round tourism in Lofoten," says Ingvild Strand, head of Lofoten Business Forum.`
  }
];

export const getArticles = (language: "no" | "en"): Article[] => {
  return language === "no" ? articlesNo : articlesEn;
};

export const getArticleById = (id: string, language: "no" | "en"): Article | undefined => {
  const articles = getArticles(language);
  return articles.find(article => article.id === id);
};
