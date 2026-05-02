import { useAuth } from '@/lib/AuthContext';
import { AlertCircle } from 'lucide-react';

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

  const isAuthorized = Array.isArray(requiredRole)
    ? requiredRole.includes(user.role)
    : user.role === requiredRole;

  if (!isAuthorized) {
    return fallback || (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-danger mx-auto mb-2" />
          <div className="text-foreground font-medium">Access Denied</div>
          <div className="text-sm text-muted-foreground">Your role ({user.role}) doesn't have access to this page</div>
        </div>
      </div>
    );
  }

  return children;
}