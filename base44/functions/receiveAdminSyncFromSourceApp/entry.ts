import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function processSyncData(base44, syncData, sourceAppId, timestamp) {
  if (!syncData) {
    throw new Error('No sync data provided');
  }

  const results = {};

  // Process each entity's records
  for (const [entityName, entityData] of Object.entries(syncData)) {
    try {
      if (entityData.status === 'error') {
        results[entityName] = { status: 'skipped', reason: entityData.error };
        continue;
      }

      const records = entityData.records || [];
      let upsertCount = 0;

      // Upsert each record (create or update)
      for (const record of records) {
        try {
          // Check if record exists
          try {
            const existing = await base44.asServiceRole.entities[entityName].get(record.id);
            // Update
            await base44.asServiceRole.entities[entityName].update(record.id, record);
          } catch (getError) {
            // Record doesn't exist, create it
            await base44.asServiceRole.entities[entityName].create(record);
          }
          upsertCount++;
        } catch (upsertError) {
          console.error(`Failed to upsert ${entityName}:`, upsertError.message);
        }
      }

      results[entityName] = {
        status: 'success',
        synced: upsertCount,
        total: records.length
      };
    } catch (error) {
      results[entityName] = {
        status: 'error',
        error: error.message
      };
    }
  }

  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { syncData, sourceAppId, timestamp } = await req.json();

    const results = await processSyncData(base44, syncData, sourceAppId, timestamp);

    return Response.json({
      status: 'success',
      message: 'Public app received admin sync',
      sourceAppId,
      timestamp,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});