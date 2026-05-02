import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import SectionHeader from '@/components/SectionHeader';
import { Activity, CheckCircle, AlertCircle, Zap, RefreshCw, BarChart3, Users, Database, Globe, Gauge, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function MasterControlDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);

  const { data: systemReport = {} } = useQuery({
    queryKey: ['masterSystemReport'],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('masterSystemOrchestrator', {});
        return res.data || {};
      } catch (err) {
        console.error('System report error:', err);
        return { error: err.message };
      }
    },
    staleTime: 0,
    refetchInterval: 30000,
  });

  const handleSystemAudit = async () => {
    try {
      setIsRunning(true);
      toast.loading('Running complete system audit...');
      await qc.refetchQueries({ queryKey: ['masterSystemReport'] });
      toast.success('System audit complete');
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
          <div className="text-sm text-muted-foreground">Master Control requires administrator access</div>
        </div>
      </div>
    );
  }

  const healthScore = systemReport.systemHealthScore || 0;
  const isHealthy = healthScore >= 80;
  const totalIssues = systemReport.totalIssues || 0;

  return (
    <div className="p-6 space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="MASTER CONTROL DASHBOARD"
          subtitle="AI-powered complete platform control: all domains, users, data, operations, and projections monitored and synced in real-time"
          badge="Full System Control"
        />
        <button
          onClick={handleSystemAudit}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Zap className="w-4 h-4" />
          {isRunning ? 'Auditing...' : 'Full System Audit'}
        </button>
      </div>

      {/* System Health Overview */}
      <div className={`border rounded-lg p-6 ${isHealthy ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Gauge className={`w-12 h-12 ${isHealthy ? 'text-success' : 'text-warning'}`} />
            <div>
              <h2 className={`font-bebas text-3xl ${isHealthy ? 'text-success' : 'text-warning'}`}>
                {healthScore}/100
              </h2>
              <p className="text-sm text-muted-foreground">System Health Score</p>
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="text-xs text-muted-foreground">Status</div>
            <div className={`font-bebas text-xl ${isHealthy ? 'text-success' : 'text-warning'}`}>
              {isHealthy ? '✓ OPTIMAL' : '⚠ ATTENTION'}
            </div>
            {systemReport.timestamp && (
              <div className="text-xs text-muted-foreground mt-2">{format(new Date(systemReport.timestamp), 'h:mm:ss a')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Core System Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Total Entities</span>
          </div>
          <div className="font-bebas text-2xl text-primary">{Object.keys(systemReport.entities || {}).length}</div>
          <div className="text-xs text-muted-foreground mt-1">Data domains</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-success" />
            <span className="text-xs font-medium text-muted-foreground">Active Users</span>
          </div>
          <div className="font-bebas text-2xl text-success">{systemReport.users?.totalUsers || 0}</div>
          <div className="text-xs text-muted-foreground mt-1">{systemReport.users?.activeAdmins || 0} admins</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-warning" />
            <span className="text-xs font-medium text-muted-foreground">Domain Sync</span>
          </div>
          <div className="font-bebas text-2xl text-warning">{systemReport.domainSync?.synced || 0}/{systemReport.domainSync?.total || 0}</div>
          <div className="text-xs text-muted-foreground mt-1">Orders synced</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-danger" />
            <span className="text-xs font-medium text-muted-foreground">System Issues</span>
          </div>
          <div className={`font-bebas text-2xl ${totalIssues > 0 ? 'text-danger' : 'text-success'}`}>{totalIssues}</div>
          <div className="text-xs text-muted-foreground mt-1">Detected</div>
        </div>
      </div>

      {/* Live Market Feed */}
      {systemReport.marketData && (
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-bebas text-lg text-foreground mb-4">LIVE MARKET FEED</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-secondary/30 rounded-lg">
              <div className="text-xs text-muted-foreground">LC Futures</div>
              <div className="font-bebas text-xl text-primary">${systemReport.marketData.lc_futures}</div>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Choice Cutout</div>
              <div className="font-bebas text-xl text-success">${systemReport.marketData.choice_cutout}</div>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg">
              <div className="text-xs text-muted-foreground">90s Trim</div>
              <div className="font-bebas text-xl text-warning">${systemReport.marketData.trim_90s}</div>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Data Date</div>
              <div className="font-bebas text-lg text-foreground">{systemReport.marketData.date}</div>
            </div>
          </div>
        </div>
      )}

      {/* Entity Status Grid */}
      {systemReport.entities && (
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-bebas text-lg text-foreground mb-4">DOMAIN STATUS</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(systemReport.entities).map(([name, data]) => (
              <div key={name} className={`p-3 rounded-lg border ${data.status === 'ok' ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{name}</span>
                  {data.status === 'ok' ? (
                    <CheckCircle className="w-3 h-3 text-success" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-warning" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.totalRecords} records {data.status !== 'ok' ? `• ${data.status}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues Detail */}
      {systemReport.issues && systemReport.issues.length > 0 && (
        <div className="bg-card border border-warning/20 rounded-lg p-5">
          <h3 className="font-bebas text-lg text-warning mb-3">SYSTEM ALERTS ({systemReport.issues.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {systemReport.issues.slice(0, 20).map((issue, idx) => (
              <div key={idx} className="flex gap-3 p-3 bg-warning/5 rounded border border-warning/10 text-xs">
                <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-muted-foreground">{issue}</div>
              </div>
            ))}
            {systemReport.issues.length > 20 && (
              <div className="text-xs text-muted-foreground italic p-2">
                +{systemReport.issues.length - 20} more issues...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Automations */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-bebas text-lg text-foreground mb-4">ACTIVE AI CONTROLLERS</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-success" />
              <div>
                <div className="text-sm font-medium text-foreground">Live Market Data Sync</div>
                <div className="text-xs text-muted-foreground">CME/USDA every 5 minutes</div>
              </div>
            </div>
            <span className="text-xs bg-success/20 text-success px-2 py-1 rounded font-medium">ACTIVE</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-success" />
              <div>
                <div className="text-sm font-medium text-foreground">Master System Orchestrator</div>
                <div className="text-xs text-muted-foreground">Complete platform audit every 5 minutes</div>
              </div>
            </div>
            <span className="text-xs bg-success/20 text-success px-2 py-1 rounded font-medium">ACTIVE</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-success" />
              <div>
                <div className="text-sm font-medium text-foreground">Bidirectional Domain Sync</div>
                <div className="text-xs text-muted-foreground">Public ↔ Admin real-time</div>
              </div>
            </div>
            <span className="text-xs bg-success/20 text-success px-2 py-1 rounded font-medium">ACTIVE</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-success" />
              <div>
                <div className="text-sm font-medium text-foreground">Platform Master Controller</div>
                <div className="text-xs text-muted-foreground">AI system control and management</div>
              </div>
            </div>
            <span className="text-xs bg-success/20 text-success px-2 py-1 rounded font-medium">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* System Architecture */}
      <div className="bg-secondary/20 border border-border/50 rounded-lg p-5 text-sm text-muted-foreground space-y-2">
        <p><strong>✓ Live Market Feed:</strong> CME futures (LC, GF, Corn) & USDA cutouts synced every 5 minutes</p>
        <p><strong>✓ Real-time Data Validation:</strong> All 14+ entities monitored for integrity and staleness</p>
        <p><strong>✓ User Management:</strong> Active account monitoring, inactive detection, role management</p>
        <p><strong>✓ Cross-Domain Sync:</strong> Public orders ↔ Admin approvals with instant propagation</p>
        <p><strong>✓ Financial Projections:</strong> All ROI, profit, and margin calculations validated against live market</p>
        <p><strong>✓ Cattle Operations:</strong> All lot projections, health protocols, and feeding programs monitored</p>
        <p><strong>✓ Auto-Corrections:</strong> Data discrepancies, stale records, and calculation errors auto-corrected</p>
        <p><strong>✓ Complete Visibility:</strong> Master AI has full read/write access to all domains and operations</p>
      </div>
    </div>
  );
}