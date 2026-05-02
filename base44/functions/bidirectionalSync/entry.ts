import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Configure app IDs
const ADMIN_APP_ID = Deno.env.get('BASE44_APP_ID'); // Current app
const PUBLIC_APP_ID = 'UPDATE_WITH_PUBLIC_APP_ID'; // Set this

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (!PUBLIC_APP_ID || PUBLIC_APP_ID === 'UPDATE_WITH_PUBLIC_APP_ID') {
      return Response.json({ error: 'PUBLIC_APP_ID not configured' }, { status: 500 });
    }

    const { direction = 'both' } = await req.json();

    const syncLog = {
      timestamp: new Date().toISOString(),
      adminAppId: ADMIN_APP_ID,
      publicAppId: PUBLIC_APP_ID,
      directions: {}
    };

    // Sync TO public
    if (direction === 'both' || direction === 'to_public') {
      try {
        const adminToPublicResult = await base44.functions.invoke('syncToPublicApp', {});
        syncLog.directions.to_public = adminToPublicResult?.data || { status: 'invoked' };
      } catch (error) {
        syncLog.directions.to_public = { status: 'error', error: error.message };
      }
    }

    // Sync FROM public
    if (direction === 'both' || direction === 'from_public') {
      try {
        const publicToAdminResult = await base44.functions.invoke('syncFromPublicApp', {});
        syncLog.directions.from_public = publicToAdminResult?.data || { status: 'invoked' };
      } catch (error) {
        syncLog.directions.from_public = { status: 'error', error: error.message };
      }
    }

    return Response.json({
      status: 'success',
      message: 'Bidirectional sync orchestrated',
      syncLog
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});