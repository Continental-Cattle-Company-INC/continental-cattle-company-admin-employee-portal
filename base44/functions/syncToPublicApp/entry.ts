import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Target app ID - update this with the second app's ID
const TARGET_APP_ID = 'UPDATE_WITH_TARGET_APP_ID';

// All 11 entities to sync
const ENTITIES_TO_SYNC = [
  'PublicOrder',
  'CustomerAccount',
  'MarketInputs',
  'CattleLot',
  'WeeklyPlaybook',
  // Add the 5 trusts + business trust entities here
  // 'Trust1',
  // 'Trust2',
  // 'Trust3',
  // 'Trust4',
  // 'Trust5',
  // 'BusinessTrust'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (!TARGET_APP_ID || TARGET_APP_ID === 'UPDATE_WITH_TARGET_APP_ID') {
      return Response.json({ error: 'TARGET_APP_ID not configured' }, { status: 500 });
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

    // Call function in target app to receive sync
    try {
      const targetResponse = await base44.functions.invoke('receiveSyncFromSourceApp', {
        syncData: syncResults,
        sourceAppId: Deno.env.get('BASE44_APP_ID'),
        timestamp: new Date().toISOString()
      });

      return Response.json({
        status: 'success',
        message: 'Sync completed',
        sourceApp: Deno.env.get('BASE44_APP_ID'),
        targetApp: TARGET_APP_ID,
        syncResults,
        targetResponse: targetResponse?.data
      });
    } catch (invokeError) {
      return Response.json({
        status: 'partial',
        message: 'Data fetched but target sync failed',
        syncResults,
        error: invokeError.message
      });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});