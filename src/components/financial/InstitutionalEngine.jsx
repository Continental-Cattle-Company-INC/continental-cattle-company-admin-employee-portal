import { useMemo } from 'react';

const INSTITUTIONAL_BENCHMARKS = [
  { metric: 'Profit Margin', threshold: 15, unit: '%', description: 'Banks expect 15%+ for operating credit' },
  { metric: 'Capital Turnover', threshold: 1.5, unit: 'x', description: 'Investors target 1.5x+ for ag operations' },
  { metric: 'Debt/Equity', threshold: 0.5, unit: 'x', description: 'Institutional lenders prefer < 0.5 D/E' },
  { metric: 'Current Ratio', threshold: 1.5, unit: 'x', description: 'Minimum 1.5 for credit facilities' },
  { metric: 'Cash Coverage', threshold: 3, unit: 'mo', description: '3+ months reserves for institutional credit' },
];

function MetricRow({ metric, value, threshold, unit, description, inverse = false }) {
  const passes = inverse ? value <= threshold : value >= threshold;
  const pct = Math.min(100, (value / threshold) * 100);
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 border border-border/50">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${passes ? 'bg-success' : 'bg-danger'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-foreground">{metric}</span>
          <div className="flex items-center gap-2">
            <span className={`font-bebas text-lg ${passes ? 'text-success' : 'text-danger'}`}>{typeof value === 'number' ? value.toFixed(2) : value}{unit}</span>
            <span className="text-xs text-muted-foreground">/ {threshold}{unit}</span>
          </div>
        </div>
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${passes ? 'bg-success' : 'bg-danger'}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <div className="text-xs text-muted-foreground mt-1">{description}</div>
      </div>
    </div>
  );
}

export default function InstitutionalEngine({ financials, entities }) {
  const metrics = useMemo(() => {
    const currentRatio = financials.cashReserves > 0 && financials.monthlyExpenses > 0
      ? financials.cashReserves / financials.monthlyExpenses
      : 0;
    const cashCoverage = financials.cashBurnRate > 0
      ? financials.cashReserves / financials.cashBurnRate
      : 0;
    const debtEquity = parseFloat(financials.debtToEquity) || 0;
    const volatilityAdjustedProfit = financials.netProfit * (1 - 0.15); // 15% vol adjustment
    const riskAdjustedROI = financials.portfolioValue > 0
      ? (volatilityAdjustedProfit / financials.portfolioValue) * 100
      : 0;
    // Sharpe-like ratio: excess return / volatility proxy
    const sharpe = financials.profitMargin > 0 ? (financials.profitMargin - 5) / 15 : 0; // 5% risk-free, 15% vol
    const enterpriseValue = financials.portfolioValue + financials.cashReserves;
    const assetValue = financials.portfolioValue;
    const equityValue = Math.max(0, assetValue - (financials.creditUsed || 0));
    const institutionalScore = Math.min(100,
      (financials.profitMargin >= 15 ? 20 : financials.profitMargin >= 8 ? 12 : 5) +
      (financials.capitalTurnover >= 1.5 ? 20 : financials.capitalTurnover >= 1.0 ? 12 : 5) +
      (debtEquity <= 0.5 ? 20 : debtEquity <= 1.0 ? 12 : 3) +
      (currentRatio >= 1.5 ? 20 : currentRatio >= 1.0 ? 12 : 3) +
      (cashCoverage >= 3 ? 20 : cashCoverage >= 1 ? 12 : 3)
    );
    return { currentRatio, cashCoverage, debtEquity, riskAdjustedROI, sharpe, enterpriseValue, assetValue, equityValue, institutionalScore };
  }, [financials]);

  const readinessLevel = metrics.institutionalScore >= 80 ? 'INSTITUTIONAL READY'
    : metrics.institutionalScore >= 60 ? 'NEAR READY'
    : metrics.institutionalScore >= 40 ? 'DEVELOPING'
    : 'EARLY STAGE';

  const readinessColor = metrics.institutionalScore >= 80 ? 'text-success'
    : metrics.institutionalScore >= 60 ? 'text-primary'
    : metrics.institutionalScore >= 40 ? 'text-warning'
    : 'text-danger';

  return (
    <div className="space-y-6">
      {/* Institutional Score */}
      <div className="bg-gradient-to-br from-primary/10 to-card border border-primary/20 rounded-lg p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">INSTITUTIONAL READINESS SCORE</div>
            <div className={`font-bebas text-6xl ${readinessColor}`}>{metrics.institutionalScore.toFixed(0)}</div>
            <div className={`font-bebas text-xl mt-1 ${readinessColor}`}>{readinessLevel}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
              <div className={`font-bebas text-2xl ${metrics.sharpe >= 1 ? 'text-success' : metrics.sharpe >= 0.5 ? 'text-warning' : 'text-danger'}`}>{metrics.sharpe.toFixed(2)}</div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Risk-Adj ROI</div>
              <div className={`font-bebas text-2xl ${metrics.riskAdjustedROI >= 12 ? 'text-success' : 'text-warning'}`}>{metrics.riskAdjustedROI.toFixed(1)}%</div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Enterprise Value</div>
              <div className="font-bebas text-xl text-primary">${(metrics.enterpriseValue / 1000000).toFixed(2)}M</div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Equity Value</div>
              <div className="font-bebas text-xl text-foreground">${(metrics.equityValue / 1000000).toFixed(2)}M</div>
            </div>
          </div>
        </div>
      </div>

      {/* Institutional Benchmarks */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-bebas text-lg text-foreground mb-4">INSTITUTIONAL BENCHMARKS</h3>
        <div className="space-y-3">
          <MetricRow metric="Profit Margin" value={financials.profitMargin} threshold={15} unit="%" description="Banks expect 15%+ for operating credit" />
          <MetricRow metric="Capital Turnover" value={financials.capitalTurnover} threshold={1.5} unit="x" description="Investors target 1.5x+ for ag operations" />
          <MetricRow metric="Debt/Equity Ratio" value={metrics.debtEquity} threshold={0.5} unit="x" description="Institutional lenders prefer < 0.5 D/E" inverse={true} />
          <MetricRow metric="Current Ratio" value={metrics.currentRatio} threshold={1.5} unit="x" description="Minimum 1.5 for credit facilities" />
          <MetricRow metric="Cash Coverage" value={metrics.cashCoverage} threshold={3} unit="mo" description="3+ months reserves for institutional credit" />
        </div>
      </div>

      {/* Valuation Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="font-bebas text-lg text-foreground mb-3">VALUATION MAP</div>
          <div className="space-y-2 text-xs">
            {[
              { label: 'Asset Value', value: `$${(metrics.assetValue / 1000000).toFixed(2)}M` },
              { label: 'Cash Reserves', value: `$${(financials.cashReserves / 1000).toFixed(0)}K` },
              { label: 'Enterprise Value', value: `$${(metrics.enterpriseValue / 1000000).toFixed(2)}M` },
              { label: 'Equity Value', value: `$${(metrics.equityValue / 1000000).toFixed(2)}M` },
            ].map(r => (
              <div key={r.label} className="flex justify-between p-2 bg-secondary/50 rounded">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="text-foreground font-medium">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="font-bebas text-lg text-foreground mb-3">RISK-ADJUSTED METRICS</div>
          <div className="space-y-2 text-xs">
            {[
              { label: 'Raw Profit Margin', value: `${financials.profitMargin.toFixed(1)}%`, color: 'text-foreground' },
              { label: 'Volatility Adjustment', value: '–15%', color: 'text-warning' },
              { label: 'Risk-Adj ROI', value: `${metrics.riskAdjustedROI.toFixed(1)}%`, color: metrics.riskAdjustedROI >= 10 ? 'text-success' : 'text-danger' },
              { label: 'Sharpe Ratio', value: metrics.sharpe.toFixed(2), color: metrics.sharpe >= 1 ? 'text-success' : 'text-warning' },
            ].map(r => (
              <div key={r.label} className="flex justify-between p-2 bg-secondary/50 rounded">
                <span className="text-muted-foreground">{r.label}</span>
                <span className={`font-medium ${r.color}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="font-bebas text-lg text-foreground mb-3">INSTITUTIONAL READINESS PLAN</div>
          <div className="space-y-1.5 text-xs text-foreground">
            {[
              financials.profitMargin < 15 ? 'Improve margin to 15%+ for bank credit qualification' : '✓ Margin qualifies for bank credit',
              metrics.debtEquity > 0.5 ? 'Reduce leverage below 0.5 D/E for fund eligibility' : '✓ D/E ratio within institutional range',
              metrics.cashCoverage < 3 ? 'Build cash reserves to 3+ months for credit facilities' : '✓ Cash coverage meets institutional standard',
              metrics.institutionalScore < 80 ? 'Work toward 80+ score before approaching institutional lenders' : '✓ Ready for institutional capital conversations',
            ].map((tip, i) => (
              <div key={i} className={`flex items-start gap-1.5 p-1.5 rounded ${tip.startsWith('✓') ? 'bg-success/5' : ''}`}>
                <span className={tip.startsWith('✓') ? 'text-success mt-0.5' : 'text-primary mt-0.5'}>{tip.startsWith('✓') ? '✓' : '→'}</span>
                <span className={tip.startsWith('✓') ? 'text-success' : 'text-foreground'}>{tip.startsWith('✓') ? tip.slice(2) : tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}