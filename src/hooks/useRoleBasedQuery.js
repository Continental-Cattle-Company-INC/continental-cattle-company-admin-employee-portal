import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

export function useRoleBasedQuery(entityName, options = {}) {
  const { user } = useAuth();
  const { requiredRoles = ['admin'], ...queryOptions } = options;

  return useQuery({
    queryKey: [entityName, user?.role],
    queryFn: async () => {
      // Check if user has required role
      if (!user || !requiredRoles.includes(user.role)) {
        return [];
      }
      // Execute query only if authorized
      return base44.entities[entityName].list(...(queryOptions.args || []));
    },
    enabled: !!(user && requiredRoles.includes(user.role)),
    ...queryOptions,
  });
}