import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useTheme } from "@/hooks/useTheme";
import { Lock, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { language } = useTheme();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);

  const t = language === "no"
    ? {
        title: "Nytt passord",
        desc: "Skriv inn ditt nye passord",
        password: "Nytt passord",
        confirm: "Bekreft passord",
        submit: "Oppdater passord",
        loading: "Oppdaterer...",
        successTitle: "Passord oppdatert!",
        successDesc: "Du kan nå logge inn med ditt nye passord.",
        login: "Gå til innlogging",
        mismatch: "Passordene stemmer ikke overens",
        invalidLink: "Ugyldig eller utløpt lenke",
        invalidDesc: "Prøv å be om en ny tilbakestillingslenke.",
        backToLogin: "Tilbake til innlogging",
      }
    : {
        title: "New password",
        desc: "Enter your new password",
        password: "New password",
        confirm: "Confirm password",
        submit: "Update password",
        loading: "Updating...",
        successTitle: "Password updated!",
        successDesc: "You can now log in with your new password.",
        login: "Go to login",
        mismatch: "Passwords do not match",
        invalidLink: "Invalid or expired link",
        invalidDesc: "Try requesting a new reset link.",
        backToLogin: "Back to login",
      };

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
      setChecking(false);
    });

    // Also check URL hash for recovery type
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
    
    // Fallback timeout
    const timer = setTimeout(() => setChecking(false), 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t.mismatch);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      await supabase.auth.signOut();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />

      <div className="flex items-center justify-center px-6 py-12">
        <div className="bg-card rounded-2xl p-8 max-w-md w-full shadow-elevated border border-border">
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-accent" />
              </div>
              <h1 className="font-headline text-2xl font-bold text-headline mb-3">{t.successTitle}</h1>
              <p className="text-muted-foreground font-body mb-6">{t.successDesc}</p>
              <button
                onClick={() => navigate("/login")}
                className="px-6 py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft"
              >
                {t.login}
              </button>
            </div>
          ) : !isRecovery ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="font-headline text-2xl font-bold text-headline mb-3">{t.invalidLink}</h1>
              <p className="text-muted-foreground font-body mb-6">{t.invalidDesc}</p>
              <button
                onClick={() => navigate("/login")}
                className="px-6 py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft"
              >
                {t.backToLogin}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="font-headline text-2xl font-bold text-headline mb-2">{t.title}</h1>
                <p className="text-sm text-muted-foreground font-body">{t.desc}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-subhead font-medium text-foreground mb-1.5 block">
                    {t.password}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-3 bg-surface-subtle border border-border rounded-xl font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-subhead font-medium text-foreground mb-1.5 block">
                    {t.confirm}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-3 bg-surface-subtle border border-border rounded-xl font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? t.loading : t.submit}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
