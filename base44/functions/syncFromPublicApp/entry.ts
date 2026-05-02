import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Source public app ID - update with the public app ID
const SOURCE_APP_ID = 'UPDATE_WITH_PUBLIC_APP_ID';

// All 11 entities to sync
const ENTITIES_TO_SYNC = [
  'PublicOrder',
  'CustomerAccount',
  'MarketInputs',
  'CattleLot',
  'WeeklyPlaybook',
  'TrustA',
  'TrustB',
  'TrustC',
  'TrustD',
  'TrustE',
  'BusinessTrust',
  'User'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (!SOURCE_APP_ID || SOURCE_APP_ID === 'UPDATE_WITH_PUBLIC_APP_ID') {
      return Response.json({ error: 'SOURCE_APP_ID not configured' }, { status: 500 });
    }

    const syncResults = {};

    // Fetch all entities from this app
    for (const entityName of ENTITIES_TO_SYNC) {
      try {
        const records = await base44.entities[entityName].list();
        syncResults[entityName] = {
          status: 'syncing',
          count: records.length,
          records
        };
      } catch (error) {
        syncResults[entityName] = {
          status: 'error',
          error: error.message
        };
      }
    }

    // Call function in source (public) app to receive this sync
    try {
      const sourceResponse = await base44.functions.invoke('receiveAdminSyncFromSourceApp', {
        syncData: syncResults,
        sourceAppId: Deno.env.get('BASE44_APP_ID'),
        timestamp: new Date().toISOString()
      });

      return Response.json({
        status: 'success',
        message: 'Admin sync pushed to public app',
        sourceApp: Deno.env.get('BASE44_APP_ID'),
        publicApp: SOURCE_APP_ID,
        syncResults,
        publicAppResponse: sourceResponse?.data
      });
    } catch (invokeError) {
      return Response.json({
        status: 'partial',
        message: 'Data fetched but public app sync failed',
        syncResults,
        error: invokeError.message
      });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});