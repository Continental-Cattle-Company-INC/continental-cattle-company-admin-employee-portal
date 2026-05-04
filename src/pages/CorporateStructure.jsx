import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Plus, ChevronDown, ChevronRight, Building2, Shield, Briefcase, Users, DollarSign, Edit2, X, Check } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import { toast } from 'sonner';

const TIER_CONFIG = {
  tier_1_beneficiary:   { label: 'Personal Trust (Beneficiary)', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: Users },
  tier_2_business_trust:{ label: 'Business Trust', color: 'text-primary', bg: 'bg-primary/10 border-primary/20', icon: Shield },
  tier_3_corporation:   { label: 'Corporation', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Building2 },
  tier_4_llc:           { label: 'LLC / DBA', color: 'text-success', bg: 'bg-success/10 border-success/20', icon: Briefcase },
};

const TIERS = ['tier_1_beneficiary','tier_2_business_trust','tier_3_corporation','tier_4_llc'];

const BLANK_FORM = {
  entity_name: '', entity_type: 'personal_trust', dba_name: '', tier: 'tier_1_beneficiary',
  parent_entity: '', ownership_percent: '', ein: '', state_of_formation: '',
  primary_function: '', revenue_stream: '', monthly_revenue: '', monthly_expenses: '',
  annual_revenue: '', annual_expenses: '', responsible_manager: '', trustee: '',
  beneficiary_of: '', registered_agent: '', status: 'active', notes: '',
};

const ENTITY_TYPE_BY_TIER = {
  tier_1_beneficiary: 'personal_trust',
  tier_2_business_trust: 'business_trust',
  tier_3_corporation: 'corporation',
  tier_4_llc: 'LLC',
};

function EntityCard({ entity, allEntities, onEdit, canEdit }) {
  const [open, setOpen] = useState(false);
  const cfg = TIER_CONFIG[entity.tier] || TIER_CONFIG.tier_4_llc;
  const Icon = cfg.icon;
  const children = allEntities.filter(e => e.parent_entity === entity.entity_name);
  const profit = (entity.annual_revenue || 0) - (entity.annual_expenses || 0);

  return (
    <div className={`border rounded-xl overflow-hidden ${cfg.bg}`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left">
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-bebas text-base ${cfg.color}`}>{entity.entity_name}</span>
              {entity.dba_name && <span className="text-xs text-muted-foreground">DBA: {entity.dba_name}</span>}
              <span className={`text-xs px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            </div>
            <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
              {entity.state_of_formation && <span>{entity.state_of_formation}</span>}
              {entity.responsible_manager && <span>Mgr: {entity.responsible_manager}</span>}
              {entity.trustee && <span>Trustee: {entity.trustee}</span>}
              {entity.parent_entity && <span>↑ {entity.parent_entity}</span>}
              {entity.ownership_percent && <span>{entity.ownership_percent}% owned</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {entity.annual_revenue > 0 && (
            <span className={`text-xs font-medium ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
              {profit >= 0 ? '+' : ''}${profit.toLocaleString()}/yr
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded capitalize ${entity.status === 'active' ? 'text-success' : 'text-muted-foreground'}`}>{entity.status}</span>
          {canEdit && <button onClick={e => { e.stopPropagation(); onEdit(entity); }} className="p-1 hover:bg-white/10 rounded"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>}
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-white/10 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {entity.ein && <div><span className="text-muted-foreground">EIN: </span><span className="text-foreground font-mono">{entity.ein}</span></div>}
            {entity.primary_function && <div><span className="text-muted-foreground">Function: </span><span className="text-foreground">{entity.primary_function}</span></div>}
            {entity.revenue_stream && <div><span className="text-muted-foreground">Revenue: </span><span className="text-foreground">{entity.revenue_stream}</span></div>}
            {entity.registered_agent && <div><span className="text-muted-foreground">Agent: </span><span className="text-foreground">{entity.registered_agent}</span></div>}
            {entity.beneficiary_of && <div><span className="text-muted-foreground">Beneficiary of: </span><span className="text-primary">{entity.beneficiary_of}</span></div>}
          </div>

          {/* Financial Summary */}
          {(entity.annual_revenue > 0 || entity.annual_expenses > 0) && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Annual Revenue', value: `$${(entity.annual_revenue || 0).toLocaleString()}`, color: 'text-success' },
                { label: 'Annual Expenses', value: `$${(entity.annual_expenses || 0).toLocaleString()}`, color: 'text-danger' },
                { label: 'Net Profit', value: `${profit >= 0 ? '+' : ''}$${profit.toLocaleString()}`, color: profit >= 0 ? 'text-success' : 'text-danger' },
              ].map(s => (
                <div key={s.label} className="bg-black/20 rounded-lg p-2 text-center">
                  <div className={`font-bebas text-lg ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {entity.notes && <p className="text-xs text-muted-foreground italic">{entity.notes}</p>}

          {/* Child entities inline */}
          {children.length > 0 && (
            <div className="space-y-1 pl-3 border-l-2 border-white/10">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{children.length} subsidiaries / beneficiaries</div>
              {children.map(child => (
                <div key={child.id} className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs ${TIER_CONFIG[child.tier]?.bg}`}>
                  <span className={`font-medium ${TIER_CONFIG[child.tier]?.color}`}>{child.entity_name}</span>
                  {child.dba_name && <span className="text-muted-foreground">DBA: {child.dba_name}</span>}
                  {child.ownership_percent && <span className="text-muted-foreground">{child.ownership_percent}%</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EntityForm({ initial, allEntities, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);

  const handleTierChange = (tier) => {
    setForm(f => ({ ...f, tier, entity_type: ENTITY_TYPE_BY_TIER[tier] || f.entity_type }));
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h3 className="font-bebas text-lg text-primary">{initial.id ? 'EDIT ENTITY' : 'ADD ENTITY'}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Tier / Level *</label>
          <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.tier} onChange={e => handleTierChange(e.target.value)}>
            {TIERS.map(t => <option key={t} value={t}>{TIER_CONFIG[t].label}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Legal Entity Name *</label>
          <input required className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.entity_name} onChange={e => setForm(f => ({ ...f, entity_name: e.target.value }))} placeholder="Full legal name" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {form.tier === 'tier_4_llc' && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">DBA Name</label>
            <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={form.dba_name} onChange={e => setForm(f => ({ ...f, dba_name: e.target.value }))} />
          </div>
        )}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Parent Entity</label>
          <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.parent_entity} onChange={e => setForm(f => ({ ...f, parent_entity: e.target.value }))}>
            <option value="">None (top level)</option>
            {allEntities.filter(e => e.id !== form.id).map(e => <option key={e.id} value={e.entity_name}>{e.entity_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Ownership %</label>
          <input type="number" min="0" max="100" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.ownership_percent} onChange={e => setForm(f => ({ ...f, ownership_percent: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">State of Formation</label>
          <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.state_of_formation} onChange={e => setForm(f => ({ ...f, state_of_formation: e.target.value }))} placeholder="TX, DE, etc." />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">EIN / Tax ID</label>
          <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono"
            value={form.ein} onChange={e => setForm(f => ({ ...f, ein: e.target.value }))} placeholder="XX-XXXXXXX" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {['tier_1_beneficiary','tier_2_business_trust'].includes(form.tier) && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Trustee</label>
            <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={form.trustee} onChange={e => setForm(f => ({ ...f, trustee: e.target.value }))} />
          </div>
        )}
        {form.tier === 'tier_1_beneficiary' && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Beneficiary Of (Business Trust)</label>
            <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={form.beneficiary_of} onChange={e => setForm(f => ({ ...f, beneficiary_of: e.target.value }))}>
              <option value="">Select trust...</option>
              {allEntities.filter(e => e.entity_type === 'business_trust').map(e => <option key={e.id} value={e.entity_name}>{e.entity_name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Responsible Manager</label>
          <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.responsible_manager} onChange={e => setForm(f => ({ ...f, responsible_manager: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Primary Function</label>
          <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.primary_function} onChange={e => setForm(f => ({ ...f, primary_function: e.target.value }))} placeholder="e.g. Cattle Operations" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: 'annual_revenue', label: 'Annual Revenue' },
          { key: 'annual_expenses', label: 'Annual Expenses' },
          { key: 'monthly_revenue', label: 'Monthly Revenue' },
          { key: 'monthly_expenses', label: 'Monthly Expenses' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
            <input type="number" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
          </div>
        ))}
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
        <textarea rows={2} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground resize-none"
          value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
      <div className="flex gap-3">
        <button onClick={() => onSave(form)} disabled={saving || !form.entity_name}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
          <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Entity'}
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-2 px-6 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  );
}

export default function CorporateStructure() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editEntity, setEditEntity] = useState(null);

  const isAdmin = ['admin', 'super_admin'].includes(user?.role);
  const canView = ['admin', 'super_admin', 'accountant', 'attorney_cpa', 'manager'].includes(user?.role);

  const { data: entities = [] } = useQuery({
    queryKey: ['operatingEntities'],
    queryFn: () => base44.entities.OperatingEntity.list('tier', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OperatingEntity.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['operatingEntities'] }); toast.success('Entity added'); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OperatingEntity.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['operatingEntities'] }); toast.success('Entity updated'); setEditEntity(null); },
  });

  const handleSave = (form) => {
    const payload = {
      ...form,
      ownership_percent: form.ownership_percent ? Number(form.ownership_percent) : undefined,
      annual_revenue: form.annual_revenue ? Number(form.annual_revenue) : undefined,
      annual_expenses: form.annual_expenses ? Number(form.annual_expenses) : undefined,
      monthly_revenue: form.monthly_revenue ? Number(form.monthly_revenue) : undefined,
      monthly_expenses: form.monthly_expenses ? Number(form.monthly_expenses) : undefined,
    };
    if (form.id) updateMutation.mutate({ id: form.id, data: payload });
    else createMutation.mutate(payload);
  };

  // Consolidated financials
  const totalRevenue = entities.reduce((s, e) => s + (e.annual_revenue || 0), 0);
  const totalExpenses = entities.reduce((s, e) => s + (e.annual_expenses || 0), 0);
  const totalProfit = totalRevenue - totalExpenses;

  const byTier = TIERS.reduce((acc, t) => {
    acc[t] = entities.filter(e => e.tier === t);
    return acc;
  }, {});

  if (!canView) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-center text-muted-foreground">
          <Shield className="w-8 h-8 mx-auto mb-2" />
          <div>Access restricted to admin and financial team</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="CORPORATE STRUCTURE"
          subtitle="Ownership hierarchy: Personal Trusts → Business Trust → Corporation → LLCs"
          badge="Confidential"
        />
        {isAdmin && !showForm && !editEntity && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Entity
          </button>
        )}
      </div>

      {/* Consolidated Financials */}
      {totalRevenue > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Annual Revenue', value: `$${totalRevenue.toLocaleString()}`, color: 'text-success' },
            { label: 'Total Annual Expenses', value: `$${totalExpenses.toLocaleString()}`, color: 'text-danger' },
            { label: 'Consolidated Net Profit', value: `${totalProfit >= 0 ? '+' : ''}$${totalProfit.toLocaleString()}`, color: totalProfit >= 0 ? 'text-success' : 'text-danger' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
              <div className={`font-bebas text-2xl ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <EntityForm initial={BLANK_FORM} allEntities={entities}
          onSave={handleSave} onCancel={() => setShowForm(false)}
          saving={createMutation.isPending} />
      )}
      {editEntity && (
        <EntityForm initial={editEntity} allEntities={entities}
          onSave={handleSave} onCancel={() => setEditEntity(null)}
          saving={updateMutation.isPending} />
      )}

      {/* Hierarchy Display */}
      {TIERS.map(tier => {
        const tierEntities = byTier[tier];
        if (tierEntities.length === 0) return null;
        const cfg = TIER_CONFIG[tier];
        return (
          <div key={tier} className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`w-1 h-6 rounded-full ${tier === 'tier_1_beneficiary' ? 'bg-purple-500' : tier === 'tier_2_business_trust' ? 'bg-primary' : tier === 'tier_3_corporation' ? 'bg-blue-500' : 'bg-success'}`} />
              <h3 className={`font-bebas text-lg ${cfg.color}`}>{cfg.label}</h3>
              <span className="text-xs text-muted-foreground">({tierEntities.length})</span>
              {tier === 'tier_1_beneficiary' && <span className="text-xs text-muted-foreground italic">— beneficiaries of the Business Trust</span>}
              {tier === 'tier_4_llc' && <span className="text-xs text-muted-foreground italic">— each a DBA of the Corporation</span>}
            </div>
            <div className={`${tier === 'tier_4_llc' ? 'grid grid-cols-1 md:grid-cols-2 gap-2' : 'space-y-2'}`}>
              {tierEntities.map(entity => (
                <EntityCard key={entity.id} entity={entity} allEntities={entities}
                  onEdit={setEditEntity} canEdit={isAdmin} />
              ))}
            </div>
          </div>
        );
      })}

      {entities.length === 0 && !showForm && (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <div className="font-medium">No entities configured yet</div>
          <div className="text-sm mt-1">Start by adding your Business Trust, then the Corporation, then the LLCs</div>
          {isAdmin && (
            <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
              Add First Entity
            </button>
          )}
        </div>
      )}
    </div>
  );
}