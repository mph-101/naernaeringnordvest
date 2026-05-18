import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Shield } from "lucide-react";
import { TipForm } from "./TipForm";

const journalists = [
  {
    id: "magnus-peter-harnes",
    name: "Magnus Peter Harnes",
    role: { no: "Ansvarlig redaktør og daglig leder", en: "Editor-in-chief & CEO" },
    bio: {
      no: "Grunnlegger og redaktør for Nær Næring. Følger lokalt næringsliv på Nordvestlandet med blikk for tall, mennesker og det som er i ferd med å skje.",
      en: "Founder and editor of Nær Næring. Covers local business on Norway's Northwest coast with an eye for numbers, people, and what's about to happen.",
    },
    avatar: null,
  },
  { id: "tba-1", name: "TBA", role: { no: "Journalist", en: "Reporter" }, bio: { no: "Stilling under bemanning. Tips oss gjerne om hvem du mener bør sitte her.", en: "Role being staffed. Send us a tip on who should fill it." }, avatar: null, tba: true },
  { id: "tba-2", name: "TBA", role: { no: "Datajournalist", en: "Data reporter" }, bio: { no: "Stilling under bemanning.", en: "Role being staffed." }, avatar: null, tba: true },
  { id: "tba-3", name: "TBA", role: { no: "Næringsanalytiker", en: "Business analyst" }, bio: { no: "Stilling under bemanning.", en: "Role being staffed." }, avatar: null, tba: true },
] as const;

export const TeamSection = () => {
  const { language } = useTheme();
  const [selectedJournalist, setSelectedJournalist] = useState<{ id: string; name: string } | null>(null);

  const title = language === "no" ? "Vårt team" : "Our Team";
  const subtitle = language === "no"
    ? "Redaksjonen bak Nær Næring Nordvest"
    : "The team behind Nær Næring Nordvest";
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {journalists.map((person, index) => (
              <div
                key={person.id}
                className="bg-card rounded-xl p-6 shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 text-center flex flex-col"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {person.avatar ? (
                  <img
                    src={person.avatar}
                    alt={person.name}
                    className="w-20 h-20 rounded-full mx-auto mb-4 object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className={`w-20 h-20 rounded-full mx-auto mb-4 ring-2 ring-border flex items-center justify-center font-headline text-xl font-bold ${("tba" in person && (person as any).tba) ? "bg-muted text-muted-foreground" : "bg-accent/15 text-accent"}`}>
                    {("tba" in person && (person as any).tba) ? "?" : person.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                )}
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
                  disabled={"tba" in person && (person as any).tba}
                  className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                ? "Har du informasjon om næringslivet på Nordvestlandet som bør frem i lyset? Send oss et tips via sikker forbindelse. For sensitive saker, kontakt oss via Signal."
                : "Do you have information about business in the Northwest region that should come to light? Send us a tip via secure connection. For sensitive matters, contact us via Signal."
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
