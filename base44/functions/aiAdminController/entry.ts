/**
 * AI Admin Controller
 * Autonomously manages, updates, and fixes platform like an admin
 * Can create, update, delete, and sync data without manual intervention
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function reconcileMarketData(base44) {
  const actions = [];
  
  try {
    // Get latest market inputs
    const markets = await base44.asServiceRole.entities.MarketInputs.list('-date', 5);
    
    if (markets.length === 0) {
      actions.push({
        type: 'market_data_init',
        status: 'skipped',
        reason: 'No market data to reconcile',
      });
      return actions;
    }

    const latest = markets[0];
    const today = new Date().toISOString().split('T')[0];

    // Auto-create daily market record if missing
    const todayExists = markets.some(m => m.date === today);
    
    if (!todayExists && latest.date !== today) {
      await base44.asServiceRole.entities.MarketInputs.create({
        date: today,
        lc_futures: latest.lc_futures,
        gf_futures: latest.gf_futures,
        corn_price: latest.corn_price,
        sbm_price: latest.sbm_price,
        choice_cutout: latest.choice_cutout,
        select_cutout: latest.select_cutout,
        trim_90s: latest.trim_90s,
        basis_southern_plains: latest.basis_southern_plains,
        notes: 'Auto-created by AI Admin Controller',
      });

      actions.push({
        type: 'market_data_create',
        date: today,
        status: 'completed',
      });
    }
  } catch (error) {
    actions.push({
      type: 'market_data_reconcile',
      status: 'error',
      error: error.message,
    });
  }

  return actions;
}

async function syncCattleLotsStatus(base44) {
  const actions = [];

  try {
    // Find lots that should be archived/updated based on rules
    const allLots = await base44.asServiceRole.entities.CattleLot.list('-created_date', 100);

    for (const lot of allLots) {
      if (lot.status === 'active' && lot.current_weight >= (lot.target_weight || 0)) {
        // Ready for sale - flag for admin review
        actions.push({
          type: 'lot_ready_for_sale',
          lotId: lot.lot_id,
          headCount: lot.head_count,
          currentWeight: lot.current_weight,
          targetWeight: lot.target_weight,
          status: 'flagged_for_review',
        });
      }

      // Auto-update lot notes with current status summary
      if (lot.status === 'active') {
        const gainPotential = (lot.target_weight - lot.current_weight) || 0;
        await base44.asServiceRole.entities.CattleLot.update(lot.id, {
          notes: `${lot.notes || ''} | AI: ${gainPotential}lb gain potential | Last AI check: ${new Date().toLocaleString()}`,
        });
      }
    }
  } catch (error) {
    actions.push({
      type: 'sync_cattle_lots',
      status: 'error',
      error: error.message,
    });
  }

  return actions;
}

async function processApprovals(base44) {
  const actions = [];

  try {
    // Auto-approve low-risk orders
    const orders = await base44.asServiceRole.entities.PublicOrder.list('-created_date', 50);
    
    for (const order of orders) {
      if (order.status === 'pending') {
        // Auto-approve if all required fields present and reasonable
        if (order.customer_email && order.customer_name && order.head_count) {
          if (order.head_count > 0 && order.head_count < 5000) {
            // Within reasonable range - auto-approve
            await base44.asServiceRole.entities.PublicOrder.update(order.id, {
              status: 'approved',
              reviewed_by: 'AI Admin Controller',
              reviewed_date: new Date().toISOString().split('T')[0],
              internal_notes: 'Auto-approved by AI - valid data',
            });

            actions.push({
              type: 'order_approved',
              orderId: order.id,
              orderType: order.order_type,
              status: 'auto_approved',
            });
          }
        }
      }
    }

    // Same for customer accounts
    const accounts = await base44.asServiceRole.entities.CustomerAccount.list('-created_date', 50);
    
    for (const account of accounts) {
      if (account.status === 'pending') {
        if (account.email && account.full_name && account.account_type) {
          // Auto-approve low-risk accounts
          await base44.asServiceRole.entities.CustomerAccount.update(account.id, {
            status: 'approved',
            reviewed_by: 'AI Admin Controller',
            reviewed_date: new Date().toISOString().split('T')[0],
          });

          actions.push({
            type: 'account_approved',
            accountId: account.id,
            name: account.full_name,
            status: 'auto_approved',
          });
        }
      }
    }
  } catch (error) {
    actions.push({
      type: 'process_approvals',
      status: 'error',
      error: error.message,
    });
  }

  return actions;
}

async function cleanupAndOptimize(base44) {
  const actions = [];

  try {
    // Archive completed deals older than 180 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 180);

    const deals = await base44.asServiceRole.entities.DealCalculator.list('-created_date', 100);
    let archivedCount = 0;

    for (const deal of deals) {
      const dealDate = new Date(deal.created_date);
      if (dealDate < cutoffDate) {
        // Archive by updating status
        await base44.asServiceRole.entities.DealCalculator.update(deal.id, {
          notes: `${deal.notes || ''} | Archived by AI: ${new Date().toLocaleString()}`,
        });
        archivedCount++;
      }
    }

    if (archivedCount > 0) {
      actions.push({
        type: 'archive_old_deals',
        dealsArchived: archivedCount,
        status: 'completed',
      });
    }

    // Clean up duplicate or invalid data
    const lots = await base44.asServiceRole.entities.CattleLot.list('-created_date', 100);
    const seenIds = new Set();
    let duplicatesFound = 0;

    for (const lot of lots) {
      if (seenIds.has(lot.lot_id)) {
        duplicatesFound++;
        // Flag duplicate for admin
        actions.push({
          type: 'duplicate_lot_detected',
          lotId: lot.id,
          status: 'flagged',
        });
      }
      seenIds.add(lot.lot_id);
    }
  } catch (error) {
    actions.push({
      type: 'cleanup_optimize',
      status: 'error',
      error: error.message,
    });
  }

  return actions;
}

async function generateAdminReport(base44) {
  const report = {
    timestamp: new Date().toISOString(),
    executedBy: 'AI Admin Controller',
    actions: [],
    summary: {
      totalActionsExecuted: 0,
      successCount: 0,
      errorCount: 0,
      flaggedItems: 0,
    },
  };

  try {
    // Execute all admin tasks in parallel
    const [
      marketActions,
      cattleActions,
      approvalActions,
      cleanupActions,
    ] = await Promise.all([
      reconcileMarketData(base44),
      syncCattleLotsStatus(base44),
      processApprovals(base44),
      cleanupAndOptimize(base44),
    ]);

    report.actions = [
      ...marketActions,
      ...cattleActions,
      ...approvalActions,
      ...cleanupActions,
    ];

    // Count results
    report.summary.totalActionsExecuted = report.actions.length;
    report.summary.successCount = report.actions.filter(a => a.status === 'completed' || a.status === 'auto_approved').length;
    report.summary.errorCount = report.actions.filter(a => a.status === 'error').length;
    report.summary.flaggedItems = report.actions.filter(a => a.status === 'flagged' || a.status === 'flagged_for_review').length;

    console.log('[AI ADMIN] Report:', {
      executed: report.summary.totalActionsExecuted,
      success: report.summary.successCount,
      errors: report.summary.errorCount,
      flagged: report.summary.flaggedItems,
    });
  } catch (error) {
    console.error('[AI ADMIN] Fatal error:', error.message);
    report.error = error.message;
  }

  return report;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const startTime = Date.now();
    const report = await generateAdminReport(base44);

    return Response.json({
      ...report,
      executionTime: Date.now() - startTime,
      nextExecution: new Date(Date.now() + 15 * 60000).toISOString(),
    });
  } catch (error) {
    console.error('[AI ADMIN] Fatal error:', error.message);
    return Response.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error.message,
    }, { status: 500 });
  }
});