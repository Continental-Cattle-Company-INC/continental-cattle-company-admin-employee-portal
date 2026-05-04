import { useState, useMemo } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Seasonal multipliers for cattle operations
const SEASONAL = [0.85, 0.80, 1.05, 1.15, 1.10, 0.95, 0.90, 0.95, 1.05, 1.10, 1.00, 0.95];

export default function CashFlowEngine({ financials }) {
  const [stressLevel, setStressLevel] = useState('base');
  const [expansionPct, setExpansionPct] = useState(0);

  const stressMultipliers = {
    base: { revenue: 1.0, expense: 1.0 },
    mild_stress: { revenue: 0.92, expense: 1.05 },
    severe_stress: { revenue: 0.80, expense: 1.15 },
    expansion: { revenue: 1.0 + expansionPct / 100, expense: 1.0 + expansionPct / 150 },
    boom: { revenue: 1.18, expense: 1.05 },
  };

  const multiplier = stressMultipliers[stressLevel] || stressMultipliers.base;

  const cashFlowByMonth = useMemo(() => {
    return MONTHS.map((month, i) => {
      const rev = financials.monthlyRevenue * SEASONAL[i] * multiplier.revenue;
      const exp = financials.monthlyExpenses * SEASONAL[i] * multiplier.expense;
      const net = rev - exp;
      return { month, revenue: rev, expenses: exp, net };
    });
  }, [financials, multiplier]);

  const annualCash = cashFlowByMonth.reduce((s, m) => s + m.net, 0);
  const worstMonth = cashFlowByMonth.reduce((w, m) => m.net < w.net ? m : w, cashFlowByMonth[0]);
  const bestMonth = cashFlowByMonth.reduce((b, m) => m.net > b.net ? m : b, cashFlowByMonth[0]);
  const negativeCashMonths = cashFlowByMonth.filter(m => m.net < 0).length;

  const cashScore = Math.min(100, Math.max(0,
    50 + (annualCash / Math.max(1, financials.totalExpenses)) * 50
  ));

  const burnCoverage = financials.cashReserves / Math.max(1, financials.cashBurnRate);

  return (
    <div className="space-y-6">
      {/* Score + KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Cash Score', value: cashScore.toFixed(0), unit: '/100', color: cashScore >= 70 ? 'text-success' : cashScore >= 40 ? 'text-warning' : 'text-danger' },
          { label: 'Annual Cash Flow', value: `${annualCash >= 0 ? '+' : ''}$${(annualCash / 1000).toFixed(0)}K`, color: annualCash >= 0 ? 'text-success' : 'text-danger' },
          { label: 'Burn Coverage', value: `${burnCoverage.toFixed(1)}mo`, color: burnCoverage >= 3 ? 'text-success' : burnCoverage >= 1 ? 'text-warning' : 'text-danger' },
          { label: 'Negative Months', value: `${negativeCashMonths}`, unit: '/12', color: negativeCashMonths === 0 ? 'text-success' : negativeCashMonths <= 3 ? 'text-warning' : 'text-danger' },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">{k.label}</div>
            <div className={`font-bebas text-2xl ${k.color}`}>{k.value}<span className="text-sm text-muted-foreground">{k.unit}</span></div>
          </div>
        ))}
      </div>

      {/* Simulation Controls */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-bebas text-lg text-foreground mb-4">CASH FLOW SIMULATION</h3>
        <div className="flex flex-wrap gap-3 items-center">
          {[
            { key: 'base', label: 'Base Case' },
            { key: 'mild_stress', label: 'Mild Stress' },
            { key: 'severe_stress', label: 'Severe Stress (–20% Rev)' },
            { key: 'boom', label: 'Boom (+18% Rev)' },
            { key: 'expansion', label: `Expansion +${expansionPct}%` },
          ].map(s => (
            <button key={s.key} onClick={() => setStressLevel(s.key)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                stressLevel === s.key ? 'bg-primary text-primary-foreground' : 'bg-secondary border border-border text-muted-foreground hover:text-foreground'
              }`}>{s.label}</button>
          ))}
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs text-muted-foreground">Expansion %:</span>
            <input type="number" value={expansionPct} onChange={e => { setExpansionPct(parseInt(e.target.value) || 0); setStressLevel('expansion'); }}
              className="w-16 bg-secondary border border-border rounded px-2 py-1 text-foreground text-xs" />
          </div>
        </div>
      </div>

      {/* Monthly Cash Flow Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-bebas text-lg text-foreground">MONTHLY CASH FLOW FORECAST</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/80 border-b border-border">
                {['Month', 'Revenue', 'Expenses', 'Net Cash Flow', 'Signal'].map(h => (
                  <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cashFlowByMonth.map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="px-4 py-2.5 font-medium text-foreground">{row.month}</td>
                  <td className="px-4 py-2.5 text-success">${(row.revenue / 1000).toFixed(0)}K</td>
                  <td className="px-4 py-2.5 text-warning">${(row.expenses / 1000).toFixed(0)}K</td>
                  <td className={`px-4 py-2.5 font-bebas text-lg ${row.net >= 0 ? 'text-success' : 'text-danger'}`}>
                    {row.net >= 0 ? '+' : ''}${(row.net / 1000).toFixed(0)}K
                  </td>
                  <td className="px-4 py-2.5">
                    {row.net > 50000
                      ? <span className="text-xs bg-success/15 text-success border border-success/20 px-2 py-0.5 rounded">SURPLUS</span>
                      : row.net > 0
                      ? <span className="text-xs bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 rounded">POSITIVE</span>
                      : <span className="text-xs bg-danger/15 text-danger border border-danger/20 px-2 py-0.5 rounded">DEFICIT</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary + Strategy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="font-bebas text-lg text-foreground mb-3">CASH FORECAST</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Best Month</span><span className="text-success">{bestMonth.month} +${(bestMonth.net/1000).toFixed(0)}K</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Worst Month</span><span className={worstMonth.net < 0 ? 'text-danger' : 'text-warning'}>{worstMonth.month} ${(worstMonth.net/1000).toFixed(0)}K</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Annual Total</span><span className={annualCash >= 0 ? 'text-success' : 'text-danger'}>{annualCash >= 0 ? '+' : ''}${(annualCash/1000).toFixed(0)}K</span></div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="font-bebas text-lg text-foreground mb-3">CASH RISK</div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-1.5"><span className={burnCoverage >= 3 ? 'text-success' : 'text-danger'}>●</span> Burn coverage: {burnCoverage.toFixed(1)} months</div>
            <div className="flex items-start gap-1.5"><span className={negativeCashMonths <= 2 ? 'text-success' : 'text-danger'}>●</span> {negativeCashMonths} projected deficit months</div>
            <div className="flex items-start gap-1.5"><span className="text-warning">●</span> Peak demand: {SEASONAL.indexOf(Math.max(...SEASONAL)) < 6 ? 'Spring' : 'Fall'} cycle</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="font-bebas text-lg text-foreground mb-3">CASH OPTIMIZATION</div>
          <div className="space-y-1.5 text-xs text-foreground">
            {[
              annualCash >= 0 ? 'Deploy surplus cash into higher-ROI lots' : 'Reduce buying until cash stabilizes',
              burnCoverage < 2 ? 'Build cash reserves — target 3+ months coverage' : 'Maintain current reserve buffer',
              negativeCashMonths > 2 ? 'Smooth cash flow with staggered lot exits' : 'Cycle timing is healthy',
              'Align lot purchase timing with seasonal strength periods',
            ].map((tip, i) => <div key={i} className="flex items-start gap-1.5"><span className="text-primary mt-0.5">→</span>{tip}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}