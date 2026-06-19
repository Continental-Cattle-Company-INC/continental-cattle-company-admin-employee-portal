import { useAuth } from '@/lib/AuthContext';
import { isFullAccess } from '@/lib/accessControl';
import { AlertCircle } from 'lucide-react';

/**
 * RoleGate — blocks rendering unless user has the required role.
 * Full-access users (super_admin + Lane/Scott/Jeff) always pass through.
 */
export default function RoleGate({ 
  requiredRole = 'admin', 
  children, 
  fallback = null 
}) {
  const { user } = useAuth();

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

  // Full-access principals always get through
  if (isFullAccess(user)) return children;

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const isAuthorized = roles.includes(user.role);

  if (!isAuthorized) {
    return fallback || (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-danger mx-auto mb-2" />
          <div className="text-foreground font-medium">Access Denied</div>
          <div className="text-sm text-muted-foreground">
            Your role ({user.role}) doesn't have access to this section.
          </div>
        </div>
      </div>
    );
  }

  return children;
}