import { useTheme } from "@/hooks/useTheme";

const journalists = [
  {
    id: 1,
    name: "Ingrid Solberg",
    role: { no: "Sportsøkonomi", en: "Sports Economics" },
    bio: {
      no: "Tidligere finansanalytiker med fokus på idrettens økonomiske strukturer og pengestrømmer.",
      en: "Former financial analyst focusing on sports economic structures and money flows."
    },
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face"
  },
  {
    id: 2,
    name: "Erik Nordahl",
    role: { no: "Undersøkende journalist", en: "Investigative Journalist" },
    bio: {
      no: "15 års erfaring med å avdekke korrupsjon og maktmisbruk i norsk og internasjonal idrett.",
      en: "15 years of experience exposing corruption and abuse of power in Norwegian and international sports."
    },
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face"
  },
  {
    id: 3,
    name: "Maria Henriksen",
    role: { no: "Datajournalist", en: "Data Journalist" },
    bio: {
      no: "Spesialist på dataanalyse og visualisering av komplekse økonomiske sammenhenger i idretten.",
      en: "Specialist in data analysis and visualization of complex economic relationships in sports."
    },
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face"
  },
  {
    id: 4,
    name: "Anders Kristiansen",
    role: { no: "Fotballøkonomi", en: "Football Economics" },
    bio: {
      no: "Ekspert på overgangsmarkedet og klubbøkonomi i europeisk og norsk fotball.",
      en: "Expert on the transfer market and club economics in European and Norwegian football."
    },
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face"
  },
  {
    id: 5,
    name: "Karin Moe",
    role: { no: "Sponsormarkedet", en: "Sponsorship Market" },
    bio: {
      no: "Tidligere sponsorsjef i toppidrett, nå journalist med innsikt i kommersielle avtaler.",
      en: "Former sponsorship director in elite sports, now journalist with insight into commercial deals."
    },
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face"
  }
];

export const TeamSection = () => {
  const { language } = useTheme();

  const title = language === "no" ? "Vårt team" : "Our Team";
  const subtitle = language === "no" 
    ? "Journalistene som graver i idrettens pengestrømmer"
    : "The journalists following the money in sports";

  return (
    <section className="py-16 bg-surface-subtle">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-headline text-3xl md:text-4xl font-semibold text-headline mb-3">
            {title}
          </h2>
          <p className="text-muted-foreground font-body text-lg max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {journalists.map((person, index) => (
            <div
              key={person.id}
              className="bg-card rounded-xl p-6 shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 text-center"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <img
                src={person.avatar}
                alt={person.name}
                className="w-20 h-20 rounded-full mx-auto mb-4 object-cover ring-2 ring-border"
              />
              <h3 className="font-headline text-lg font-medium text-headline mb-1">
                {person.name}
              </h3>
              <p className="text-sm font-medium text-primary mb-2">
                {person.role[language]}
              </p>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                {person.bio[language]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
