import { Header } from "@/components/Header";
import { TeamSection } from "@/components/TeamSection";
import { SiteFooter } from "@/components/SiteFooter";

const Team = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      
      <main className="pt-8">
        <TeamSection />
      </main>

      <SiteFooter />
    </div>
  );
};

export default Team;
