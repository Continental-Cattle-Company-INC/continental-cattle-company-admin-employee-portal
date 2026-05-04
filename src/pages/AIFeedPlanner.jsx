import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import SectionHeader from '@/components/SectionHeader';
import { Sparkles, Wheat, Syringe, RefreshCw, ChevronDown, ChevronRight, Download, AlertCircle, TrendingUp, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const PLAN_TYPES = [
  { value: 'full', label: 'Full Program (Ration + Vaccination)', icon: Sparkles },
  { value: 'ration', label: 'Feed Ration Only', icon: Wheat },
  { value: 'vaccination', label: 'Vaccination Schedule Only', icon: Syringe },
];

const FOCUS = [
  { value: 'roi', label: 'Max ROI' },
  { value: 'grade', label: 'Max Grade & Yield (Prime/Choice)' },
  { value: 'adr', label: 'Max ADR / Speed to Market' },
  { value: 'cost', label: 'Minimize Cost of Gain' },
  { value: 'balanced', label: 'Balanced (Grade + Cost + ROI)' },
];

function PlanSection({ title, icon: SectionIcon, color, content, defaultOpen = false }) {
  const Icon = SectionIcon;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border rounded-xl overflow-hidden ${color}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors text-left">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5" />
          <span className="font-bebas text-lg tracking-wide">{title}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 opacity-60" /> : <ChevronRight className="w-4 h-4 opacity-60" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-white/10">
          <div className="mt-4 prose prose-sm prose-invert max-w-none text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AIFeedPlanner() {
  const { user } = useAuth();
  const [selectedLot, setSelectedLot] = useState('');
  const [planType, setPlanType] = useState('full');
  const [focus, setFocus] = useState('balanced');
  const [daysOnFeed, setDaysOnFeed] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [environment, setEnvironment] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);

  const { data: lots = [] } = useQuery({
    queryKey: ['activeLots'],
    queryFn: () => base44.entities.CattleLot.filter({ status: 'active' }, '-purchase_date', 200),
  });

  const { data: feedProtocols = [] } = useQuery({
    queryKey: ['feedProtocols'],
    queryFn: () => base44.entities.FeedProtocol.list('-cost_per_ton', 50),
  });

  const { data: healthProtocols = [] } = useQuery({
    queryKey: ['healthProtocols'],
    queryFn: () => base44.entities.HealthProtocol.list('protocol_name', 50),
  });

  const { data: marketInputs = [] } = useQuery({
    queryKey: ['marketInputs'],
    queryFn: () => base44.entities.MarketInputs.list('-date', 1),
  });

  const { data: healthEvents = [] } = useQuery({
    queryKey: ['healthEvents', selectedLot],
    queryFn: () => selectedLot
      ? base44.entities.LotHealthEvent.filter({ cattle_lot_id: selectedLot }, '-event_date', 50)
      : Promise.resolve([]),
    enabled: !!selectedLot,
  });

  const lot = lots.find(l => l.id === selectedLot);
  const market = marketInputs[0];

  const buildPrompt = () => {
    const lotInfo = lot ? `
CATTLE LOT:
- Class: ${lot.cattle_class}
- Head Count: ${lot.head_count}
- Current Weight: ${lot.current_weight || 'unknown'} lbs/hd
- Purchase Weight: ${lot.purchase_weight} lbs/hd
- Target Weight: ${targetWeight || lot.target_weight || 'not set'} lbs/hd
- Stage: ${lot.stage}
- Yard: ${lot.yard || 'unknown'}, Pen: ${lot.pen || 'unknown'}
- Entity: ${lot.entity || 'unknown'}
- Cost of Gain: $${lot.cog || 'unknown'}/lb
- Yardage: $${lot.yardage || 0.45}/hd/day
- Days on Feed Target: ${daysOnFeed || 'optimize for target weight'}
` : 'No specific lot selected — generate general best-practice program.';

    const marketInfo = market ? `
CURRENT MARKET CONDITIONS (${market.date}):
- Live Cattle Futures: $${market.lc_futures}/cwt
- Feeder Cattle Futures: $${market.gf_futures}/cwt
- Choice Cutout: $${market.choice_cutout}/cwt
- Select Cutout: $${market.select_cutout}/cwt
- Prime Cutout: $${market.prime_cutout}/cwt
- Corn Price: $${market.corn_price}/bu
- Soybean Meal: $${market.sbm_price}/ton
- 90s Trim: $${market.trim_90s}/lb
- Import Volume: ${market.import_volume}, Export Volume: ${market.export_volume}
` : 'No live market data available — use current industry averages.';

    const feedInfo = feedProtocols.length > 0 ? `
AVAILABLE FEED COMMODITIES:
${feedProtocols.map(f => `- ${f.commodity_name}: $${f.cost_per_ton}/ton, TDN ${f.tdn_percent}%, CP ${f.cp_percent}%, ${f.daily_intake_head}lbs DMI/hd/day`).join('\n')}
` : '';

    const healthInfo = healthProtocols.length > 0 ? `
EXISTING HEALTH PROTOCOLS ON RECORD:
${healthProtocols.map(p => `- ${p.protocol_name} (${p.cattle_class}): ${p.action} at ${p.timing}, Product: ${p.product}, Dosage: ${p.dosage}, Cost: $${p.cost_per_head}/hd`).join('\n')}
` : '';

    const perfHistory = healthEvents.length > 0 ? `
HEALTH EVENT HISTORY FOR THIS LOT:
${healthEvents.slice(0, 20).map(e => `- ${e.event_date}: ${e.event_type}, ${e.head_affected} hd affected, ${e.diagnosis ? 'Dx: ' + e.diagnosis : ''} ${e.treatment ? 'Tx: ' + e.treatment : ''} ${e.cost_per_head ? '$' + e.cost_per_head + '/hd' : ''}`).join('\n')}
` : '';

    const envInfo = environment ? `\nENVIRONMENT / NOTES: ${environment}` : '';
    const extra = additionalContext ? `\nADDITIONAL CONTEXT: ${additionalContext}` : '';

    return `You are a world-class livestock nutritionist and cattle herd health veterinarian with deep expertise in beef production economics. 

Generate a comprehensive, highly specific ${planType === 'full' ? 'FEED RATION AND VACCINATION SCHEDULE' : planType === 'ration' ? 'FEED RATION PROGRAM' : 'VACCINATION AND HEALTH SCHEDULE'} optimized for: ${FOCUS.find(f => f.value === focus)?.label.toUpperCase()}.

${lotInfo}
${marketInfo}
${feedInfo}
${healthInfo}
${perfHistory}
${envInfo}
${extra}

Produce your output in the following structured sections:

${planType !== 'vaccination' ? `## 🌾 RATION PROGRAM

Provide a phase-by-phase ration (starter/grower/finisher or whatever phases fit the cattle class and stage):
- For each phase: days range, daily DMI (lbs), ingredient list with exact % and lbs/hd/day, TDN%, CP%, NEg, estimated ADG, estimated cost/hd/day
- Specify any additives (ionophores, beta-agonists, implants, buffers, vitamins/minerals)
- Include water requirements and bunk management tips
- Justify how this ration maximizes ${FOCUS.find(f => f.value === focus)?.label} given current corn/SBM prices and cutout values
- Flag any feed cost risk if futures move ±10%

` : ''}${planType !== 'ration' ? `## 💉 VACCINATION & HEALTH PROTOCOL

Provide a complete timeline from arrival/processing through market:
- Day 0 (Processing): vaccines, implants, parasite control, ID
- Day 14-21 boosters
- Mid-feeding re-implant schedule
- Pre-shipment health checks
- BQA-compliant withdrawal times for all products
- Specific product recommendations (e.g. Pyramid 5+Presponse HM, Dectomax, Ralgro, Optaflexx)
- Estimated total health cost per head

` : ''}## 📊 ECONOMIC PROJECTION

- Estimated total cost of production per head (feed + health + yardage + death loss)
- Projected sell weight and grade distribution (% Prime/Choice/Select)
- Projected revenue at current futures/cutout
- Estimated net profit per head and total lot profit
- ROI %
- Break-even sell price ($/cwt)
- Key assumptions and risks

## ⚡ AI RECOMMENDATIONS

- Top 3 specific adjustments to make RIGHT NOW based on market conditions
- Red flags or risks to watch
- Optimal days-on-feed / target weight recommendation given current futures spread
- Any lot-specific concerns based on health event history`;
  };

  const generatePlan = async () => {
    if (!selectedLot && lots.length > 0) {
      toast.error('Please select a cattle lot');
      return;
    }
    setLoading(true);
    setPlan(null);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: buildPrompt(),
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          ration_program: { type: 'string' },
          vaccination_schedule: { type: 'string' },
          economic_projection: { type: 'string' },
          ai_recommendations: { type: 'string' },
          summary: { type: 'string', description: 'One paragraph executive summary' },
          estimated_profit_per_head: { type: 'number' },
          estimated_roi_percent: { type: 'number' },
          estimated_cost_per_head: { type: 'number' },
          target_grade: { type: 'string' },
        }
      }
    });
    setPlan(result);
    setLoading(false);
    toast.success('AI plan generated');
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <SectionHeader
        title="AI FEED & HEALTH PLANNER"
        subtitle="AI-optimized rations, vaccination schedules, and economic projections per lot"
        badge="AI POWERED"
      />

      {/* Config Panel */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h3 className="font-bebas text-primary text-lg">CONFIGURE AI PLAN</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lot selector */}
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Cattle Lot</label>
            <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={selectedLot} onChange={e => setSelectedLot(e.target.value)}>
              <option value="">General best-practice program (no specific lot)</option>
              {lots.map(l => (
                <option key={l.id} value={l.id}>
                  {l.lot_id || l.cattle_class} — {l.head_count} hd @ {l.current_weight || l.purchase_weight} lbs — {l.yard} Pen {l.pen}
                </option>
              ))}
            </select>
          </div>

          {/* Plan type */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Plan Type</label>
            <div className="space-y-2">
              {PLAN_TYPES.map(pt => (
                <label key={pt.value} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-secondary/40 transition-colors">
                  <input type="radio" name="planType" value={pt.value} checked={planType === pt.value}
                    onChange={() => setPlanType(pt.value)} className="accent-primary" />
                  <pt.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{pt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Optimization focus */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Optimization Focus</label>
            <div className="space-y-2">
              {FOCUS.map(f => (
                <label key={f.value} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-secondary/40 transition-colors">
                  <input type="radio" name="focus" value={f.value} checked={focus === f.value}
                    onChange={() => setFocus(f.value)} className="accent-primary" />
                  <span className="text-sm text-foreground">{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Target Days on Feed</label>
            <input type="number" placeholder="e.g. 180" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={daysOnFeed} onChange={e => setDaysOnFeed(e.target.value)} />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Target Sell Weight (lbs/hd)</label>
            <input type="number" placeholder="e.g. 1350" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={targetWeight} onChange={e => setTargetWeight(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Environment / Climate / Region</label>
            <input placeholder="e.g. Southern Plains, summer heat, open lot, no shade" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={environment} onChange={e => setEnvironment(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Additional Context / Special Instructions</label>
            <textarea rows={2} placeholder="e.g. High morbidity last 2 weeks, buyer wants CAB-eligible, avoid beta-agonists for export market..." className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground resize-none"
              value={additionalContext} onChange={e => setAdditionalContext(e.target.value)} />
          </div>
        </div>

        {/* Context preview */}
        {lot && (
          <div className="flex flex-wrap gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs">
            <span className="text-primary font-medium">Lot Context Loaded:</span>
            <span className="text-muted-foreground">{lot.cattle_class}</span>
            <span className="text-muted-foreground">{lot.head_count} hd</span>
            <span className="text-muted-foreground">{lot.current_weight || lot.purchase_weight} lbs/hd</span>
            <span className="text-muted-foreground">Stage: {lot.stage}</span>
            {market && <span className="text-success">+ Live market data</span>}
            {feedProtocols.length > 0 && <span className="text-success">+ {feedProtocols.length} feed commodities</span>}
            {healthProtocols.length > 0 && <span className="text-success">+ {healthProtocols.length} health protocols</span>}
            {healthEvents.length > 0 && <span className="text-warning">+ {healthEvents.length} health events history</span>}
          </div>
        )}

        <button
          onClick={generatePlan}
          disabled={loading}
          className="flex items-center gap-3 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bebas text-lg tracking-wide hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {loading ? 'GENERATING AI PLAN...' : 'GENERATE AI PLAN'}
        </button>
        {loading && (
          <p className="text-xs text-muted-foreground">Analyzing lot data, market conditions, feed costs, health history, futures — this takes 15–30 seconds...</p>
        )}
      </div>

      {/* Results */}
      {plan && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          {(plan.estimated_profit_per_head || plan.estimated_roi_percent || plan.estimated_cost_per_head) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Est. Profit / Head', value: plan.estimated_profit_per_head != null ? `${plan.estimated_profit_per_head >= 0 ? '+' : ''}$${plan.estimated_profit_per_head.toFixed(0)}` : '—', color: plan.estimated_profit_per_head >= 0 ? 'text-success' : 'text-danger' },
                { label: 'Est. ROI %', value: plan.estimated_roi_percent != null ? `${plan.estimated_roi_percent.toFixed(1)}%` : '—', color: plan.estimated_roi_percent >= 0 ? 'text-success' : 'text-danger' },
                { label: 'Cost / Head', value: plan.estimated_cost_per_head != null ? `$${plan.estimated_cost_per_head.toFixed(0)}` : '—', color: 'text-warning' },
                { label: 'Target Grade', value: plan.target_grade || '—', color: 'text-primary' },
              ].map(k => (
                <div key={k.label} className="bg-card border border-border rounded-xl p-4 text-center">
                  <div className={`font-bebas text-2xl ${k.color}`}>{k.value}</div>
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Executive Summary */}
          {plan.summary && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-bebas text-primary text-base">EXECUTIVE SUMMARY</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{plan.summary}</p>
            </div>
          )}

          {/* Collapsible sections */}
          <div className="space-y-3">
            {plan.ration_program && planType !== 'vaccination' && (
              <PlanSection
                title="🌾 FEED RATION PROGRAM"
                icon={Wheat}
                color="bg-amber-500/5 border-amber-500/20 text-amber-200"
                content={plan.ration_program}
                defaultOpen={true}
              />
            )}
            {plan.vaccination_schedule && planType !== 'ration' && (
              <PlanSection
                title="💉 VACCINATION & HEALTH SCHEDULE"
                icon={Syringe}
                color="bg-success/5 border-success/20 text-success"
                content={plan.vaccination_schedule}
                defaultOpen={planType === 'vaccination'}
              />
            )}
            {plan.economic_projection && (
              <PlanSection
                title="📊 ECONOMIC PROJECTION"
                icon={TrendingUp}
                color="bg-blue-500/5 border-blue-500/20 text-blue-300"
                content={plan.economic_projection}
                defaultOpen={false}
              />
            )}
            {plan.ai_recommendations && (
              <PlanSection
                title="⚡ AI RECOMMENDATIONS"
                icon={Sparkles}
                color="bg-primary/5 border-primary/20 text-primary"
                content={plan.ai_recommendations}
                defaultOpen={false}
              />
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            Generated by AI using live market data, lot performance, and feed commodity costs. Always validate with your nutritionist and veterinarian.
          </p>
        </div>
      )}
    </div>
  );
}