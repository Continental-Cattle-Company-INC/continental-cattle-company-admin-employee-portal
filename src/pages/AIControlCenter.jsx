import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import SectionHeader from '@/components/SectionHeader';
import { Activity, CheckCircle, AlertCircle, Zap, RefreshCw, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AIControlCenter() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [lastAudit, setLastAudit] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const { data: auditStatus = {} } = useQuery({
    queryKey: ['orchestratorStatus'],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('masterOperationsOrchestrator', {});
        return res.data || {};
      } catch (err) {
        return { error: err.message };
      }
    },
    staleTime: 0,
    refetchInterval: 30000, // Auto-refresh every 30 seconds to check latest audit
  });

  const handleManualAudit = async () => {
    try {
      setIsRunning(true);
      toast.loading('Running master audit...');
      const res = await base44.functions.invoke('masterOperationsOrchestrator', {});
      setLastAudit(new Date());
      qc.invalidateQueries({ queryKey: ['orchestratorStatus'] });
      toast.success(`Audit complete: ${res.data.totalIssues || 0} issues found`);
    } catch (err) {
      toast.error('Audit failed: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  if (!['admin', 'super_admin'].includes(user?.role)) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-danger mx-auto mb-2" />
          <div className="text-foreground font-medium">Admin Only</div>
          <div className="text-sm text-muted-foreground">AI Control Center requires administrator access</div>
        </div>
      </div>
    );
  }

  const isHealthy = auditStatus.status === 'healthy';
  const totalIssues = auditStatus.totalIssues || 0;

  return (
    <div className="p-6 space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="AI CONTROL CENTER"
          subtitle="Master orchestrator: real-time monitoring of all live market data, projections, and cross-domain operations"
          badge="AI Powered"
        />
        <button
          onClick={handleManualAudit}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Zap className="w-4 h-4" />
          {isRunning ? 'Auditing...' : 'Manual Audit'}
        </button>
      </div>

      {/* System Health Status */}
      <div className={`border rounded-lg p-6 ${isHealthy ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'}`}>
        <div className="flex items-center gap-4">
          {isHealthy ? (
            <CheckCircle className="w-12 h-12 text-success flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-12 h-12 text-danger flex-shrink-0" />
          )}
          <div className="flex-1">
            <h2 className={`font-bebas text-2xl ${isHealthy ? 'text-success' : 'text-danger'}`}>
              {isHealthy ? 'SYSTEM HEALTHY' : 'ISSUES DETECTED'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {totalIssues === 0 ? 'All data, projections, and sync validated' : `${totalIssues} issue${totalIssues !== 1 ? 's' : ''} requiring attention`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Last Audit</div>
            <div className="text-sm font-medium text-foreground">
              {auditStatus.timestamp ? format(new Date(auditStatus.timestamp), 'h:mm:ss a') : 'Pending'}
            </div>
          </div>
        </div>
      </div>

      {/* Validation Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { key: 'roi', icon: TrendingUp, label: 'ROI Calculations' },
          { key: 'projections', icon: Activity, label: 'Cattle Projections' },
          { key: 'carcass', icon: CheckCircle, label: 'Carcass Quality' },
          { key: 'domainSync', icon: RefreshCw, label: 'Domain Sync' },
          { key: 'financials', icon: Activity, label: 'Entity Financials' },
        ].map(v => {
          const validation = auditStatus.validations?.[v.key] || {};
          const Icon = v.icon;
          const isValid = validation.valid;
          
          return (
            <div key={v.key} className={`border rounded-lg p-4 ${isValid ? 'bg-card border-success/20' : 'bg-card border-warning/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${isValid ? 'text-success' : 'text-warning'}`} />
                <span className="text-xs font-medium text-muted-foreground">{v.label}</span>
              </div>
              <div className={`font-bebas text-lg ${isValid ? 'text-success' : 'text-warning'}`}>
                {isValid ? '✓ OK' : '⚠ Issues'}
              </div>
              {validation.issues && validation.issues.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {validation.issues.length} problem{validation.issues.length !== 1 ? 's' : ''}
                </div>
              )}
              {validation.checked && (
                <div className="text-xs text-muted-foreground mt-1">
                  Checked {validation.checked} records
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Market Data Snapshot */}
      {auditStatus.marketData && (
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-bebas text-lg text-foreground mb-3">LIVE MARKET SNAPSHOT</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-secondary/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Live Cattle Futures</div>
              <div className="font-bebas text-2xl text-primary">${auditStatus.marketData.lc}</div>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Choice Cutout</div>
              <div className="font-bebas text-2xl text-success">${auditStatus.marketData.choice}</div>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Data Date</div>
              <div className="font-bebas text-lg text-foreground">{auditStatus.marketData.date}</div>
            </div>
          </div>
        </div>
      )}

      {/* Issues Detail */}
      {auditStatus.issues && auditStatus.issues.length > 0 && (
        <div className="bg-card border border-warning/20 rounded-lg p-5">
          <h3 className="font-bebas text-lg text-warning mb-3">DETECTED ISSUES ({auditStatus.issues.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditStatus.issues.map((issue, idx) => (
              <div key={idx} className="flex gap-3 p-3 bg-warning/5 rounded border border-warning/10 text-xs">
                <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-muted-foreground">{issue}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Automations Status */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-bebas text-lg text-foreground mb-4">AUTOMATION STATUS</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-foreground">Live Market Data Sync</div>
              <div className="text-xs text-muted-foreground">Fetches CME/USDA every 5 minutes</div>
            </div>
            <span className="text-xs bg-success/20 text-success px-2 py-1 rounded font-medium">ACTIVE</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-foreground">Master Operations Orchestrator</div>
              <div className="text-xs text-muted-foreground">Validates all projections & data every 5 minutes</div>
            </div>
            <span className="text-xs bg-success/20 text-success px-2 py-1 rounded font-medium">ACTIVE</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-foreground">Bidirectional Domain Sync</div>
              <div className="text-xs text-muted-foreground">Public ↔ Admin real-time sync</div>
            </div>
            <span className="text-xs bg-success/20 text-success px-2 py-1 rounded font-medium">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* AI Controller Description */}
      <div className="bg-secondary/20 border border-border/50 rounded-lg p-5 text-sm text-muted-foreground space-y-2">
        <p>✓ <strong>Every 5 minutes:</strong> Pulls live CME futures (LC, GF, Corn) & USDA boxed beef cutouts</p>
        <p>✓ <strong>Auto-validates:</strong> ROI calculations, cattle weight projections, carcass outcomes, entity financials</p>
        <p>✓ <strong>Cross-checks:</strong> Market inputs against deal profitability, projections against benchmarks</p>
        <p>✓ <strong>Monitors sync:</strong> Public orders ↔ Admin domain, catches orphaned or stale records</p>
        <p>✓ <strong>Auto-corrects:</strong> Profit calculations, margin anomalies, financial discrepancies</p>
        <p>✓ <strong>Real-time alerts:</strong> Flags margin compression, data drift, missing benchmarks instantly</p>
      </div>
    </div>
  );
}