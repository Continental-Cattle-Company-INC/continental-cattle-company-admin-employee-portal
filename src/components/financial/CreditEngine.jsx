import { useState, useMemo } from 'react';

export default function CreditEngine({ financials, bankAccounts }) {
  const [simScenario, setSimScenario] = useState('base');

  const accounts = bankAccounts || [];

  const creditMetrics = useMemo(() => {
    const totalLimit = accounts.reduce((s, a) => s + (a.max_bid_limit || 0), 0);
    const totalAvailable = accounts.reduce((s, a) => s + (a.available_funds || 0), 0);
    const totalUsed = Math.max(0, totalLimit - totalAvailable);
    const utilizationPct = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
    const verifiedAccounts = accounts.filter(a => a.funds_verified).length;
    const averageBalance = accounts.length > 0 ? accounts.reduce((s, a) => s + (a.account_balance || 0), 0) / accounts.length : 0;
    // Simplified credit cost (interest rate approximation)
    const estimatedCreditCost = totalUsed * 0.0875; // 8.75% average
    const creditLeverage = financials.portfolioValue > 0 ? totalLimit / financials.portfolioValue : 0;
    const creditScore = Math.min(100, Math.max(0,
      (utilizationPct < 60 ? 40 : utilizationPct < 80 ? 20 : 5) +
      (verifiedAccounts > 0 ? 30 : 0) +
      (totalAvailable > 100000 ? 30 : totalAvailable > 50000 ? 20 : 10)
    ));
    return { totalLimit, totalAvailable, totalUsed, utilizationPct, verifiedAccounts, averageBalance, estimatedCreditCost, creditLeverage, creditScore };
  }, [accounts, financials]);

  const simMultipliers = {
    base: 1.0,
    tightening: 0.75,
    expansion: 1.25,
    rate_shock: 1.0, // same credit, higher cost
    stress: 0.50,
  };

  const simLimit = creditMetrics.totalLimit * simMultipliers[simScenario];
  const simAvailable = Math.min(simLimit, creditMetrics.totalAvailable * simMultipliers[simScenario]);
  const simCost = simScenario === 'rate_shock'
    ? creditMetrics.estimatedCreditCost * 1.5
    : creditMetrics.estimatedCreditCost * simMultipliers[simScenario];

  const accountTypes = {
    checking: accounts.filter(a => a.account_type === 'checking'),
    savings: accounts.filter(a => a.account_type === 'savings'),
    credit: accounts.filter(a => a.account_type === 'credit'),
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Credit Score', value: creditMetrics.creditScore.toFixed(0), unit: '/100', color: creditMetrics.creditScore >= 70 ? 'text-success' : 'text-warning' },
          { label: 'Credit Available', value: `$${(creditMetrics.totalAvailable / 1000).toFixed(0)}K`, color: 'text-success' },
          { label: 'Utilization', value: `${creditMetrics.utilizationPct.toFixed(0)}%`, color: creditMetrics.utilizationPct < 60 ? 'text-success' : creditMetrics.utilizationPct < 80 ? 'text-warning' : 'text-danger' },
          { label: 'Credit Leverage', value: `${creditMetrics.creditLeverage.toFixed(2)}x`, color: creditMetrics.creditLeverage < 1 ? 'text-success' : 'text-warning' },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-1">{k.label}</div>
            <div className={`font-bebas text-2xl ${k.color}`}>{k.value}<span className="text-sm text-muted-foreground">{k.unit}</span></div>
          </div>
        ))}
      </div>

      {/* Credit Utilization Visual */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-bebas text-lg text-foreground mb-4">CREDIT UTILIZATION</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Used: ${(creditMetrics.totalUsed / 1000).toFixed(0)}K</span>
              <span className="text-muted-foreground">Available: ${(creditMetrics.totalAvailable / 1000).toFixed(0)}K / ${(creditMetrics.totalLimit / 1000).toFixed(0)}K total</span>
            </div>
            <div className="h-4 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${creditMetrics.utilizationPct < 60 ? 'bg-success' : creditMetrics.utilizationPct < 80 ? 'bg-warning' : 'bg-danger'}`}
                style={{ width: `${Math.min(100, creditMetrics.utilizationPct)}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center text-xs">
            {Object.entries(accountTypes).map(([type, accts]) => (
              <div key={type} className="bg-secondary/50 rounded p-3">
                <div className="text-muted-foreground capitalize mb-1">{type} accounts</div>
                <div className="font-bebas text-xl text-foreground">{accts.length}</div>
                <div className="text-muted-foreground mt-1">${(accts.reduce((s, a) => s + (a.available_funds || 0), 0) / 1000).toFixed(0)}K avail</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Simulation */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-bebas text-lg text-foreground mb-4">CREDIT SCENARIO SIMULATION</h3>
        <div className="flex flex-wrap gap-2 mb-5">
          {[
            { key: 'base', label: 'Base Case' },
            { key: 'tightening', label: 'Credit Tightening –25%' },
            { key: 'expansion', label: 'Credit Expansion +25%' },
            { key: 'rate_shock', label: 'Rate Shock +50% Cost' },
            { key: 'stress', label: 'Stress –50% Credit' },
          ].map(s => (
            <button key={s.key} onClick={() => setSimScenario(s.key)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                simScenario === s.key ? 'bg-primary text-primary-foreground' : 'bg-secondary border border-border text-muted-foreground hover:text-foreground'
              }`}>{s.label}</button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Simulated Credit Limit', value: `$${(simLimit / 1000).toFixed(0)}K`, color: 'text-foreground' },
            { label: 'Simulated Available', value: `$${(simAvailable / 1000).toFixed(0)}K`, color: simAvailable > 50000 ? 'text-success' : 'text-danger' },
            { label: 'Simulated Annual Cost', value: `$${(simCost / 1000).toFixed(0)}K`, color: simCost > creditMetrics.estimatedCreditCost * 1.2 ? 'text-danger' : 'text-warning' },
          ].map(k => (
            <div key={k.label} className="bg-secondary/50 rounded-lg p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">{k.label}</div>
              <div className={`font-bebas text-2xl ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-muted-foreground border-t border-border pt-3">
          {simScenario === 'stress' && <span className="text-danger">⚠ Critical: With 50% credit reduction, buying capacity drops to ${(simAvailable / 1000).toFixed(0)}K — prioritize cash management</span>}
          {simScenario === 'tightening' && <span className="text-warning">⚠ Tightening scenario: Reduce new lot commitments and build cash reserves</span>}
          {simScenario === 'expansion' && <span className="text-success">✓ Expansion scenario: Deploy additional ${((simLimit - creditMetrics.totalLimit) / 1000).toFixed(0)}K toward highest-ROI classes</span>}
          {simScenario === 'rate_shock' && <span className="text-warning">⚠ Rate shock adds ${((simCost - creditMetrics.estimatedCreditCost) / 1000).toFixed(0)}K in annual cost — hedge or pay down credit</span>}
          {simScenario === 'base' && <span className="text-muted-foreground">Base case: Current credit position is stable</span>}
        </div>
      </div>

      {/* Bank Accounts Table */}
      {accounts.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-bebas text-lg text-foreground">LINKED ACCOUNTS</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/80 border-b border-border">
                  {['Institution', 'Type', 'Holder', 'Balance', 'Available', 'Bid Limit', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="px-4 py-2.5 font-medium text-foreground text-xs">{a.institution_name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{a.account_type}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{a.account_holder_id}</td>
                    <td className="px-4 py-2.5 text-xs text-foreground">${(a.account_balance || 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs text-success">${(a.available_funds || 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs text-primary">${(a.max_bid_limit || 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded border capitalize ${
                        a.verification_label === 'verified' ? 'bg-success/15 text-success border-success/20' :
                        a.verification_label === 'expired' ? 'bg-danger/15 text-danger border-danger/20' :
                        'bg-warning/15 text-warning border-warning/20'
                      }`}>{a.verification_label || 'pending'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Credit Command */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="font-bebas text-lg text-foreground mb-3">CREDIT FORECAST</div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Est. Annual Cost</span><span className="text-warning">${(creditMetrics.estimatedCreditCost/1000).toFixed(0)}K</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Verified Accounts</span><span className="text-success">{creditMetrics.verifiedAccounts} / {accounts.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Avg Account Balance</span><span className="text-foreground">${(creditMetrics.averageBalance/1000).toFixed(0)}K</span></div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="font-bebas text-lg text-foreground mb-3">CREDIT OPTIMIZATION</div>
          <div className="space-y-1.5 text-xs text-foreground">
            {[
              creditMetrics.utilizationPct > 70 ? 'Pay down credit to below 60% utilization' : 'Credit utilization is healthy',
              creditMetrics.verifiedAccounts < accounts.length ? `Verify ${accounts.length - creditMetrics.verifiedAccounts} unverified accounts` : 'All accounts verified',
              'Negotiate higher limits with primary lender for scale operations',
              'Maintain 20–30% credit buffer for opportunistic buys',
            ].map((tip, i) => <div key={i} className="flex items-start gap-1.5"><span className="text-primary mt-0.5">→</span>{tip}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}