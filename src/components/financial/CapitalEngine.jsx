import { useMemo } from 'react';

const STAGES = [
  { key: 'calf_ranch', label: 'Calf Ranch', avgDays: 90, expectedROI: 0.75 },
  { key: 'grower', label: 'Grower', avgDays: 120, expectedROI: 0.22 },
  { key: 'feedyard', label: 'Feedyard', avgDays: 150, expectedROI: 0.18 },
  { key: 'finish', label: 'Finish', avgDays: 60, expectedROI: 0.12 },
  { key: 'rail', label: 'Rail/Sale', avgDays: 7, expectedROI: 0.05 },
];

export default function CapitalEngine({ financials, entities, lots }) {
  const capitalByStage = useMemo(() => {
    return STAGES.map(stage => {
      const stageLots = lots.filter(l => l.stage === stage.key && l.status === 'active');
      const headCount = stageLots.reduce((s, l) => s + (l.head_count || 0), 0);
      const value = stageLots.reduce((s, l) => s + ((l.current_weight || l.purchase_weight || 0) * (l.head_count || 0) * financials.lc / 100), 0);
      const pct = financials.portfolioValue > 0 ? (value / financials.portfolioValue) * 100 : 0;
      return { ...stage, headCount, value, pct, lotCount: stageLots.length };
    });
  }, [lots, financials]);

  const capitalByEntity = useMemo(() => {
    return entities.map(e => {
      const annualProfit = (e.annual_revenue || 0) - (e.annual_expenses || 0);
      const capitalDeployed = e.annual_expenses || 0;
      const roi = capitalDeployed > 0 ? (annualProfit / capitalDeployed) * 100 : 0;
      const turnover = e.annual_revenue > 0 && e.annual_expenses > 0 ? (e.annual_revenue / e.annual_expenses) : 0;
      return { ...e, annualProfit, roi, turnover };
    });
  }, [entities]);

  const capitalScore = Math.min(100, Math.max(0, financials.capitalTurnover * 45));
  const capitalEfficiency = financials.portfolioValue > 0
    ? ((financials.netProfit / financials.portfolioValue) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Capital Score', value: capitalScore.toFixed(0), unit: '/100', color: capitalScore >= 70 ? 'text-success' : 'text-warning' },
          { label: 'Portfolio Value', value: `$${(financials.portfolioValue / 1000000).toFixed(2)}M`, color: 'text-primary' },
          { label: 'Capital Turnover', value: `${financials.capitalTurnover.toFixed(2)}x`, color: financials.capitalTurnover >= 1.5 ? 'text-success' : 'text-warning' },
          { label: 'Capital ROI', value: `${capitalEfficiency}%`, color: parseFloat(capitalEfficiency) >= 15 ? 'text-success' : 'text-warning' },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">{k.label}</div>
            <div className={`font-bebas text-2xl ${k.color}`}>{k.value}<span className="text-sm text-muted-foreground">{k.unit}</span></div>
          </div>
        ))}
      </div>

      {/* Capital by Stage */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-bebas text-xl text-foreground mb-4">CAPITAL ALLOCATION BY STAGE</h3>
        <div className="space-y-3">
          {capitalByStage.map(stage => (
            <div key={stage.key} className="flex items-center gap-3">
              <div className="w-28 text-xs text-muted-foreground">{stage.label}</div>
              <div className="flex-1 h-6 bg-secondary rounded overflow-hidden relative">
                <div
                  className="h-full bg-primary/60 rounded transition-all"
                  style={{ width: `${stage.pct}%` }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-xs text-foreground font-medium">
                  {stage.lotCount} lots · {stage.headCount} hd · ${(stage.value / 1000).toFixed(0)}K
                </span>
              </div>
              <div className="w-12 text-xs text-right text-primary font-medium">{stage.pct.toFixed(0)}%</div>
              <div className={`w-16 text-xs text-right ${stage.expectedROI > 0.2 ? 'text-success' : 'text-warning'}`}>
                {(stage.expectedROI * 100).toFixed(0)}% ROI
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Capital by Entity */}
      {capitalByEntity.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-bebas text-lg text-foreground">CAPITAL EFFICIENCY BY ENTITY</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/80 border-b border-border">
                  {['Entity', 'Revenue', 'Expenses', 'Net Profit', 'ROI', 'Turnover', 'Signal'].map(h => (
                    <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {capitalByEntity.sort((a, b) => b.roi - a.roi).map(e => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-foreground text-xs">{e.entity_name}</div>
                      <div className="text-xs text-muted-foreground">{e.entity_type}</div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-foreground">${(e.annual_revenue / 1000).toFixed(0)}K</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">${(e.annual_expenses / 1000).toFixed(0)}K</td>
                    <td className={`px-4 py-2.5 text-xs font-medium ${e.annualProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                      {e.annualProfit >= 0 ? '+' : ''}${(e.annualProfit / 1000).toFixed(0)}K
                    </td>
                    <td className={`px-4 py-2.5 font-bebas text-lg ${e.roi >= 20 ? 'text-success' : e.roi >= 5 ? 'text-warning' : 'text-danger'}`}>
                      {e.roi.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2.5 text-xs text-foreground">{e.turnover.toFixed(2)}x</td>
                    <td className="px-4 py-2.5">
                      {e.roi >= 20
                        ? <span className="text-xs bg-success/15 text-success border border-success/20 px-2 py-0.5 rounded">EXPAND</span>
                        : e.roi >= 5
                        ? <span className="text-xs bg-warning/15 text-warning border border-warning/20 px-2 py-0.5 rounded">HOLD</span>
                        : <span className="text-xs bg-danger/15 text-danger border border-danger/20 px-2 py-0.5 rounded">REVIEW</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Capital Optimization Plan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="font-bebas text-lg text-foreground mb-3">CAPITAL FORECAST</div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between"><span>Current Deployed</span><span className="text-foreground">${(financials.portfolioValue/1000000).toFixed(2)}M</span></div>
            <div className="flex justify-between"><span>Annual Revenue</span><span className="text-primary">${(financials.totalRevenue/1000000).toFixed(2)}M</span></div>
            <div className="flex justify-between"><span>Target Turnover</span><span className="text-success">1.8–2.2x</span></div>
            <div className="flex justify-between"><span>Current Turnover</span><span className={financials.capitalTurnover >= 1.5 ? 'text-success' : 'text-warning'}>{financials.capitalTurnover.toFixed(2)}x</span></div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="font-bebas text-lg text-foreground mb-3">CAPITAL RISK</div>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-start gap-1.5"><span className={financials.capitalTurnover >= 1.5 ? 'text-success' : 'text-warning'}>●</span> Turnover {financials.capitalTurnover >= 1.5 ? 'healthy' : 'below target'}</div>
            <div className="flex items-start gap-1.5"><span className="text-warning">●</span> Stage concentration risk: {capitalByStage.filter(s => s.pct > 40).map(s => s.label).join(', ') || 'diversified'}</div>
            <div className="flex items-start gap-1.5"><span className="text-primary">●</span> {financials.activeLots} active lots across {capitalByStage.filter(s => s.lotCount > 0).length} stages</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="font-bebas text-lg text-foreground mb-3">CAPITAL OPTIMIZATION</div>
          <div className="space-y-1.5 text-xs text-foreground">
            {[
              financials.capitalTurnover < 1.5 ? 'Accelerate lot exit cycles to improve turnover' : 'Turnover is strong — maintain cycle cadence',
              'Concentrate expansion in highest-ROI entity',
              'Stage capital toward calf ranch for maximum internal margin capture',
              'Review entities below 10% ROI for restructuring',
            ].map((tip, i) => <div key={i} className="flex items-start gap-1.5"><span className="text-primary mt-0.5">→</span>{tip}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}