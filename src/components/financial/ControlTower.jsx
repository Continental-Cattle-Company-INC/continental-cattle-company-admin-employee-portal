import { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign, BarChart3, Zap } from 'lucide-react';

function ScoreGauge({ label, score, max = 100 }) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  const color = pct >= 70 ? 'text-success' : pct >= 40 ? 'text-warning' : 'text-danger';
  const bg = pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-danger';
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-xs text-muted-foreground mb-2">{label}</div>
      <div className={`font-bebas text-3xl ${color}`}>{score.toFixed(0)}</div>
      <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bg} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CommandCard({ title, items, accentColor = 'primary' }) {
  return (
    <div className={`bg-card border border-${accentColor}/20 rounded-lg p-4`}>
      <h4 className={`font-bebas text-lg text-${accentColor} mb-3`}>{title}</h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-foreground">
            <Zap className={`w-3 h-3 mt-0.5 flex-shrink-0 text-${accentColor}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ControlTower({ financials, entities, lots }) {
  const scores = useMemo(() => {
    const cashScore = Math.min(100, (financials.cashReserves / Math.max(1, financials.cashBurnRate)) * 20);
    const capitalScore = Math.min(100, financials.capitalTurnover * 40);
    const marginScore = Math.min(100, Math.max(0, financials.profitMargin * 2.5));
    const creditScore = financials.totalCreditLimit > 0
      ? Math.min(100, (financials.creditAvailable / financials.totalCreditLimit) * 100)
      : 50;
    const overallScore = (cashScore + capitalScore + marginScore + creditScore) / 4;
    return { cashScore, capitalScore, marginScore, creditScore, overallScore };
  }, [financials]);

  const cashPlan = [
    `Monthly cash flow: ${financials.monthlyCashFlow >= 0 ? '+' : ''}$${(financials.monthlyCashFlow / 1000).toFixed(0)}K`,
    `Cash reserves cover ${(financials.cashReserves / Math.max(1, financials.cashBurnRate)).toFixed(1)} months of burn`,
    financials.monthlyCashFlow > 0 ? 'Positive cash position — deploy excess into inventory' : 'Negative cash flow — tighten buying cycle',
    `Optimize buying/selling timing based on LC futures at $${financials.lc}/cwt`,
  ];

  const capitalPlan = [
    `Portfolio value: $${(financials.portfolioValue / 1000000).toFixed(2)}M across ${financials.totalHead} head`,
    `Capital turnover: ${financials.capitalTurnover.toFixed(2)}x — ${financials.capitalTurnover > 1.5 ? 'strong efficiency' : 'room to improve'}`,
    `${financials.activeLots} active lots — ${financials.activeLots > 10 ? 'diversified' : 'concentrate on higher-ROI classes'}`,
    `Target 1.8–2.2x capital turnover for optimal efficiency`,
  ];

  const creditPlan = [
    `Credit available: $${(financials.creditAvailable / 1000).toFixed(0)}K`,
    `Credit utilization: ${financials.totalCreditLimit > 0 ? ((financials.creditUsed / financials.totalCreditLimit) * 100).toFixed(0) : 0}%`,
    financials.creditAvailable > 100000 ? 'Credit headroom available — consider strategic expansion' : 'Monitor credit closely before new purchases',
    `D/E ratio: ${financials.debtToEquity} — ${parseFloat(financials.debtToEquity) < 0.5 ? 'conservative leverage' : 'elevated leverage, manage exposure'}`,
  ];

  const hedgingPlan = [
    `LC Futures: $${financials.lc}/cwt — ${financials.lc > 240 ? 'strong, consider forward sales' : 'watch for weakness'}`,
    `Choice cutout: $${financials.choiceCutout}/cwt — ${financials.choiceCutout > 300 ? 'elevated, lock in margins' : 'stay flexible'}`,
    `Corn: $${financials.corn}/bu — ${financials.corn > 5 ? 'elevated, hedge feed cost' : 'favorable, extend coverage'}`,
    `Margin target: $350–$500/head all-in`,
  ];

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-gradient-to-br from-primary/10 to-card border border-primary/20 rounded-lg p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">FINANCIAL COMMAND SCORE</div>
            <div className={`font-bebas text-6xl ${scores.overallScore >= 70 ? 'text-success' : scores.overallScore >= 40 ? 'text-warning' : 'text-danger'}`}>
              {scores.overallScore.toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {scores.overallScore >= 70 ? '✓ Operational — Deploy capital aggressively' :
               scores.overallScore >= 40 ? '⚠ Caution — Monitor cash and credit closely' :
               '✗ Alert — Tighten controls immediately'}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Revenue</div>
              <div className="font-bebas text-xl text-primary">${(financials.totalRevenue / 1000000).toFixed(1)}M</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Net Profit</div>
              <div className={`font-bebas text-xl ${financials.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                ${(financials.netProfit / 1000000).toFixed(2)}M
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Margin</div>
              <div className={`font-bebas text-xl ${financials.profitMargin >= 15 ? 'text-success' : 'text-warning'}`}>
                {financials.profitMargin.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Portfolio</div>
              <div className="font-bebas text-xl text-foreground">${(financials.portfolioValue / 1000000).toFixed(2)}M</div>
            </div>
          </div>
        </div>
      </div>

      {/* Domain Scores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreGauge label="Cash Score" score={scores.cashScore} />
        <ScoreGauge label="Capital Score" score={scores.capitalScore} />
        <ScoreGauge label="Margin Score" score={scores.marginScore} />
        <ScoreGauge label="Credit Score" score={scores.creditScore} />
      </div>

      {/* Command Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CommandCard title="CASH COMMAND PLAN" items={cashPlan} accentColor="primary" />
        <CommandCard title="CAPITAL COMMAND PLAN" items={capitalPlan} accentColor="success" />
        <CommandCard title="CREDIT COMMAND PLAN" items={creditPlan} accentColor="warning" />
        <CommandCard title="HEDGING COMMAND PLAN" items={hedgingPlan} accentColor="primary" />
      </div>
    </div>
  );
}