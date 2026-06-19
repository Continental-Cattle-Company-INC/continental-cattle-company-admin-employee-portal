/**
 * DETERMINISTIC FALLBACK ALGORITHMS
 * 
 * Replaces AI/ML with rule-based algorithms when:
 * - AI credits exhausted
 * - Internet unavailable
 * - Backend services down
 * 
 * Provides:
 * - Feed ration calculations (NRC-based)
 * - Economic projections (standard formulas)
 * - Health protocol recommendations (BQA guidelines)
 * - Route optimization (pre-calculated tables)
 */

import { getCattleLabel, isDairy, isBeefDairy, getPerformance } from './cattleConfig';
import { freightCostPerHead } from './truckingConfig';

/**
 * Calculate feed ration using NRC (National Research Council) equations
 * Fallback for AI feed planner
 */
export function calculateFeedRationNRC(cattleData, focus = 'balanced') {
  const {
    breed_type,
    sex,
    current_weight,
    target_weight,
    adg = 2.5,
  } = cattleData;
  
  const perf = getPerformance(breed_type, sex);
  const isDairyInfluence = isDairy(breed_type) || isBeefDairy(breed_type);
  
  // NRC-based DMI calculation
  const bodyWeight = current_weight || 700;
  const targetBodyWeight = target_weight || 1300;
  const avgWeight = (bodyWeight + targetBodyWeight) / 2;
  
  // DMI as % of body weight (NRC equations)
  let dmiPercent = 0.025; // Base 2.5%
  if (isDairyInfluence) dmiPercent += 0.005; // Dairy eat more
  if (adg > 3.0) dmiPercent += 0.003; // High ADG requires more intake
  
  const dmiLbs = Math.round(bodyWeight * dmiPercent);
  
  // Nutrient requirements (NRC)
  const tdnRequirement = isDairyInfluence ? 0.65 : 0.68; // TDN %
  const cpRequirement = isDairyInfluence ? 0.13 : 0.14; // Crude Protein %
  
  // Energy density needed for target ADG
  const ndfRequirement = 0.08; // Neutral Detergent Fiber minimum
  
  // Phase feeding (3 phases)
  const totalGain = targetBodyWeight - bodyWeight;
  const estimatedDOF = Math.round(totalGain / adg);
  
  const phase1Days = Math.round(estimatedDOF * 0.15); // 15% receiving
  const phase2Days = Math.round(estimatedDOF * 0.40); // 40% growing
  const phase3Days = estimatedDOF - phase1Days - phase2Days; // 45% finishing
  
  // Ration formulation per phase
  const phases = [
    {
      name: 'Receiving/Starter',
      days: phase1Days,
      dmi: Math.round(dmiLbs * 0.75), // Start at 75% intake
      tdn: 0.68,
      cp: 0.15,
      ingredients: [
        { name: 'Long-stem hay', percent: 0.60, lbs: Math.round(dmiLbs * 0.75 * 0.60) },
        { name: 'Corn (dry-rolled)', percent: 0.25, lbs: Math.round(dmiLbs * 0.75 * 0.25) },
        { name: 'Soybean meal', percent: 0.10, lbs: Math.round(dmiLbs * 0.75 * 0.10) },
        { name: 'Mineral/vitamin premix', percent: 0.05, lbs: Math.round(dmiLbs * 0.75 * 0.05) },
      ],
      additives: ['Ionophore (Rumensin)', 'Vitamin A', 'Calcium'],
      notes: 'Focus on rumen adaptation, stress recovery. Monitor for BRD.',
    },
    {
      name: 'Growing',
      days: phase2Days,
      dmi: Math.round(dmiLbs * 0.95),
      tdn: 0.75,
      cp: 0.13,
      ingredients: [
        { name: 'Corn (dry-rolled)', percent: 0.55, lbs: Math.round(dmiLbs * 0.95 * 0.55) },
        { name: 'Distillers grains', percent: 0.20, lbs: Math.round(dmiLbs * 0.95 * 0.20) },
        { name: 'Alfalfa hay', percent: 0.15, lbs: Math.round(dmiLbs * 0.95 * 0.15) },
        { name: 'Soybean meal', percent: 0.07, lbs: Math.round(dmiLbs * 0.95 * 0.07) },
        { name: 'Mineral/vitamin premix', percent: 0.03, lbs: Math.round(dmiLbs * 0.95 * 0.03) },
      ],
      additives: ['Ionophore (Rumensin/Bovatec)', 'Implant (if allowed)', 'Buffer'],
      notes: 'Transition to higher energy. Monitor frame development.',
    },
    {
      name: 'Finishing',
      days: phase3Days,
      dmi: Math.round(dmiLbs * 1.05),
      tdn: 0.85,
      cp: 0.11,
      ingredients: [
        { name: 'Corn (steam-flaked)', percent: 0.78, lbs: Math.round(dmiLbs * 1.05 * 0.78) },
        { name: 'Distillers grains', percent: 0.12, lbs: Math.round(dmiLbs * 1.05 * 0.12) },
        { name: 'Alfalfa hay', percent: 0.05, lbs: Math.round(dmiLbs * 1.05 * 0.05) },
        { name: 'Supplement', percent: 0.05, lbs: Math.round(dmiLbs * 1.05 * 0.05) },
      ],
      additives: ['Ionophore', 'Beta-agonist (last 28 days if grid allows)', 'Buffer', 'MGA (heifers)'],
      notes: 'Maximum energy density. Monitor for acidosis, liver abscesses.',
    },
  ];
  
  // Cost estimation (using average commodity prices)
  const commodityPrices = {
    corn: 4.50, // $/bu
    sbm: 340, // $/ton
    distillers: 150, // $/ton
    alfalfa: 220, // $/ton
    hay: 180, // $/ton
    supplement: 600, // $/ton
  };
  
  // Convert to $/ton
  const cornPerTon = commodityPrices.corn * 8.5; // 56 lbs/bu, 2000 lbs/ton
  
  const estimatedCostPerTon = 185; // Average ration cost
  const costPerHeadPerDay = (dmiLbs / 2000) * estimatedCostPerTon;
  const totalFeedCost = costPerHeadPerDay * estimatedDOF;
  
  return {
    ration_program: `NRC-BASED FEED RATION (Deterministic Fallback)

CATTLE: ${getCattleLabel(breed_type, sex)} | ${bodyWeight} lbs → ${targetBodyWeight} lbs | ADG: ${adg} lbs/day
BREED: ${isDairyInfluence ? 'Dairy influence (higher DMI, lower dressing)' : 'Beef (standard DMI)'} | Dressing: ${(perf.dressingPct * 100).toFixed(1)}%

NUTRIENT REQUIREMENTS (NRC):
- DMI: ${dmiLbs} lbs/day (${(dmiPercent * 100).toFixed(1)}% BW)
- TDN: ${(tdnRequirement * 100).toFixed(0)}%
- CP: ${(cpRequirement * 100).toFixed(0)}%
- NDF (min): ${(ndfRequirement * 100).toFixed(0)}%

PHASE FEEDING PROGRAM:
${phases.map((p, i) => `
PHASE ${i + 1} — ${p.name.toUpperCase()} (Days 1–${p.days})
DMI: ${p.dmi} lbs/hd/day | TDN: ${(p.tdn * 100).toFixed(0)}% | CP: ${(p.cp * 100).toFixed(0)}%
Ingredients (lbs/hd/day):
${p.ingredients.map(ing => `  • ${ing.name}: ${ing.lbs} lbs (${(ing.percent * 100).toFixed(0)}%)`).join('\n')}
Additives: ${p.additives.join(', ')}
Notes: ${p.notes}`).join('\n')}

ECONOMIC ESTIMATE:
- Feed cost: $${costPerHeadPerDay.toFixed(2)}/hd/day
- Total feed cost: $${totalFeedCost.toFixed(0)}/hd over ${estimatedDOF} days
- Average ration cost: $${estimatedCostPerTon}/ton

NOTE: Deterministic calculation using NRC equations. Generated during AI service unavailability.`,
    estimated_cost_per_head: Math.round(totalFeedCost),
    estimated_dof: estimatedDOF,
    _method: 'NRC deterministic',
  };
}

/**
 * Calculate economic projection using standard formulas
 * Fallback for AI economic analysis
 */
export function calculateEconomicsDeterministic(inputs, marketData) {
  const {
    buy_weight,
    buy_price_cwt,
    sell_weight,
    cog,
    yardage,
    days_on_feed,
    interest_rate,
    truck_in,
    truck_out,
    pencil_shrink,
  } = inputs;
  
  const { lc_futures, gf_futures, corn_price } = marketData;
  
  // Basic calculations
  const gainLbs = sell_weight - buy_weight;
  const adg = gainLbs / days_on_feed;
  
  // Cost breakdown
  const purchaseCost = (buy_weight * buy_price_cwt) / 100;
  const feedCost = gainLbs * cog;
  const yardageCost = yardage * days_on_feed;
  const interestCost = purchaseCost * (interest_rate / 100) * (days_on_feed / 365);
  const truckingCost = truck_in + truck_out;
  
  const totalCost = purchaseCost + feedCost + yardageCost + interestCost + truckingCost;
  
  // Revenue (with shrink)
  const shrinkLbs = sell_weight * (pencil_shrink / 100);
  const netSellWeight = sell_weight - shrinkLbs;
  const grossRevenue = (netSellWeight * lc_futures) / 100;
  
  // Profit
  const profitPerHead = grossRevenue - totalCost;
  const roi = (profitPerHead / totalCost) * 100;
  const breakevenCwt = totalCost / netSellWeight * 100;
  
  // Sensitivity
  const profit_lc_up = ((netSellWeight * (lc_futures + 10)) / 100) - totalCost;
  const profit_lc_down = ((netSellWeight * (lc_futures - 10)) / 100) - totalCost;
  
  return {
    economic_projection: `DETERMINISTIC ECONOMIC PROJECTION

INPUTS:
• Purchase: ${buy_weight} lbs @ $${buy_price_cwt}/cwt = $${purchaseCost.toFixed(0)}/hd
• Sell: ${sell_weight} lbs (net ${netSellWeight.toFixed(0)} lbs after ${pencil_shrink}% shrink)
• Gain: ${gainLbs} lbs @ $${cog}/lb = $${feedCost.toFixed(0)}
• DOF: ${days_on_feed} days | ADG: ${adg.toFixed(2)} lbs/day
• Yardage: $${yardage}/hd/day = $${yardageCost.toFixed(0)}
• Interest: ${interest_rate}% = $${interestCost.toFixed(0)}
• Trucking: $${truckingCost.toFixed(0)} (in: $${truck_in.toFixed(0)} + out: $${truck_out.toFixed(0)})

COST BREAKDOWN:
  Purchase:     $${purchaseCost.toFixed(0)}
  Feed:         $${feedCost.toFixed(0)}
  Yardage:      $${yardageCost.toFixed(0)}
  Interest:     $${interestCost.toFixed(0)}
  Trucking:     $${truckingCost.toFixed(0)}
                ─────────────
  TOTAL COST:   $${totalCost.toFixed(0)}/hd

REVENUE:
• LC Futures: $${lc_futures}/cwt
• Net Weight: ${netSellWeight.toFixed(0)} lbs (after ${pencil_shrink}% shrink)
• Gross Revenue: $${grossRevenue.toFixed(0)}/hd

PROFITABILITY:
• Net Profit: $${profitPerHead.toFixed(0)}/hd ${profitPerHead >= 0 ? '✓' : '⚠ LOSS'}
• ROI: ${roi.toFixed(1)}%
• Breakeven: $${breakevenCwt.toFixed(2)}/cwt

SENSITIVITY (LC ±$10):
• LC +$10 → $${profit_lc_up.toFixed(0)}/hd
• LC -$10 → $${profit_lc_down.toFixed(0)}/hd

NOTE: Deterministic calculation using standard formulas. Generated during AI service unavailability.`,
    estimated_profit_per_head: Math.round(profitPerHead),
    estimated_roi_percent: parseFloat(roi.toFixed(1)),
    estimated_cost_per_head: Math.round(totalCost),
    breakeven_cwt: parseFloat(breakevenCwt.toFixed(2)),
    _method: 'deterministic',
  };
}

/**
 * Generate vaccination protocol using BQA guidelines
 * Fallback for AI health planning
 */
export function generateVaccinationProtocolBQA(cattleData, transitDistance = 0) {
  const { breed_type, sex, lot_id } = cattleData;
  
  // Transit stress adjustment
  let receivingDays = 14;
  let stressLevel = 'LOW';
  
  if (transitDistance > 600) {
    receivingDays = 28;
    stressLevel = 'HIGH';
  } else if (transitDistance > 250) {
    receivingDays = 21;
    stressLevel = 'MODERATE';
  }
  
  const isDairyInfluence = isDairy(breed_type) || isBeefDairy(breed_type);
  
  return {
    vaccination_schedule: `BQA STANDARD VACCINATION PROTOCOL (Deterministic Fallback)

LOT: ${lot_id || getCattleLabel(breed_type, sex)} | ${breed_type} ${sex}
TRANSIT STRESS: ${stressLevel} (${transitDistance} miles) | Receiving Period: ${receivingDays} days

TRANSIT ADJUSTMENTS:
${stressLevel === 'HIGH' ? `⚠ HIGH STRESS HAUL (>600 mi):
• Extended receiving protocol (28 days)
• Consider metaphylaxis on arrival (Excede, Micotil, or Draxxin)
• Enhanced BRD monitoring days 7–21
• Electrolytes days 1–3, light hay only` : 
stressLevel === 'MODERATE' ? `⚠ MODERATE HAUL (250–600 mi):
• Standard receiving (21 days)
• Enhanced monitoring week 1–2
• Consider electrolytes day 1` :
`✓ SHORT HAUL (<250 mi):
• Standard receiving protocol (14 days)
• Normal processing on arrival`}

PROCESSING TIMELINE:

DAY 0 (ARRIVAL):
• Weigh, tag, process
• Vaccines (neck triangle only):
  - Pyramid 5+Presponse HM (5-way viral + bacterial)
  - 7-way Clostridial (Blackleg)
  - Dectomax Plus (dewormer + lice)
  - Implant (Component TE with Tylan, or Revalor-IS)
• Administer in neck triangle (BQA compliance)
${stressLevel === 'HIGH' ? '• Metaphylaxis consideration (consult veterinarian)' : ''}

DAYS 1–${receivingDays} (RECEIVING):
• Monitor temperature, appetite, demeanor
• Pull sick animals immediately
• Record all treatments (product, dose, route, withdrawal)
${stressLevel === 'HIGH' ? '• Days 1–3: Electrolytes in water\n• Days 1–3: Long-stem hay only\n• Day 4+: Begin concentrate introduction' : ''}

DAY 14–21 (BOOSTER):
• IBR-BVD booster (if modified-live used)
• Second 7-way Clostridial (if high-risk)
• Re-check implant site

DAY 60–90 (RE-IMPLANT):
• Re-implant (Component TE-200 or Revalor-200)
• Health check
• Coccidiosis treatment if needed

DAY ${receivingDays - 28} (PRE-SHIP):
• Terminal implant (if not already given)
• Health inspection
• Withdrawal time compliance check
  - All vaccines: 21-day withdrawal
  - Antibiotics: follow label (0–60 days)

WITHDRAWAL TIMES (BQA):
• Viral vaccines: 21 days
• Bacterial vaccines: 21 days
• Antibiotics: 0–60 days (check label)
• Implants: 0 days (beef only)
• Beta-agonists: 28–36 days (Optaflexx 36d, Zilmax 28d)

ESTIMATED HEALTH COST: $45–$65/hd
• Processing: $15–$20
• Vaccines: $18–$28
• Dewormer: $8–$12
• Implant: $4–$6
• Metaphylaxis (if needed): $12–$18

NOTE: Deterministic protocol using BQA guidelines. Consult veterinarian for high-risk cattle. Generated during AI service unavailability.`,
    _method: 'BQA deterministic',
    _receivingDays: receivingDays,
    _stressLevel: stressLevel,
  };
}

/**
 * Generate recommendations using rule-based logic
 * Fallback for AI recommendations
 */
export function generateRecommendationsDeterministic(economics, marketData, weather = null) {
  const {
    profit_per_head,
    roi,
    breakeven_cwt,
    adg,
    cog,
    days_on_feed,
  } = economics;
  
  const { lc_futures, gf_futures } = marketData;
  
  const recommendations = [];
  
  // Profitability check
  if (profit_per_head >= 0) {
    recommendations.push(`✓ PROFITABLE at $${Math.round(profit_per_head)}/hd — finalize sell date targeting current weight`);
  } else {
    recommendations.push(`⚠ BELOW BREAKEVEN ($${Math.round(Math.abs(profit_per_head))}/hd loss) — reduce COG or wait for LC recovery`);
  }
  
  // ADG check
  if (adg < 2.5) {
    recommendations.push(`⚠ ADG ${adg.toFixed(1)} below target — review implant program, ration energy density, health status`);
  } else if (adg >= 2.5 && adg < 3.0) {
    recommendations.push(`✓ ADG ${adg.toFixed(1)} on target for breed type`);
  } else {
    recommendations.push(`✓ EXCELLENT ADG ${adg.toFixed(1)} — cattle performing above expectations`);
  }
  
  // COG check
  if (cog > 1.00) {
    recommendations.push(`⚠ COG $${cog.toFixed(2)}/lb high — review feed efficiency, consider ration reformulation`);
  } else {
    recommendations.push(`✓ COG $${cog.toFixed(2)}/lb within acceptable range`);
  }
  
  // Interest cost check
  const interestRisk = days_on_feed > 200;
  if (interestRisk) {
    recommendations.push(`⚠ Extended DOF (${days_on_feed} days) — capital at risk, stay on marketing timeline`);
  }
  
  // Market check
  const basis = lc_futures - gf_futures;
  if (basis > 50) {
    recommendations.push(`⚠ Wide LC/FC spread ($${basis.toFixed(2)}) — monitor feed cost pressure`);
  }
  
  // Weather adjustments
  if (weather) {
    if (weather.temp_f > 90) {
      recommendations.push(`⚠ HEAT STRESS (${weather.temp_f}°F) — feed at night, add buffer, increase water access`);
    }
    if (weather.temp_f < 32) {
      recommendations.push(`❄ COLD STRESS (${weather.temp_f}°F) — increase energy density 8–12%, check windbreaks`);
    }
    if (weather.wind_mph > 25) {
      recommendations.push(`⚠ HIGH WIND (${weather.wind_mph} mph) — secure feed, check waterers`);
    }
  }
  
  return {
    ai_recommendations: `DETERMINISTIC RECOMMENDATIONS

MARKET ANALYSIS:
• LC $${lc_futures}/cwt vs BE $${breakeven_cwt.toFixed(2)}/cwt — ${lc_futures >= breakeven_cwt ? `✓ $${(lc_futures - breakeven_cwt).toFixed(2)}/cwt margin` : `⚠ $${(breakeven_cwt - lc_futures).toFixed(2)}/cwt deficit`}
• FC/LC Basis: $${basis.toFixed(2)}/cwt

TOP ACTIONS:
${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

NOTE: Rule-based analysis using standard thresholds. Generated during AI service unavailability.`,
    _method: 'rule-based',
  };
}

/**
 * Master fallback function for feed planner
 */
export function generateFullPlanDeterministic(cattleData, marketData, transitInfo = null, weather = null) {
  const ration = calculateFeedRationNRC(cattleData, cattleData.focus || 'balanced');
  const health = generateVaccinationProtocolBQA(cattleData, transitInfo?.miles || 0);
  const economics = calculateEconomicsDeterministic(cattleData, marketData);
  const recommendations = generateRecommendationsDeterministic(economics, marketData, weather);
  
  return {
    ration_program: ration.ration_program,
    vaccination_schedule: health.vaccination_schedule,
    economic_projection: economics.economic_projection,
    ai_recommendations: recommendations.ai_recommendations,
    summary: `${cattleData.lot_id || 'General'}: $${economics.estimated_profit_per_head}/hd | ${economics.estimated_roi_percent}% ROI | ${economics.estimated_dof} DOF | Buy $${cattleData.buy_price_cwt}/cwt → Sell ${cattleData.sell_weight} lbs @ LC $${marketData.lc_futures}/cwt | BE $${economics.breakeven_cwt}/cwt${transitInfo ? ` | ${transitInfo.miles} mi` : ''}.`,
    estimated_profit_per_head: economics.estimated_profit_per_head,
    estimated_roi_percent: economics.estimated_roi_percent,
    estimated_cost_per_head: economics.estimated_cost_per_head,
    target_grade: cattleData.target_grade || 'Choice',
    _fallback: true,
    _method: 'deterministic',
    _timestamp: new Date().toISOString(),
  };
}