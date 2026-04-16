import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  userId: string | null;
  email: string | null;
  roles: AppRole[];
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  isStaff: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Provider that exposes session + roles to the entire app.
 *
 * Implementation notes:
 * - We register `onAuthStateChange` BEFORE `getSession` to avoid missing events.
 * - The auth callback is kept synchronous; any Supabase calls (e.g. fetching
 *   roles) are deferred via `setTimeout(..., 0)` to avoid the well-known
 *   Supabase deadlock when calling supabase.* from inside the callback.
 * - Roles are fetched from the `user_roles` table, never derived from
 *   client-only state — this matches the project's RLS-based RBAC model.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (userId: string): Promise<AppRole[]> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) {
      console.error("useAuth: failed to load roles", error);
      return [];
    }
    return (data ?? []).map((r) => r.role as AppRole);
  };

  useEffect(() => {
    let mounted = true;

    // 1) Listener FIRST — keep callback synchronous, defer async work
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      const uid = newSession?.user?.id;
      if (uid) {
        // Defer to next tick to avoid Supabase auth deadlock
        setTimeout(async () => {
          if (!mounted) return;
          const r = await fetchRoles(uid);
          if (mounted) setRoles(r);
        }, 0);
      } else {
        setRoles([]);
      }
    });

    // 2) Then fetch the existing session
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user?.id) {
        const r = await fetchRoles(data.session.user.id);
        if (mounted) setRoles(r);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;
    return {
      session,
      user,
      userId: user?.id ?? null,
      email: user?.email ?? null,
      roles,
      loading,
      isAuthenticated: !!user,
      hasRole: (role) => roles.includes(role),
      hasAnyRole: (rs) => rs.some((r) => roles.includes(r)),
      isStaff: roles.some((r) => r === "admin" || r === "editor" || r === "journalist"),
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshRoles: async () => {
        if (!session?.user?.id) return;
        const r = await fetchRoles(session.user.id);
        setRoles(r);
      },
    };
  }, [session, roles, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Access the current auth state. Must be used inside `<AuthProvider>`.
 *
 * @example
 * const { userId, isAuthenticated, hasRole, signOut } = useAuth();
 * if (!isAuthenticated) return <LoginPrompt />;
 * if (hasRole("admin")) return <AdminPanel />;
 */
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
};
