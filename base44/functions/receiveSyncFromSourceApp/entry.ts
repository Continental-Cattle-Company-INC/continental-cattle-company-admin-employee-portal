import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { syncData, sourceAppId, timestamp } = await req.json();

    if (!syncData) {
      return Response.json({ error: 'No sync data provided' }, { status: 400 });
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
            const existing = await base44.asServiceRole.entities[entityName].get(record.id);
            
            if (existing) {
              // Update
              await base44.asServiceRole.entities[entityName].update(record.id, record);
            }
            upsertCount++;
          } catch (getError) {
            // Record doesn't exist, create it
            try {
              await base44.asServiceRole.entities[entityName].create(record);
              upsertCount++;
            } catch (createError) {
              console.error(`Failed to create ${entityName}:`, createError.message);
            }
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

    return Response.json({
      status: 'success',
      message: 'Sync received and processed',
      sourceAppId,
      timestamp,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});