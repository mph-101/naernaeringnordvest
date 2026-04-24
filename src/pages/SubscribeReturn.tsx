import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Header } from "@/components/Header";

export default function SubscribeReturn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get("session_id");

  useEffect(() => {
    const t = setTimeout(() => navigate("/profil"), 4000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-accent" />
        </div>
        <h1 className="font-headline text-2xl font-bold text-headline mb-3">
          Velkommen som abonnent!
        </h1>
        <p className="text-muted-foreground font-body mb-6">
          Prøveperioden er aktivert. Du har full tilgang i 7 dager — vi sender deg en påminnelse
          før første trekk.
        </p>
        {sessionId && (
          <p className="text-xs text-muted-foreground/60 font-body mb-6">Ref: {sessionId}</p>
        )}
        <button
          onClick={() => navigate("/profil")}
          className="px-6 py-2.5 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors"
        >
          Til min profil
        </button>
      </div>
    </div>
  );
}