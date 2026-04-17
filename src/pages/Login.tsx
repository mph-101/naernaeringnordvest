import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Header } from "@/components/Header";
import { useTheme } from "@/hooks/useTheme";
import { Mail, Lock, ArrowLeft, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

const Login = () => {
  const navigate = useNavigate();
  const { language } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
        orContinueWith: "eller fortsett med",
        google: "Google",
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
        orContinueWith: "or continue with",
        google: "Google",
      };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/");
    });
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error instanceof Error ? result.error.message : "Google login failed");
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      toast.success(t.loginSuccess);
      navigate("/");
    } catch (e: any) {
      toast.error(e.message || "Google login failed");
      setGoogleLoading(false);
    }
  };

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
          email, password,
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
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors font-body">
            <ArrowLeft className="w-4 h-4" /> {t.back}
          </button>

          <div className="mb-8">
            <h1 className="font-headline text-2xl font-bold text-headline mb-2">
              {forgotMode ? (resetSent ? t.resetSent : t.forgotTitle) : isSignUp ? t.signupTitle : t.loginTitle}
            </h1>
            <p className="text-sm text-muted-foreground font-body">
              {forgotMode ? (resetSent ? t.resetSentDesc : t.forgotDesc) : isSignUp ? t.signupDesc : t.loginDesc}
            </p>
          </div>

          {forgotMode && resetSent ? (
            <div className="text-center">
              <button onClick={() => { setForgotMode(false); setResetSent(false); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-body">
                {t.backToLogin}
              </button>
            </div>
          ) : forgotMode ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-sm font-subhead font-medium text-foreground mb-1.5 block">{t.email}</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-10 pr-4 py-3 bg-surface-subtle border border-border rounded-xl font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all" placeholder="din@epost.no" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft disabled:opacity-50 flex items-center justify-center gap-2 mt-6">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? t.loading : t.sendReset}
              </button>
              <div className="text-center mt-4">
                <button type="button" onClick={() => setForgotMode(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-body">{t.backToLogin}</button>
              </div>
            </form>
          ) : (
            <>
              {/* Google button */}
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3 bg-background border border-border rounded-xl font-subhead text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 mb-6"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                {t.google}
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-body">{t.orContinueWith}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="text-sm font-subhead font-medium text-foreground mb-1.5 block">{t.name}</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-surface-subtle border border-border rounded-xl font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all" placeholder="Ola Nordmann" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-subhead font-medium text-foreground mb-1.5 block">{t.email}</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-10 pr-4 py-3 bg-surface-subtle border border-border rounded-xl font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all" placeholder="din@epost.no" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-subhead font-medium text-foreground mb-1.5 block">{t.password}</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full pl-10 pr-4 py-3 bg-surface-subtle border border-border rounded-xl font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all" placeholder="••••••••" />
                  </div>
                </div>
                {!isSignUp && (
                  <div className="text-right">
                    <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-muted-foreground hover:text-accent transition-colors font-body">{t.forgotPassword}</button>
                  </div>
                )}
                <button type="submit" disabled={loading} className="w-full py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft disabled:opacity-50 flex items-center justify-center gap-2 mt-6">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? t.loading : isSignUp ? t.signupBtn : t.loginBtn}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-body">
                  {isSignUp ? t.switchToLogin : t.switchToSignup}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
