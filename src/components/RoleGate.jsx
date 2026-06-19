import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { isFullAccess, canAccessPage } from '@/lib/accessControl';
import { AlertCircle } from 'lucide-react';

/**
 * RoleGate — 3-tier access enforcement.
 *
 * Tier 1 (super_admin / Jeff / Lane / Scott): always passes through.
 * Tier 2 (division admin): passes if the current route is in their section's pages,
 *         OR if their role is in the requiredRole list.
 * Tier 3 (employee): passes if their role is in requiredRole list,
 *         OR if the current route is in their EMPLOYEE_ROLE_PAGES list.
 *
 * Using `requiredRole` is optional when wrapping entire pages —
 * canAccessPage handles the full 3-tier check by current pathname.
 */
export default function RoleGate({
  requiredRole,
  children,
  fallback = null,
}) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return fallback || (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-danger mx-auto mb-2" />
          <div className="text-foreground font-medium">Authentication Required</div>
          <div className="text-sm text-muted-foreground">Please log in to access this page</div>
        </div>
      </div>
    );
  }

  // Tier 1: super admins always get through
  if (isFullAccess(user)) return children;

  // Check 1: can user access this route? (handles Tier 2 + Tier 3 via page lists)
  const routeAllowed = canAccessPage(user, location.pathname);

  // Check 2: if a requiredRole array is provided, also honor that directly
  let roleAllowed = false;
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    roleAllowed = roles.includes(user.role);
  }

  const isAuthorized = routeAllowed || roleAllowed;

  if (!isAuthorized) {
    return fallback || (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
          <div className="text-foreground font-bebas text-xl mb-1">Access Restricted</div>
          <div className="text-sm text-muted-foreground">
            Your role <span className="text-foreground font-medium">({user.role?.replace(/_/g, ' ')})</span> does not
            have access to this section. Contact your division admin or a super admin to request access.
          </div>
        </div>
      </div>
    );
  }

  return children;
}