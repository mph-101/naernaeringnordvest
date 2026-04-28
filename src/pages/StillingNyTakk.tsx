import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Header } from "@/components/Header";
import { useTheme } from "@/hooks/useTheme";

export default function StillingNyTakk() {
  const [params] = useSearchParams();
  const { language } = useTheme();
  const isNo = language === "no";
  useEffect(() => {
    document.title = isNo ? "Takk | Nær Næring" : "Thanks | Nær Næring";
  }, [isNo]);
  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <main className="max-w-xl mx-auto px-6 py-16 text-center">
        <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
        <h1 className="font-headline text-2xl font-bold text-headline mb-2">
          {isNo ? "Takk! Stillingen er sendt inn." : "Thanks! Your job is submitted."}
        </h1>
        <p className="text-muted-foreground font-body mb-6">
          {isNo
            ? "Vi gjennomgår annonsen før den publiseres. Du får beskjed på e-post."
            : "We review the listing before it goes live. You'll get an email confirmation."}
        </p>
        {params.get("session_id") && (
          <p className="text-xs text-muted-foreground font-body mb-6">
            Session: {params.get("session_id")}
          </p>
        )}
        <Link to="/stillinger" className="inline-block bg-primary text-primary-foreground rounded-full px-6 py-3 font-body font-medium">
          {isNo ? "Til alle stillinger" : "Back to jobs"}
        </Link>
      </main>
    </div>
  );
}