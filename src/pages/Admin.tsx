import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

const Admin = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasRole, setHasRole] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          // Check if user has admin/editor/journalist role
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id);
          
          setHasRole(roles && roles.length > 0);
        } else {
          setHasRole(false);
        }
        setLoading(false);
      }
    );

    // Then get current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        
        setHasRole(roles && roles.length > 0);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logget ut",
      description: "Du er nå logget ut.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <AdminLogin />;
  }

  if (!hasRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl p-8 max-w-md w-full text-center shadow-elevated">
          <h1 className="font-headline text-2xl font-semibold text-headline mb-4">
            Ingen tilgang
          </h1>
          <p className="text-muted-foreground font-body mb-6">
            Du har ikke tilgang til admin-panelet. Kontakt en administrator for å få tildelt en rolle.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors"
            >
              Logg ut
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Tilbake til forsiden
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboard session={session} onLogout={handleLogout} />;
};

export default Admin;
