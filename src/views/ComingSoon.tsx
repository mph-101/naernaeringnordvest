import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";

const ComingSoon = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />

      <main className="flex-1 flex items-center justify-center px-6 py-24 md:py-32">
        <div className="max-w-lg text-center space-y-6">
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-headline leading-tight">
            Kommer i nærmeste fremtid
          </h1>
          <p className="text-lg text-muted-foreground font-body leading-relaxed">
            Vi jobber med noe nytt. Følg med — mer informasjon kommer snart.
          </p>
          <div className="pt-4">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-body font-medium hover:bg-primary/90 transition-colors"
            >
              Tilbake til forsiden
            </a>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default ComingSoon;
