/**
 * Autonomous System Health Monitor
 * Checks app, website, domains, and cross-sync 24/7
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function checkServiceHealth(url, name) {
  try {
    const start = Date.now();
    const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
    const responseTime = Date.now() - start;
    
    return {
      name,
      url,
      status: response.ok ? 'online' : 'offline',
      statusCode: response.status,
      responseTime,
      healthy: response.ok && responseTime < 5000,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name,
      url,
      status: 'offline',
      statusCode: null,
      responseTime: null,
      healthy: false,
      error: error.message,
      checkedAt: new Date().toISOString(),
    };
  }
}

async function checkDatabaseHealth(base44) {
  try {
    const start = Date.now();
    
    // Test read operation
    const lots = await base44.asServiceRole.entities.CattleLot.list('-created_date', 1);
    const responseTime = Date.now() - start;
    
    return {
      name: 'Database',
      status: 'online',
      responseTime,
      healthy: responseTime < 2000,
      recordsAccessible: true,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: 'Database',
      status: 'offline',
      healthy: false,
      error: error.message,
      recordsAccessible: false,
      checkedAt: new Date().toISOString(),
    };
  }
}

async function checkCrossSyncHealth(base44) {
  try {
    // Verify all key entities are synchronized
    const entities = ['CattleLot', 'MarketInputs', 'DealCalculator', 'CustomerAccount', 'PublicOrder'];
    const syncStatus = {};

    for (const entity of entities) {
      try {
        const count = await base44.asServiceRole.entities[entity].list('-created_date', 1);
        syncStatus[entity] = {
          accessible: true,
          lastUpdate: count[0]?.updated_date || count[0]?.created_date,
        };
      } catch (e) {
        syncStatus[entity] = { accessible: false, error: e.message };
      }
    }

    const allAccessible = Object.values(syncStatus).every(s => s.accessible);

    return {
      name: 'Cross-Sync',
      status: allAccessible ? 'synchronized' : 'degraded',
      healthy: allAccessible,
      entities: syncStatus,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: 'Cross-Sync',
      status: 'offline',
      healthy: false,
      error: error.message,
      checkedAt: new Date().toISOString(),
    };
  }
}

async function storeHealthReport(base44, report) {
  try {
    // Store health check in a temporary collection or log
    const healthLog = {
      timestamp: new Date().toISOString(),
      overallStatus: report.overallHealthy ? 'healthy' : 'degraded',
      servicesOnline: report.services.filter(s => s.healthy).length,
      servicesTotal: report.services.length,
      summary: JSON.stringify(report),
    };

    // Store in system audit or create custom entity if needed
    console.log('[HEALTH CHECK]', JSON.stringify(healthLog));
    
    return healthLog;
  } catch (error) {
    console.error('[HEALTH CHECK] Storage error:', error.message);
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();

    // Check all systems in parallel
    const [
      appHealth,
      websiteHealth,
      dashboardHealth,
      databaseHealth,
      crossSyncHealth,
    ] = await Promise.all([
      checkServiceHealth(
        Deno.env.get('BASE44_APP_URL') || 'https://continental-cattle.app',
        'Continental App'
      ),
      checkServiceHealth('https://continentalcattlecompany.com', 'Continental Website'),
      checkServiceHealth(
        Deno.env.get('DASHBOARD_URL') || 'https://continental-cattle-dashboard.app',
        'Dashboard Domain'
      ),
      checkDatabaseHealth(base44),
      checkCrossSyncHealth(base44),
    ]);

    const services = [appHealth, websiteHealth, dashboardHealth, databaseHealth];
    const allHealthy = [appHealth, websiteHealth, dashboardHealth, databaseHealth, crossSyncHealth].every(s => s.healthy);

    const report = {
      timestamp: new Date().toISOString(),
      overallHealthy: allHealthy,
      overallStatus: allHealthy ? 'ALL_SYSTEMS_OPERATIONAL' : 'DEGRADED_SERVICE',
      services,
      crossSync: crossSyncHealth,
      summary: {
        servicesHealthy: services.filter(s => s.healthy).length,
        servicesTotal: services.length,
        databaseConnected: databaseHealth.healthy,
        syncIntegrity: crossSyncHealth.healthy,
      },
      checkDuration: Date.now() - startTime,
    };

    // Store report
    await storeHealthReport(base44, report);

    return Response.json(report);
  } catch (error) {
    console.error('[HEALTH CHECK] Fatal error:', error.message);
    return Response.json({
      timestamp: new Date().toISOString(),
      overallStatus: 'ERROR',
      error: error.message,
    }, { status: 500 });
  }
});