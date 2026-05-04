import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SectionHeader from '@/components/SectionHeader';
import CashFlowEngine from '@/components/financial/CashFlowEngine';
import CapitalEngine from '@/components/financial/CapitalEngine';
import CreditEngine from '@/components/financial/CreditEngine';
import ControlTower from '@/components/financial/ControlTower';
import InstitutionalEngine from '@/components/financial/InstitutionalEngine';

const TABS = [
  { key: 'tower', label: 'Control Tower' },
  { key: 'cash', label: 'Cash Flow' },
  { key: 'capital', label: 'Capital' },
  { key: 'credit', label: 'Credit' },
  { key: 'institutional', label: 'Institutional' },
];

export default function FinancialIntelligence() {
  const [tab, setTab] = useState('tower');

  const { data: entities = [] } = useQuery({
    queryKey: ['operatingEntities'],
    queryFn: () => base44.entities.OperatingEntity.list('-annual_revenue'),
    staleTime: 5000,
  });

  const { data: lots = [] } = useQuery({
    queryKey: ['cattleLots'],
    queryFn: () => base44.entities.CattleLot.list('-created_date', 200),
    staleTime: 5000,
  });

  const { data: marketInputs = [] } = useQuery({
    queryKey: ['marketInputs'],
    queryFn: () => base44.entities.MarketInputs.list('-date', 1),
    staleTime: 5000,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: () => base44.entities.BankAccount.list('-created_date', 50),
    staleTime: 5000,
  });

  const latest = marketInputs?.[0] || {};

  // Derived enterprise financials
  const financials = useMemo(() => {
    const totalRevenue = entities.reduce((s, e) => s + (e.annual_revenue || 0), 0);
    const totalExpenses = entities.reduce((s, e) => s + (e.annual_expenses || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const activeLots = lots.filter(l => l.status === 'active');
    const totalHead = activeLots.reduce((s, l) => s + (l.head_count || 0), 0);
    const portfolioValue = activeLots.reduce((s, l) => s + ((l.current_weight || l.purchase_weight || 0) * (l.head_count || 0) * (latest.lc_futures || 241.66) / 100), 0);
    const totalAvailableFunds = bankAccounts.reduce((s, a) => s + (a.available_funds || 0), 0);
    const totalCreditLimit = bankAccounts.reduce((s, a) => s + (a.max_bid_limit || 0), 0);
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const capitalTurnover = portfolioValue > 0 ? totalRevenue / portfolioValue : 0;
    const sharpeRatio = profitMargin > 0 ? (profitMargin / 15).toFixed(2) : '0.00'; // simplified
    const debtToEquity = portfolioValue > 0 ? ((totalCreditLimit - totalAvailableFunds) / portfolioValue).toFixed(2) : '0.00';

    return {
      totalRevenue, totalExpenses, netProfit, profitMargin,
      activeLots: activeLots.length, totalHead, portfolioValue,
      totalAvailableFunds, totalCreditLimit, capitalTurnover,
      sharpeRatio, debtToEquity,
      monthlyRevenue: totalRevenue / 12,
      monthlyExpenses: totalExpenses / 12,
      monthlyCashFlow: (totalRevenue - totalExpenses) / 12,
      cashBurnRate: totalExpenses / 12,
      cashReserves: totalAvailableFunds,
      creditUsed: Math.max(0, totalCreditLimit - totalAvailableFunds),
      creditAvailable: totalAvailableFunds,
      lc: latest.lc_futures || 241.66,
      corn: latest.corn_price || 4.85,
      choiceCutout: latest.choice_cutout || 324.5,
    };
  }, [entities, lots, marketInputs, bankAccounts]);

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="FINANCIAL INTELLIGENCE CENTER"
        subtitle="AI-driven cash, capital, credit, control tower & institutional-grade analytics"
        badge="Sections 701–750"
      />

      {/* Tab Nav */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'tower' && <ControlTower financials={financials} entities={entities} lots={lots} />}
      {tab === 'cash' && <CashFlowEngine financials={financials} />}
      {tab === 'capital' && <CapitalEngine financials={financials} entities={entities} lots={lots} />}
      {tab === 'credit' && <CreditEngine financials={financials} bankAccounts={bankAccounts} />}
      {tab === 'institutional' && <InstitutionalEngine financials={financials} entities={entities} />}
    </div>
  );
}