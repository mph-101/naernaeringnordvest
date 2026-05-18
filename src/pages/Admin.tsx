import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Forbidden } from "@/components/Forbidden";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";

const Admin = () => {
  const { session, loading, signOut } = useAuth();
  const { hasAccess } = useAdminAccess();

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

  if (!hasAccess) {
    return <Forbidden />;
  }

  return <AdminDashboard session={session} onLogout={signOut} />;
};

export default Admin;
