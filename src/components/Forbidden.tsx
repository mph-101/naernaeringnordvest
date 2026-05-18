import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

export const Forbidden = () => {
  const { signOut } = useAuth();
  const { language } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-8 max-w-md w-full text-center shadow-elevated">
        <h1 className="font-headline text-2xl font-semibold text-headline mb-4">
          {language === "no" ? "Ingen tilgang" : "Access denied"}
        </h1>
        <p className="text-muted-foreground font-body mb-6">
          {language === "no"
            ? "Du har ikke tilgang til admin-panelet. Kontakt en administrator for å få tildelt en rolle."
            : "You do not have access to the admin panel. Contact an administrator to get a role assigned."}
        </p>
        <div className="space-y-3">
          <button
            onClick={() => signOut()}
            className="w-full px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors"
          >
            {language === "no" ? "Logg ut" : "Log out"}
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {language === "no" ? "Tilbake til forsiden" : "Back to front page"}
          </button>
        </div>
      </div>
    </div>
  );
};
