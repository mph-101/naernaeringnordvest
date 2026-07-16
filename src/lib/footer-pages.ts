/**
 * Footer page content for Nær Næring (Om oss, Kontakt, etc.)
 * Source: src/content/footer-pages.md
 * Placeholders in [SQUARE BRACKETS] are intentional and must be replaced before launch.
 */

export type FooterPageSlug =
  | "om-oss"
  | "kontakt"
  | "redaksjonelle-prinsipper"
  | "personvern"
  | "vilkar"
  | "innholdsmerking"
  | "eierskap"
  | "cookies"
  | "tilgjengelighet";

export interface FooterPage {
  slug: FooterPageSlug;
  title: string;
  /** Short label used in footer link lists */
  shortLabel: string;
  /** SEO meta description */
  description: string;
  /** Markdown body */
  body: string;
  /** Render as a minimal "kommer snart" placeholder instead of full article */
  placeholder?: boolean;
}

const omOss = `**Næringslivet i regionen — slik det faktisk er.**

Nær Næring Nordvest er den første næringslivsavisen i Compass Medias regionale satsing. Flere aviser følger — Nær Næring Nord og Nær Næring Midt er under planlegging. Ambisjonen er å bygge ut dekningen region for region, med selvstendige redaksjoner som kjenner sitt eget næringsliv fra innsiden.

Vi dekker bedriftene, gründerne og beslutningstakerne i regionen vår med samme grundighet som de største riksmediene, men med en kunnskap om lokale forhold du ikke finner andre steder.

Vi er bygget for hvordan folk faktisk leser nyheter i dag: digitalt, mobilt og når det passer dem. Bak hver artikkel står journalister med erfaring fra ledende norske redaksjoner, støttet av moderne verktøy som lar oss jobbe raskere og grundigere enn det som har vært mulig før.

**Det vi tror på:**

- At lokalt næringsliv fortjener journalistikk på høyt nivå
- At gode historier krever tid, kildearbeid og redaksjonell uavhengighet
- At teknologi skal frigjøre journalister til å gjøre mer journalistikk — ikke erstatte dem
- At leserne våre er kloke folk som vil ha fakta, kontekst og analyse — ikke clickbait

Nær Næring Nordvest utgis av **Compass Media**, et uavhengig mediehus med hovedkontor i Molde. Compass Media står bak Nær Næring-avisene, og er medlem av Mediebedriftenes Landsforening (MBL) og Norsk Redaktørforening, og tilsluttet Pressens Faglige Utvalg (PFU). Vi arbeider etter Vær Varsom-plakaten og Redaktørplakaten.

**Ansvarlig redaktør og daglig leder:** Magnus Peter Harnes
**Organisasjonsnummer:** [ORG.NR.]
**Besøksadresse:** [ADRESSE], Molde`;

const kontakt = `Vi vil gjerne høre fra deg — enten du har et tips, et spørsmål, en korrigering eller bare en mening om noe vi har skrevet.

### Redaksjonen

Tips, innspill og spørsmål til redaksjonelt innhold:
[redaksjon@naernaering.no](mailto:redaksjon@naernaering.no)

### Tips oss

Har du et tips? Bruk [tipsskjemaet](/team) eller kontakt en av journalistene våre direkte. Tipset sendes over en sikker forbindelse, og du velger selv om du vil oppgi kontaktinformasjon. For sensitive saker hvor full kildebeskyttelse er kritisk, avtal et fysisk møte med en journalist — skriv til [redaksjon@naernaering.no](mailto:redaksjon@naernaering.no) uten å utdype innholdet.

### Rettelser og klager

Mener du noe vi har publisert er feil eller urimelig? Skriv til ansvarlig redaktør på [redaktor@naernaering.no](mailto:redaktor@naernaering.no). Du kan også klage oss inn for Pressens Faglige Utvalg (PFU). Mer om dette under [Redaksjonelle prinsipper](/redaksjonelle-prinsipper).

### Annonsering og kommersielle henvendelser

[salg@naernaering.no](mailto:salg@naernaering.no) — eller ring [TELEFON]

### Abonnement og kundeservice

[kundeservice@naernaering.no](mailto:kundeservice@naernaering.no)

### Presse og generelle henvendelser

[post@naernaering.no](mailto:post@naernaering.no)

### Postadresse

Compass Media
[ADRESSE]
[POSTNR] Molde

**Organisasjonsnummer:** [ORG.NR.]`;

const redaksjonellePrinsipper = `Nær Næring er et redaktørstyrt journalistisk medium som arbeider etter de etiske normene som er nedfelt i **Vær Varsom-plakaten** og **Redaktørplakaten**. Vi er tilsluttet Pressens Faglige Utvalg (PFU).

### Redaksjonell uavhengighet

Ansvarlig redaktør har det fulle og hele ansvar for det redaksjonelle innholdet. Verken eiere, annonsører, kilder eller andre eksterne aktører har innflytelse over hva som publiseres eller hvordan saker blir vinklet. Redaksjonen er organisatorisk og økonomisk skilt fra det kommersielle apparatet.

### Kildebehandling

Vi etterstreber alltid å gi den omtalte parten anledning til samtidig imøtegåelse ved sterke beskyldninger av faktisk art. Vi oppgir kilder så langt det er mulig, og beskytter anonyme kilder etter pressens kildevernregler. Vi betaler ikke for informasjon eller intervjuer.

### Skille mellom kommersielt og redaksjonelt innhold

Alt kommersielt innhold — annonser, sponset innhold, native advertising — skal være tydelig merket og enkelt å skille fra det redaksjonelle stoffet. Annonsører får ikke innflytelse på redaksjonelt innhold, og redaksjonelle medarbeidere produserer ikke kommersielt innhold.

### Bruk av kunstig intelligens

Nær Næring bruker AI-verktøy som en del av den redaksjonelle arbeidsflyten — til research, analyse, transkribering og andre oppgaver der teknologien styrker journalistikken. Alt redaksjonelt innhold som publiseres er kvalitetssikret av en menneskelig journalist og redaktør. Vi publiserer ikke artikler som er generert av AI uten redaksjonell behandling, og vi merker tydelig hvis AI er brukt på måter leseren bør være kjent med (for eksempel automatisert oppsummering eller maskingenererte illustrasjoner).

### Retting av feil

Vi retter feil så snart vi blir oppmerksomme på dem. Vesentlige rettelser merkes tydelig i artikkelen med dato og hva som er endret. Mindre språklige justeringer og presiseringer gjøres uten merknad. Mener du noe vi har publisert er feil, urimelig eller i strid med god presseskikk, ta kontakt med ansvarlig redaktør på [redaktor@naernaering.no](mailto:redaktor@naernaering.no).

### Klage til PFU

Du kan klage Nær Næring inn for Pressens Faglige Utvalg (PFU). Mer informasjon finner du på [presse.no](https://presse.no).

### Habilitet og bindinger

Journalister og redaktører i Nær Næring opplyser om eierinteresser, verv eller andre bindinger som kan påvirke deres dekning av en sak. Vi dekker ikke saker der vi har personlige eller økonomiske interesser uten at dette opplyses.

**Ansvarlig redaktør:** Magnus Peter Harnes, [E-POST]`;

const personvern = `*Sist oppdatert: [DATO]*

Compass Media (heretter «vi», «oss» eller «Nær Næring») er behandlingsansvarlig for personopplysninger som behandles i forbindelse med tjenestene våre. Denne personvernerklæringen beskriver hvilke opplysninger vi samler inn, hvordan vi bruker dem, og hvilke rettigheter du har.

### 1. Behandlingsansvarlig

Compass Media
Organisasjonsnummer: [ORG.NR.]
Adresse: [ADRESSE], Molde
Kontakt: [personvern@naernaering.no](mailto:personvern@naernaering.no)

### 2. Hvilke personopplysninger vi behandler

Vi behandler følgende kategorier av personopplysninger:

- **Kontoopplysninger:** Navn, e-postadresse, telefonnummer, passord (kryptert), bedrift/stilling der dette er relevant.
- **Betalingsopplysninger:** Faktureringsadresse og transaksjonshistorikk. Selve kortinformasjonen håndteres av vår betalingsleverandør og lagres ikke hos oss.
- **Bruksdata:** Hvilke artikler du leser, hvor lenge, fra hvilken enhet og hvilken nettleser. IP-adresse, omtrentlig geografisk plassering og henvisende nettside.
- **Kommunikasjon:** Innhold i e-post og henvendelser du sender oss, og vår oppfølging.
- **Tips og kildemateriale:** Når du tipser oss, lagres opplysningene på en måte som ivaretar kildevernet.

### 3. Formål og rettslig grunnlag

Vi behandler personopplysninger for følgende formål:

- **Levering av tjenesten:** For å gi deg tilgang til artikler, nyhetsbrev og andre tjenester du har bestilt. Rettslig grunnlag: avtale (GDPR art. 6(1)(b)).
- **Fakturering og regnskap:** Rettslig grunnlag: rettslig forpliktelse (GDPR art. 6(1)(c)).
- **Forbedring av tjenesten:** For å analysere bruksmønstre og forbedre innhold og funksjonalitet. Rettslig grunnlag: berettiget interesse (GDPR art. 6(1)(f)).
- **Markedsføring av egne tjenester:** Til eksisterende kunder, basert på berettiget interesse. Til andre, basert på samtykke. Du kan når som helst reservere deg.
- **Journalistisk arbeid:** Behandling av personopplysninger i journalistisk øyemed er underlagt særlige regler i personopplysningsloven § 3, og store deler av GDPR gjelder ikke for slik behandling.

### 4. Cookies og sporing

Vi bruker informasjonskapsler (cookies) og lignende teknologi for å levere og forbedre tjenesten. Du kan velge hvilke cookies du godtar via cookie-bannerets innstillinger.

### 5. Deling av opplysninger

Vi deler personopplysninger med:

- **Databehandlere** som leverer tjenester på våre vegne (driftsleverandører, betalingsleverandører, e-postutsendelse, analyseverktøy). Disse er bundet av databehandleravtaler.
- **Offentlige myndigheter** når vi er rettslig forpliktet til det.

Vi selger ikke personopplysninger til tredjeparter.

Noen av våre databehandlere er lokalisert utenfor EU/EØS. Slik overføring skjer på grunnlag av EU-kommisjonens standardkontraktsklausuler eller andre lovlige overføringsmekanismer.

### 6. Lagringstid

Vi lagrer personopplysninger så lenge det er nødvendig for formålet de er innhentet for, eller så lenge vi er pålagt det etter lov (for eksempel bokføringsloven, som krever fem års oppbevaring av regnskapsbilag). Kontoopplysninger slettes innen rimelig tid etter at kundeforholdet er avsluttet.

### 7. Dine rettigheter

Du har rett til å:

- få innsyn i personopplysningene vi behandler om deg
- få rettet uriktige opplysninger
- få slettet opplysninger som ikke lenger er nødvendige
- begrense behandlingen i visse situasjoner
- protestere mot behandling basert på berettiget interesse
- få opplysningene utlevert i et strukturert format (dataportabilitet)
- trekke tilbake samtykke når behandlingen baserer seg på samtykke

For å utøve rettighetene dine, kontakt oss på [personvern@naernaering.no](mailto:personvern@naernaering.no). Du har også rett til å klage til Datatilsynet ([datatilsynet.no](https://datatilsynet.no)).

### 8. Sikkerhet

Vi har tekniske og organisatoriske tiltak på plass for å beskytte personopplysningene dine mot uautorisert tilgang, endring eller sletting. Dette omfatter blant annet kryptering, tilgangsstyring og rutiner for håndtering av sikkerhetsbrudd.

### 9. Endringer

Vi kan oppdatere denne personvernerklæringen ved behov. Vesentlige endringer varsles på nettsiden eller via e-post.`;

const vilkar = `*Sist oppdatert: [DATO]*

Disse vilkårene regulerer din bruk av tjenestene som tilbys av Compass Media (organisasjonsnummer [ORG.NR.]) gjennom Nær Næring-avisene og tilknyttede plattformer, herunder Nær Næring Nordvest og øvrige regionale titler i porteføljen.

### 1. Avtaleinngåelse

Ved å opprette en konto, tegne abonnement eller på annen måte bruke tjenesten aksepterer du disse vilkårene. Er du under 18 år, må du ha samtykke fra foresatt.

### 2. Tjenesten

Nær Næring tilbyr digital næringslivsjournalistikk gjennom artikler, nyhetsbrev, podkaster og andre formater. Innholdet er beskyttet etter åndsverkloven og kan ikke kopieres, distribueres eller publiseres uten skriftlig samtykke, utover det som følger av sitatretten.

### 3. Abonnement og betaling

Abonnement løper inntil det sies opp. Betaling skjer forskuddsvis for valgt abonnementsperiode. Priser fremkommer ved bestilling og kan endres med rimelig varsel; prisendringer trer i kraft fra neste fornyelsesperiode.

Etter angrerettloven har forbrukere 14 dagers angrerett ved kjøp av digitale tjenester. Ved å starte å bruke tjenesten umiddelbart etter kjøp samtykker du til at angreretten faller bort når levering er påbegynt, jf. angrerettloven § 22 bokstav n.

### 4. Oppsigelse

Du kan si opp abonnementet når som helst via «Min side» eller ved å kontakte kundeservice. Oppsigelsen får virkning fra utløpet av inneværende betalingsperiode. Forhåndsbetalte beløp refunderes ikke ved oppsigelse, med mindre annet følger av ufravikelig lov.

### 5. Bruk av tjenesten

Du forplikter deg til ikke å:

- dele innloggingsopplysninger med andre
- bruke automatiserte verktøy (scraping, roboter) til å hente innhold uten skriftlig samtykke
- gjengi eller publisere innhold fra Nær Næring utover sitatretten
- forsøke å omgå betalingsmurer eller andre tekniske beskyttelsesmekanismer
- bruke tjenesten i strid med norsk lov

Brudd kan føre til midlertidig eller permanent stenging av kontoen uten refusjon.

### 6. Brukergenerert innhold

Dersom du sender oss tips, kommentarer eller annet materiale, gir du Nær Næring en ikke-eksklusiv, vederlagsfri rett til å bruke materialet redaksjonelt. Du står ansvarlig for at materialet ikke krenker tredjeparts rettigheter.

### 7. Immaterielle rettigheter

Alt innhold publisert i Nær Næring-avisene — tekst, bilder, video, lyd, design, kildekode — tilhører Compass Media eller våre lisensgivere og er beskyttet etter åndsverkloven og annen relevant lovgivning. Ulovlig kopiering kan medføre erstatningsansvar.

### 8. Ansvarsfraskrivelse

Nær Næring etterstreber korrekt og oppdatert informasjon, men gir ingen garantier for at innholdet til enhver tid er feilfritt eller fullstendig. Innholdet utgjør ikke investeringsrådgivning, juridisk rådgivning eller annen profesjonell rådgivning. Beslutninger basert på vårt innhold tas på eget ansvar.

Vi tar forbehold om driftsavbrudd og tekniske feil. Nær Næring er ikke ansvarlig for indirekte tap som følge av bruk av eller manglende tilgang til tjenesten, med mindre tapet skyldes grov uaktsomhet eller forsett fra vår side.

### 9. Endring av vilkår

Vi kan endre disse vilkårene. Vesentlige endringer varsles via e-post eller på nettsiden minst 30 dager før de trer i kraft. Fortsatt bruk etter ikrafttredelse regnes som aksept.

### 10. Lovvalg og verneting

Avtalen reguleres av norsk rett. Tvister skal søkes løst i minnelighet. Dersom dette ikke fører frem, vedtas Møre og Romsdal tingrett som verneting. Forbrukere har likevel rett til å reise sak ved sitt hjemting og kan klage til Forbrukertilsynet.

### 11. Kontakt

Compass Media
[ADRESSE], Molde
[E-POST]
Organisasjonsnummer: [ORG.NR.]`;

const innholdsmerking = `*Sist oppdatert: [DATO]*

Et tydelig skille mellom journalistikk og kommersielt innhold er en grunnpilar i Nær Nærings redaksjonelle plattform. Denne siden forklarer hvordan vi merker ulike typer innhold, slik at du som leser alltid skal kunne se hvem som står bak det du leser.

### Redaksjonelt innhold

Alt redaksjonelt innhold er produsert av Nær Nærings journalister og redaktører, og er underlagt ansvarlig redaktør. Dette omfatter nyhetsartikler, reportasjer, intervjuer, analyser, kommentarer og lederartikler. Redaksjonelt innhold er ikke betalt for av kilder, omtalte selskaper eller andre eksterne aktører.

**Sjangermerking innenfor det redaksjonelle:**

- **Nyhet** — faktabasert dekning av aktuelle hendelser, uten journalistens egne vurderinger.
- **Analyse** — journalistens vurdering og tolkning av en sak, basert på dokumentasjon og kilder.
- **Kommentar** — personlige synspunkter fra en navngitt journalist eller bidragsyter.
- **Leder** — redaksjonens offisielle holdning, signert av ansvarlig redaktør eller redaksjonsledelsen.
- **Debatt / kronikk** — ekstern bidragsyter står for innholdet. Bidragsyterens navn, tittel og eventuelle bindinger oppgis.

### Kommersielt innhold

Alt kommersielt innhold er tydelig merket og visuelt skilt fra det redaksjonelle stoffet. Kommersielt innhold er ikke produsert av redaksjonen, og redaksjonelle medarbeidere bidrar ikke til produksjonen.

- **Annonse** — betalt reklame i form av bannere, video eller andre formater. Tydelig merket «Annonse».
- **Sponset innhold / annonsørinnhold** — artikler eller annet redaksjonelt utformet innhold som er betalt for av en annonsør. Merkes med «Annonsørinnhold», med tydelig angivelse av hvilken annonsør som står bak. Innholdet produseres av annonsøren eller av Compass Medias kommersielle avdeling — aldri av redaksjonen.
- **Native advertising** — annonser som visuelt ligner redaksjonelt stoff merkes alltid med «Annonse» eller «Annonsørinnhold», i tråd med Tekstreklameplakaten og Forbrukertilsynets veiledning.

### Samarbeid og partnerskap

Når Nær Næring inngår redaksjonelle samarbeid med eksterne parter — for eksempel forskningsinstitusjoner, bransjeorganisasjoner eller andre medier — opplyser vi alltid om hvem samarbeidspartneren er og hva samarbeidet innebærer. Redaksjonell kontroll ligger alltid hos ansvarlig redaktør.

### Bruk av kunstig intelligens

Vi bruker AI-verktøy i deler av den redaksjonelle arbeidsflyten, men alt redaksjonelt innhold som publiseres er kvalitetssikret av en menneskelig journalist eller redaktør. Dersom AI er brukt på måter leseren bør være kjent med — for eksempel automatisert oppsummering, maskingenererte illustrasjoner eller transkripsjon presentert som direkte sitat — merkes dette tydelig. Les mer under [Redaksjonelle prinsipper](/redaksjonelle-prinsipper).

### Bilder og illustrasjoner

Alle bilder og illustrasjoner er kreditert med fotograf, byrå eller illustratør. Arkivbilder, illustrasjonsfoto og maskingenererte bilder merkes som dette. Sponsede bilder eller bilder levert av kilder identifiseres i bildeteksten.

### Lenker

Eksterne lenker i redaksjonelle artikler er valgt av redaksjonen for å gi leseren mer kontekst, og innebærer ikke en anbefaling eller godkjenning av tredjepartens innhold. Affiliate-lenker, der Nær Næring mottar en provisjon dersom leseren foretar et kjøp, brukes ikke i redaksjonelt innhold uten at det er tydelig merket.

### Klager og rettelser

Mener du noe ikke er merket korrekt — at en artikkel burde vært merket som annonsørinnhold, eller at en kilde er gjengitt på en måte som skjuler interessekonflikter — vil vi vite om det. Skriv til ansvarlig redaktør på [redaktor@naernaering.no](mailto:redaktor@naernaering.no). Du kan også klage Nær Næring inn for Pressens Faglige Utvalg (PFU).`;

const eierskap = `*Sist oppdatert: [DATO]*

Åpenhet om hvem som eier et mediehus er en forutsetning for at lesere skal kunne vurdere journalistikken kritisk. På denne siden får du oversikt over hvem som står bak Nær Næring, hvordan vi er finansiert, og hvilke prinsipper som styrer forholdet mellom eiere og redaksjon.

### Selskapsstruktur

Nær Næring-avisene utgis av et konsern med følgende oppbygning:

- **Compass Media Holding AS** — øverste eierselskap. Eier aksjene i de operative selskapene, men har ingen egen drift.
- **Compass Media AS** — operativ konsernmor. Har ansvar for felles funksjoner som økonomi, kommersiell ledelse, sentralredaksjonelle ressurser og administrasjon.
- **CM CMS AS** — teknologiselskapet. Utvikler og drifter den redaksjonelle plattformen, AI-verktøyene og analyseløsningene som Nær Næring-avisene bruker.
- **Nær Næring Nordvest AS** — utgiver av Nær Næring Nordvest. Egen redaksjon med ansvarlig redaktør.
- Tilsvarende egne aksjeselskaper opprettes for hver nye regionavis (Nær Næring Nord, Nær Næring Midt og så videre) ved lansering.

Strukturen er valgt fordi hver avis skal kunne ha lokale eiere uten at risiko eller eierinteresser smitter over på andre aviser, og fordi teknologi- og medievirksomheten har ulike forretningslogikker og bør kunne kapitaliseres separat.

### Eiere

**Compass Media Holding AS** eies per [DATO] av:

- [NAVN], [PROSENT] %
- [NAVN], [PROSENT] %
- [eventuelle øvrige aksjonærer]

**Nær Næring Nordvest AS** eies per [DATO] av:

- Compass Media AS, [PROSENT] %
- [eventuelle lokale medeiere med over 5 % eierandel]

**CM CMS AS** eies per [DATO] av:

- Compass Media AS, [PROSENT] %
- [eventuelle eksterne investorer med over 5 % eierandel]

Komplette aksjonæroversikter er offentlig tilgjengelige i Brønnøysundregistrene.

### Finansiering

Nær Næring finansieres gjennom fire hovedkanaler:

- **Abonnementsinntekter** fra privatpersoner og bedrifter.
- **Annonseinntekter** og kommersielle samarbeid, organisert gjennom en kommersiell avdeling som er strukturelt skilt fra redaksjonen.
- **Egenkapital** fra eierne i selskapene over.
- **Lisensinntekter** i CM CMS, fra eksterne kunder av plattformen.

Vi mottar ikke pressestøtte per [DATO]. Dersom dette endrer seg, vil det fremgå her.

### Redaksjonell uavhengighet

Eierne har ingen innflytelse på det redaksjonelle innholdet. Dette er forankret på flere måter:

- **Redaktørplakaten og Vær Varsom-plakaten** ligger til grunn for all redaksjonell virksomhet. Ansvarlig redaktør har det fulle ansvaret for hva som publiseres.
- **Vedtektsfestet uavhengighet:** Vedtektene i utgiverselskapene slår fast at eiere ikke kan instruere redaktøren om redaksjonelle valg, og at endring av denne bestemmelsen krever kvalifisert flertall.
- **Aksjonæravtaler:** Investorer som kommer inn i et utgiverselskap forplikter seg gjennom aksjonæravtalen til å respektere redaksjonell uavhengighet og Redaktørplakaten.
- **Organisatorisk skille:** Redaksjonen er adskilt fra den kommersielle avdelingen og fra eierselskapene. Redaktøren rapporterer til styret på selskaps­messige spørsmål, men ikke på redaksjonelle.

### Når vi dekker våre egne eiere

Eiere av Compass Media-selskapene og deres nærstående selskaper omtales etter samme journalistiske kriterier som andre aktører i regionen. Når vi dekker en eier eller et selskap der en eier har vesentlig interesse, opplyser vi om eierforholdet i artikkelen.

Redaksjonelle medarbeidere kan ikke eie aksjer i Compass Media-selskapene utenom mindre ansatteierandeler som tilbys alle ansatte på like vilkår. Eventuelle bindinger som kan påvirke en journalists dekning oppgis i artikkelen eller på journalistens profilside.

### Endringer i eierskap

Vesentlige endringer i eierskap — for eksempel nye investorer med over 5 % eierandel, eller endringer i kontroll — kommuniseres åpent på denne siden og omtales redaksjonelt på linje med tilsvarende eierendringer i andre selskaper.

### Kontakt

Spørsmål om eierskap, finansiering eller redaksjonell uavhengighet:
[post@naernaering.no](mailto:post@naernaering.no)

Spørsmål om investeringsmuligheter i Compass Media-selskapene:
[invest@compassmedia.no](mailto:invest@compassmedia.no)`;

export const FOOTER_PAGES: Record<FooterPageSlug, FooterPage> = {
  "om-oss": {
    slug: "om-oss",
    title: "Om oss",
    shortLabel: "Om oss",
    description:
      "Nær Næring Nordvest er en uavhengig næringslivsavis utgitt av Compass Media i Molde.",
    body: omOss,
  },
  kontakt: {
    slug: "kontakt",
    title: "Kontakt",
    shortLabel: "Kontakt",
    description: "Kontakt redaksjonen, salg, kundeservice eller send oss et tips.",
    body: kontakt,
  },
  "redaksjonelle-prinsipper": {
    slug: "redaksjonelle-prinsipper",
    title: "Redaksjonelle prinsipper",
    shortLabel: "Redaksjonelle prinsipper",
    description:
      "Slik jobber Nær Næring etter Vær Varsom-plakaten og Redaktørplakaten — uavhengighet, kildevern og bruk av AI.",
    body: redaksjonellePrinsipper,
  },
  personvern: {
    slug: "personvern",
    title: "Personvernerklæring",
    shortLabel: "Personvern",
    description:
      "Slik behandler Nær Næring og Compass Media personopplysninger i tråd med GDPR.",
    body: personvern,
  },
  vilkar: {
    slug: "vilkar",
    title: "Brukervilkår",
    shortLabel: "Vilkår",
    description:
      "Vilkår for bruk av Nær Nærings tjenester, abonnement og innhold.",
    body: vilkar,
  },
  innholdsmerking: {
    slug: "innholdsmerking",
    title: "Innholdsmerking",
    shortLabel: "Innholdsmerking",
    description:
      "Slik merker Nær Næring redaksjonelt og kommersielt innhold, AI-bruk og bilder.",
    body: innholdsmerking,
  },
  eierskap: {
    slug: "eierskap",
    title: "Eierskap og finansiering",
    shortLabel: "Eierskap",
    description:
      "Hvem som eier Compass Media og Nær Næring-avisene, og hvordan virksomheten er finansiert.",
    body: eierskap,
  },
  cookies: {
    slug: "cookies",
    title: "Cookie-erklæring",
    shortLabel: "Cookies",
    description:
      "Slik bruker Nær Næring informasjonskapsler og sporingsteknologi for å levere og forbedre nyhetstjenesten.",
    body: "",
    placeholder: true,
  },
  tilgjengelighet: {
    slug: "tilgjengelighet",
    title: "Tilgjengelighetserklæring",
    shortLabel: "Tilgjengelighet",
    description:
      "Nær Nærings status for universell utforming etter WCAG 2.1 og hvordan vi jobber for tilgjengelig innhold for alle.",
    body: "",
    placeholder: true,
  },
};

export const FOOTER_PAGE_LINKS: { slug: FooterPageSlug; label: string }[] = [
  { slug: "om-oss", label: "Om oss" },
  { slug: "kontakt", label: "Kontakt" },
  { slug: "redaksjonelle-prinsipper", label: "Redaksjonelle prinsipper" },
  { slug: "innholdsmerking", label: "Innholdsmerking" },
  { slug: "eierskap", label: "Eierskap" },
  { slug: "personvern", label: "Personvern" },
  { slug: "vilkar", label: "Vilkår" },
  { slug: "cookies", label: "Cookies" },
  { slug: "tilgjengelighet", label: "Tilgjengelighet" },
];