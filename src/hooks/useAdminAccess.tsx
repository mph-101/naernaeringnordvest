import { useAuth, type AppRole } from "./useAuth";

const STAFF_ROLES: AppRole[] = ["admin", "editor", "journalist"];

export function useAdminAccess() {
  const { loading, roles, isAuthenticated, isStaff } = useAuth();
  const staffRole = roles.find((r) => STAFF_ROLES.includes(r)) ?? null;

  return {
    loading,
    isAuthenticated,
    hasAccess: isStaff,
    role: staffRole,
  };
}
