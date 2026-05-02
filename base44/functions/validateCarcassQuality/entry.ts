import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { carcassOutcomeId } = await req.json();

    // Fetch the carcass outcome record
    const outcome = await base44.entities.CarcassOutcomeActual.get(carcassOutcomeId);
    if (!outcome) {
      return Response.json({ error: 'Carcass outcome not found' }, { status: 404 });
    }

    // Get matching benchmark for plant type
    const benchmarks = await base44.entities.CarcassQualityBenchmark.filter({
      plant_type: outcome.plant_type
    });
    const benchmark = benchmarks?.[0];

    if (!benchmark) {
      return Response.json({ error: 'No benchmark found for plant type' }, { status: 404 });
    }

    // Calculate actual percentages
    const totalHead = outcome.head_count || 1;
    const actualPrimePercent = (outcome.prime_count / totalHead) * 100;
    const actualChoicePercent = (outcome.choice_count / totalHead) * 100;
    const actualSelectPercent = (outcome.select_count / totalHead) * 100;
    const actualYG2Percent = (outcome.yg2_count / totalHead) * 100;
    const actualYG3Percent = (outcome.yg3_count / totalHead) * 100;
    const actualYG4Percent = (outcome.yg4_count / totalHead) * 100;

    // Define tolerance bands (±5% for marbling, ±3% for yield grades)
    const toleranceMarblingPercent = 5;
    const toleranceYieldPercent = 3;

    // Check grading variance
    const primeVariance = Math.abs(actualPrimePercent - benchmark.prime_percent);
    const choiceVariance = Math.abs(actualChoicePercent - benchmark.choice_percent);
    const selectVariance = Math.abs(actualSelectPercent - benchmark.select_percent);
    const yg2Variance = Math.abs(actualYG2Percent - benchmark.yg2_percent);
    const yg3Variance = Math.abs(actualYG3Percent - benchmark.yg3_percent);
    const yg4Variance = Math.abs(actualYG4Percent - benchmark.yg4_percent);

    // Flag out-of-range outcomes
    const riskFlags = [];
    if (primeVariance > toleranceMarblingPercent) {
      riskFlags.push({
        metric: 'Prime Grade',
        actual: actualPrimePercent.toFixed(1),
        expected: benchmark.prime_percent,
        variance: primeVariance.toFixed(1),
        severity: primeVariance > 10 ? 'high' : 'medium'
      });
    }
    if (selectVariance > toleranceMarblingPercent) {
      riskFlags.push({
        metric: 'Select Grade',
        actual: actualSelectPercent.toFixed(1),
        expected: benchmark.select_percent,
        variance: selectVariance.toFixed(1),
        severity: selectVariance > 10 ? 'high' : 'medium'
      });
    }
    if (yg4Variance > toleranceYieldPercent) {
      riskFlags.push({
        metric: 'Yield Grade 4',
        actual: actualYG4Percent.toFixed(1),
        expected: benchmark.yg4_percent,
        variance: yg4Variance.toFixed(1),
        severity: yg4Variance > 5 ? 'high' : 'medium'
      });
    }

    // Trim loss assessment
    const trimLossVariance = Math.abs((outcome.avg_trim_loss_percent || 0) - benchmark.trim_loss_percent);
    if (trimLossVariance > 1.5) {
      riskFlags.push({
        metric: 'Trim Loss %',
        actual: (outcome.avg_trim_loss_percent || 0).toFixed(1),
        expected: benchmark.trim_loss_percent.toFixed(1),
        variance: trimLossVariance.toFixed(1),
        severity: trimLossVariance > 3 ? 'high' : 'medium'
      });
    }

    // Determine overall variance status
    let varianceStatus = 'within_range';
    if (riskFlags.some(f => f.severity === 'high')) {
      varianceStatus = 'below_expected';
    } else if (riskFlags.length > 0) {
      varianceStatus = 'below_expected';
    } else if (actualPrimePercent > benchmark.prime_percent + 3 || actualChoicePercent > benchmark.choice_percent + 3) {
      varianceStatus = 'above_expected';
    }

    // Update the carcass outcome record with validation results
    await base44.entities.CarcassOutcomeActual.update(carcassOutcomeId, {
      variance_vs_benchmark: varianceStatus,
      risk_flag: riskFlags.length > 0
    });

    // Calculate estimated margin impact
    const estimatedMarginImpact = calculateMarginImpact(
      actualPrimePercent,
      actualChoicePercent,
      actualSelectPercent,
      benchmark
    );

    return Response.json({
      status: varianceStatus,
      riskFlag: riskFlags.length > 0,
      riskDetails: riskFlags,
      marginImpact: estimatedMarginImpact,
      recommendation: generateRecommendation(outcome, varianceStatus, riskFlags)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateMarginImpact(primePercent, choicePercent, selectPercent, benchmark) {
  // Simplified: Prime $30/cwt premium over Choice, Choice $5/cwt over Select
  const primePremium = 30;
  const choicePremium = 5;

  const expectedValue = (benchmark.prime_percent * primePremium) + (benchmark.choice_percent * choicePremium);
  const actualValue = (primePercent * primePremium) + (choicePercent * choicePremium);

  return {
    expectedPremiumPerCwt: expectedValue.toFixed(2),
    actualPremiumPerCwt: actualValue.toFixed(2),
    lossPerCwt: (expectedValue - actualValue).toFixed(2)
  };
}

function generateRecommendation(outcome, status, flags) {
  if (status === 'above_expected') {
    return `Strong grading outcome. Consider premium plant for future placements. High Choice/Prime capture.`;
  }
  if (flags.some(f => f.metric === 'Yield Grade 4' && f.severity === 'high')) {
    return `Excessive YG 4 incidence. Reduce fat thickness at placement. Review breed composition vs. ${outcome.plant_type} suitability.`;
  }
  if (flags.some(f => f.metric === 'Select Grade' && f.severity === 'high')) {
    return `High Select %. Improve marbling (genetics/nutrition). Consider feeding longer or switching plant type.`;
  }
  if (flags.some(f => f.metric === 'Trim Loss %')) {
    return `Excessive trim loss. Review carcass weight and fat thickness. Match cattle traits to ${outcome.plant_type} capabilities.`;
  }
  return 'Results within expected range.';
}