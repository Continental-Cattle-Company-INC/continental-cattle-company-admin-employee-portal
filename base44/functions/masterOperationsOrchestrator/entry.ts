/**
 * Master Operations Orchestrator
 * AI-driven real-time monitoring, validation, and cross-sync controller
 * Runs every 2 minutes to ensure all data, projections, and operations stay perfectly in sync
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function fetchLatestMarketSnapshot(base44) {
  try {
    const inputs = await base44.asServiceRole.entities.MarketInputs.list('-date', 1);
    return inputs[0] || null;
  } catch (error) {
    console.error('[ORCHESTRATOR] Market snapshot fetch failed:', error.message);
    return null;
  }
}

async function validateROICalculations(base44, marketData) {
  try {
    if (!marketData) return { valid: false, issues: ['No market data available'] };

    const deals = await base44.asServiceRole.entities.DealCalculator.list('', 100);
    const issues = [];
    const corrections = [];

    for (const deal of deals) {
      // Validate expected profit calculation
      const expectedProfit = (
        (deal.slaughter_cutout_price - deal.buy_price_per_lb * 100) * 0.62 * (deal.target_weight / 100) -
        (deal.target_weight - deal.buy_weight) * deal.cost_of_gain -
        (deal.trucking_in + deal.trucking_out) -
        (deal.target_weight * deal.interest_rate / 36500 * deal.days_on_feed)
      ).toFixed(2);

      if (deal.expected_profit_per_head && Math.abs(expectedProfit - deal.expected_profit_per_head) > 5) {
        issues.push(`Deal ${deal.deal_name}: Profit mismatch ($${expectedProfit} vs $${deal.expected_profit_per_head})`);
        corrections.push({ entityId: deal.id, entityName: 'DealCalculator', field: 'expected_profit_per_head', newValue: parseFloat(expectedProfit) });
      }
    }

    return { valid: issues.length === 0, issues, corrections, checkedCount: deals.length };
  } catch (error) {
    console.error('[ORCHESTRATOR] ROI validation failed:', error.message);
    return { valid: false, issues: [`ROI validation error: ${error.message}`] };
  }
}

async function validateCattleProjections(base44, marketData) {
  try {
    if (!marketData) return { valid: false, issues: ['No market data for projections'] };

    const lots = await base44.asServiceRole.entities.CattleLot.list('', 100);
    const issues = [];

    for (const lot of lots) {
      if (lot.status !== 'active') continue;

      // Verify weight progression is realistic
      if (lot.target_weight && lot.purchase_weight) {
        const minDailyGain = (lot.target_weight - lot.purchase_weight) / (lot.target_weight > 900 ? 240 : 180);
        if (minDailyGain > 4 || minDailyGain < 1.5) {
          issues.push(`Lot ${lot.lot_id}: Unrealistic daily gain target (${minDailyGain.toFixed(2)} lbs/day)`);
        }
      }

      // Check yardage cost reasonableness
      if (lot.yardage && (lot.yardage < 0.25 || lot.yardage > 0.65)) {
        issues.push(`Lot ${lot.lot_id}: Yardage cost out of range ($${lot.yardage}/head/day)`);
      }
    }

    return { valid: issues.length === 0, issues, checkedCount: lots.length };
  } catch (error) {
    console.error('[ORCHESTRATOR] Projection validation failed:', error.message);
    return { valid: false, issues: [`Projection validation error: ${error.message}`] };
  }
}

async function validateCarcassQuality(base44) {
  try {
    const outcomes = await base44.asServiceRole.entities.CarcassOutcomeActual.list('-sale_date', 50);
    const benchmarks = await base44.asServiceRole.entities.CarcassQualityBenchmark.list('', 20);
    const issues = [];

    for (const outcome of outcomes) {
      if (!outcome.risk_flag) continue;

      const benchmark = benchmarks.find(b => b.plant_type === outcome.plant_type);
      if (!benchmark) {
        issues.push(`Outcome ${outcome.id}: Missing benchmark for plant type ${outcome.plant_type}`);
        continue;
      }

      const primeDeviation = Math.abs((outcome.prime_count / outcome.head_count) * 100 - benchmark.prime_percent);
      if (primeDeviation > 5) {
        issues.push(`Plant ${outcome.plant_name}: Prime % deviation ${primeDeviation.toFixed(1)}% from benchmark`);
      }
    }

    return { valid: issues.length === 0, issues, checkedCount: outcomes.length };
  } catch (error) {
    console.error('[ORCHESTRATOR] Carcass validation failed:', error.message);
    return { valid: false, issues: [`Carcass validation error: ${error.message}`] };
  }
}

async function validateDomainSync(base44) {
  try {
    const publicOrders = await base44.asServiceRole.entities.PublicOrder.list('', 100);
    const accounts = await base44.asServiceRole.entities.CustomerAccount.list('', 100);
    
    const issues = [];
    
    // Check for orphaned orders (no matching account)
    for (const order of publicOrders) {
      const hasAccount = accounts.some(a => a.email === order.customer_email);
      if (!hasAccount && order.status === 'approved') {
        issues.push(`Order ${order.id}: Approved but no matching customer account`);
      }
    }

    // Check for stale pending items
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    
    for (const acct of accounts) {
      if (acct.status === 'pending' && new Date(acct.created_date) < fiveDaysAgo) {
        issues.push(`Account ${acct.id}: Pending for >5 days (${acct.full_name})`);
      }
    }

    return { valid: issues.length === 0, issues, ordersChecked: publicOrders.length, accountsChecked: accounts.length };
  } catch (error) {
    console.error('[ORCHESTRATOR] Domain sync validation failed:', error.message);
    return { valid: false, issues: [`Domain sync error: ${error.message}`] };
  }
}

async function validateEntityFinancials(base44) {
  try {
    const entities = await base44.asServiceRole.entities.OperatingEntity.list('', 50);
    const issues = [];

    for (const ent of entities) {
      if (ent.status !== 'active') continue;

      // Validate annual = monthly * 12
      const calcAnnualRevenue = (ent.monthly_revenue || 0) * 12;
      if (ent.annual_revenue && Math.abs(calcAnnualRevenue - ent.annual_revenue) > ent.annual_revenue * 0.05) {
        issues.push(`Entity ${ent.entity_name}: Annual/monthly revenue mismatch`);
      }

      const calcAnnualExpenses = (ent.monthly_expenses || 0) * 12;
      if (ent.annual_expenses && Math.abs(calcAnnualExpenses - ent.annual_expenses) > ent.annual_expenses * 0.05) {
        issues.push(`Entity ${ent.entity_name}: Annual/monthly expense mismatch`);
      }

      // Check margin reasonableness
      if (ent.annual_revenue && ent.annual_expenses) {
        const margin = ((ent.annual_revenue - ent.annual_expenses) / ent.annual_revenue) * 100;
        if (margin < -50 || margin > 60) {
          issues.push(`Entity ${ent.entity_name}: Margin out of normal range (${margin.toFixed(1)}%)`);
        }
      }
    }

    return { valid: issues.length === 0, issues, checkedCount: entities.length };
  } catch (error) {
    console.error('[ORCHESTRATOR] Financials validation failed:', error.message);
    return { valid: false, issues: [`Financials validation error: ${error.message}`] };
  }
}

async function triggerCorrectiveActions(base44, corrections) {
  try {
    const results = [];

    for (const correction of corrections) {
      try {
        const entity = base44.asServiceRole.entities[correction.entityName];
        await entity.update(correction.entityId, { [correction.field]: correction.newValue });
        results.push({ action: 'corrected', entity: correction.entityName, field: correction.field });
      } catch (err) {
        results.push({ action: 'failed', entity: correction.entityName, error: err.message });
      }
    }

    return results;
  } catch (error) {
    console.error('[ORCHESTRATOR] Corrective action failed:', error.message);
    return [];
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('[ORCHESTRATOR] Starting comprehensive system audit and sync...');
    const startTime = Date.now();

    const marketData = await fetchLatestMarketSnapshot(base44);
    const roiValidation = await validateROICalculations(base44, marketData);
    const projectionValidation = await validateCattleProjections(base44, marketData);
    const carcassValidation = await validateCarcassQuality(base44);
    const domainValidation = await validateDomainSync(base44);
    const financialValidation = await validateEntityFinancials(base44);

    // Collect all corrections
    const allCorrections = [
      ...(roiValidation.corrections || []),
    ];

    const corrections = await triggerCorrectiveActions(base44, allCorrections);

    const allValid = roiValidation.valid && projectionValidation.valid && carcassValidation.valid && domainValidation.valid && financialValidation.valid;
    const allIssues = [
      ...roiValidation.issues,
      ...projectionValidation.issues,
      ...carcassValidation.issues,
      ...domainValidation.issues,
      ...financialValidation.issues,
    ];

    const auditDuration = Date.now() - startTime;

    console.log(`[ORCHESTRATOR] Audit complete: ${allValid ? 'HEALTHY' : 'ISSUES DETECTED'} (${auditDuration}ms)`);

    return Response.json({
      status: allValid ? 'healthy' : 'issues_detected',
      timestamp: new Date().toISOString(),
      marketData: marketData ? { date: marketData.date, lc: marketData.lc_futures, choice: marketData.choice_cutout } : null,
      validations: {
        roi: { valid: roiValidation.valid, issues: roiValidation.issues, checked: roiValidation.checkedCount },
        projections: { valid: projectionValidation.valid, issues: projectionValidation.issues, checked: projectionValidation.checkedCount },
        carcass: { valid: carcassValidation.valid, issues: carcassValidation.issues, checked: carcassValidation.checkedCount },
        domainSync: { valid: domainValidation.valid, issues: domainValidation.issues },
        financials: { valid: financialValidation.valid, issues: financialValidation.issues, checked: financialValidation.checkedCount },
      },
      corrections: {
        attempted: corrections.length,
        results: corrections,
      },
      totalIssues: allIssues.length,
      issues: allIssues,
      auditDuration,
    });
  } catch (error) {
    console.error('[ORCHESTRATOR] Fatal error:', error.message);
    return Response.json({
      status: 'error',
      error: error.message,
    }, { status: 500 });
  }
});