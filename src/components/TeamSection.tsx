import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Shield } from "lucide-react";
import { TipForm } from "./TipForm";

const journalists = [
  {
    id: "ingrid-solberg",
    name: "Ingrid Solberg",
    role: { no: "Sportsøkonomi", en: "Sports Economics" },
    bio: {
      no: "Tidligere finansanalytiker med fokus på idrettens økonomiske strukturer og pengestrømmer.",
      en: "Former financial analyst focusing on sports economic structures and money flows."
    },
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face"
  },
  {
    id: "erik-nordahl",
    name: "Erik Nordahl",
    role: { no: "Undersøkende journalist", en: "Investigative Journalist" },
    bio: {
      no: "15 års erfaring med å avdekke korrupsjon og maktmisbruk i norsk og internasjonal idrett.",
      en: "15 years of experience exposing corruption and abuse of power in Norwegian and international sports."
    },
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face"
  },
  {
    id: "maria-henriksen",
    name: "Maria Henriksen",
    role: { no: "Datajournalist", en: "Data Journalist" },
    bio: {
      no: "Spesialist på dataanalyse og visualisering av komplekse økonomiske sammenhenger i idretten.",
      en: "Specialist in data analysis and visualization of complex economic relationships in sports."
    },
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face"
  },
  {
    id: "anders-kristiansen",
    name: "Anders Kristiansen",
    role: { no: "Fotballøkonomi", en: "Football Economics" },
    bio: {
      no: "Ekspert på overgangsmarkedet og klubbøkonomi i europeisk og norsk fotball.",
      en: "Expert on the transfer market and club economics in European and Norwegian football."
    },
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face"
  },
  {
    id: "karin-moe",
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
  const [selectedJournalist, setSelectedJournalist] = useState<{ id: string; name: string } | null>(null);

  const title = language === "no" ? "Vårt team" : "Our Team";
  const subtitle = language === "no" 
    ? "Journalistene som graver i idrettens pengestrømmer"
    : "The journalists following the money in sports";
  const tipButtonLabel = language === "no" ? "Send tips" : "Send tip";

  return (
    <>
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
                className="bg-card rounded-xl p-6 shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 text-center flex flex-col"
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
                <p className="text-sm text-muted-foreground font-body leading-relaxed flex-1">
                  {person.bio[language]}
                </p>
                <button
                  onClick={() => setSelectedJournalist({ id: person.id, name: person.name })}
                  className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  {tipButtonLabel}
                </button>
              </div>
            ))}
          </div>

          {/* General Tip Channel CTA */}
          <div className="mt-12 bg-card rounded-2xl p-8 shadow-soft text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-headline text-2xl font-semibold text-headline mb-2">
              {language === "no" ? "Sikker tipskanal" : "Secure Tip Channel"}
            </h3>
            <p className="text-muted-foreground font-body max-w-xl mx-auto mb-6">
              {language === "no"
                ? "Har du informasjon om økonomisk misbruk i idretten? Send oss et anonymt tips. Alt er kryptert og kan ikke spores tilbake til deg."
                : "Do you have information about financial misconduct in sports? Send us an anonymous tip. Everything is encrypted and cannot be traced back to you."
              }
            </p>
            <button
              onClick={() => setSelectedJournalist({ id: "redaksjonen", name: language === "no" ? "Redaksjonen" : "Editorial Team" })}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              <Shield className="w-5 h-5" />
              {language === "no" ? "Send anonymt tips" : "Send anonymous tip"}
            </button>
          </div>
        </div>
      </section>

      {selectedJournalist && (
        <TipForm
          journalistId={selectedJournalist.id}
          journalistName={selectedJournalist.name}
          onClose={() => setSelectedJournalist(null)}
        />
      )}
    </>
  );
};
