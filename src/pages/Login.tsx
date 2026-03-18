import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useTheme } from "@/hooks/useTheme";
import { Mail, Lock, ArrowLeft, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { language } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const t = language === "no"
    ? {
        loginTitle: "Logg inn",
        signupTitle: "Opprett konto",
        loginDesc: "Logg inn for å bruke notater, grupper og mer",
        signupDesc: "Opprett en konto for å komme i gang",
        email: "E-post",
        password: "Passord",
        name: "Visningsnavn",
        loginBtn: "Logg inn",
        signupBtn: "Opprett konto",
        switchToSignup: "Ny bruker? Opprett konto",
        switchToLogin: "Har du allerede en konto? Logg inn",
        back: "Tilbake",
        loading: "Vennligst vent...",
        signupSuccess: "Konto opprettet! Sjekk e-posten din for å bekrefte kontoen.",
        loginSuccess: "Velkommen tilbake!",
        forgotPassword: "Glemt passord?",
        forgotTitle: "Tilbakestill passord",
        forgotDesc: "Skriv inn e-posten din, så sender vi deg en lenke for å tilbakestille passordet.",
        sendReset: "Send tilbakestillingslenke",
        resetSent: "Sjekk e-posten din!",
        resetSentDesc: "Vi har sendt deg en lenke for å tilbakestille passordet.",
        backToLogin: "Tilbake til innlogging",
      }
    : {
        loginTitle: "Log in",
        signupTitle: "Create account",
        loginDesc: "Log in to use notes, groups and more",
        signupDesc: "Create an account to get started",
        email: "Email",
        password: "Password",
        name: "Display name",
        loginBtn: "Log in",
        signupBtn: "Create account",
        switchToSignup: "New user? Create account",
        switchToLogin: "Already have an account? Log in",
        back: "Back",
        loading: "Please wait...",
        signupSuccess: "Account created! Check your email to verify your account.",
        loginSuccess: "Welcome back!",
        forgotPassword: "Forgot password?",
        forgotTitle: "Reset password",
        forgotDesc: "Enter your email and we'll send you a link to reset your password.",
        sendReset: "Send reset link",
        resetSent: "Check your email!",
        resetSentDesc: "We've sent you a link to reset your password.",
        backToLogin: "Back to login",
      };

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/");
    });
  }, [navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: displayName || email },
          },
        });
        if (error) throw error;
        toast.success(t.signupSuccess);
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t.loginSuccess);
        navigate(-1);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />

      <div className="flex items-center justify-center px-6 py-12">
        <div className="bg-card rounded-2xl p-8 max-w-md w-full shadow-elevated border border-border">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors font-body"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-headline text-2xl font-bold text-headline mb-2">
              {isSignUp ? t.signupTitle : t.loginTitle}
            </h1>
            <p className="text-sm text-muted-foreground font-body">
              {isSignUp ? t.signupDesc : t.loginDesc}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="text-sm font-subhead font-medium text-foreground mb-1.5 block">
                  {t.name}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface-subtle border border-border rounded-xl font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                    placeholder="Ola Nordmann"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-subhead font-medium text-foreground mb-1.5 block">
                {t.email}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-surface-subtle border border-border rounded-xl font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                  placeholder="din@epost.no"
                />
              </div>
            </div>

            {!isSignUp && !forgotMode && (
              <div className="text-right mt-1">
                <button
                  type="button"
                  onClick={() => setForgotMode(true)}
                  className="text-xs text-muted-foreground hover:text-accent transition-colors font-body"
                >
                  {t.forgotPassword}
                </button>
              </div>
            )}

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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? t.loading : isSignUp ? t.signupBtn : t.loginBtn}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-body"
            >
              {isSignUp ? t.switchToLogin : t.switchToSignup}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
