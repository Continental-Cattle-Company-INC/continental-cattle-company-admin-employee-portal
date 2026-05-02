import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, AlertCircle, Zap, RefreshCw, Package, Shield, Inbox, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import SectionHeader from '@/components/SectionHeader';

function ActionCard({ action }) {
  const statusColors = {
    completed: 'bg-success/5 border-success/20 text-success',
    auto_approved: 'bg-success/5 border-success/20 text-success',
    error: 'bg-danger/5 border-danger/20 text-danger',
    flagged: 'bg-warning/5 border-warning/20 text-warning',
    flagged_for_review: 'bg-warning/5 border-warning/20 text-warning',
    skipped: 'bg-muted/5 border-muted/20 text-muted-foreground',
  };

  const statusIcons = {
    completed: CheckCircle,
    auto_approved: CheckCircle,
    error: AlertCircle,
    flagged: AlertCircle,
    flagged_for_review: AlertCircle,
    skipped: AlertCircle,
  };

  const Icon = statusIcons[action.status] || AlertCircle;
  const colorClass = statusColors[action.status] || 'bg-muted/5 border-muted/20';

  return (
    <div className={`border rounded-lg p-4 ${colorClass}`}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-medium text-sm text-foreground">{action.type.replace(/_/g, ' ').toUpperCase()}</div>
          <div className="text-xs text-muted-foreground mt-1 space-y-1">
            {action.headCount && <div>Head Count: {action.headCount}</div>}
            {action.orderType && <div>Type: {action.orderType}</div>}
            {action.name && <div>Name: {action.name}</div>}
            {action.dealsArchived && <div>Records Archived: {action.dealsArchived}</div>}
            {action.reason && <div>{action.reason}</div>}
            {action.error && <div className="text-danger">Error: {action.error}</div>}
          </div>
          <div className="mt-2">
            <span className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${
              action.status === 'completed' ? 'bg-success/15 text-success border-success/20' :
              action.status === 'auto_approved' ? 'bg-success/15 text-success border-success/20' :
              action.status === 'error' ? 'bg-danger/15 text-danger border-danger/20' :
              'bg-warning/15 text-warning border-warning/20'
            }`}>
              {action.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategorySection({ title, icon: Icon, actions }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-bebas text-lg text-foreground">{title}</h3>
        <span className="text-xs bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 rounded-full ml-auto">
          {actions.length}
        </span>
      </div>
      <div className="space-y-3">
        {actions.map((action, idx) => (
          <ActionCard key={idx} action={action} />
        ))}
      </div>
    </div>
  );
}

export default function AIAdminControl() {
  const queryClient = useQueryClient();
  const [autoExecution, setAutoExecution] = useState(true);
  const [lastRun, setLastRun] = useState(new Date());

  const { data: adminReport, isLoading, refetch } = useQuery({
    queryKey: ['aiAdminController'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('aiAdminController', {});
        setLastRun(new Date());
        return response.data;
      } catch (error) {
        console.error('Admin controller error:', error);
        return null;
      }
    },
    staleTime: 30000,
    refetchInterval: autoExecution ? 900000 : false, // 15 minutes
  });

  useEffect(() => {
    if (autoExecution) {
      const interval = setInterval(() => refetch(), 900000);
      return () => clearInterval(interval);
    }
  }, [autoExecution, refetch]);

  const marketActions = adminReport?.actions?.filter(a => a.type.includes('market')) || [];
  const approvalActions = adminReport?.actions?.filter(a => a.type.includes('approved') || a.type.includes('approval')) || [];
  const cattleActions = adminReport?.actions?.filter(a => a.type.includes('lot') || a.type.includes('cattle')) || [];
  const cleanupActions = adminReport?.actions?.filter(a => a.type.includes('archive') || a.type.includes('duplicate') || a.type.includes('cleanup')) || [];

  const errorCount = adminReport?.actions?.filter(a => a.status === 'error').length || 0;
  const successCount = adminReport?.summary?.successCount || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <SectionHeader
          title="AI ADMIN CONTROL"
          subtitle="Autonomous admin operations: approvals, syncs, updates, and cleanup without manual intervention"
          badge="AUTO ENABLED"
        />
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/20 rounded font-medium text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Execute Now
          </button>
          <button
            onClick={() => setAutoExecution(!autoExecution)}
            className={`flex items-center gap-2 px-4 py-2 rounded font-medium text-sm transition-colors border ${
              autoExecution
                ? 'bg-success/15 text-success border-success/20 hover:bg-success/25'
                : 'bg-card text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <Zap className="w-4 h-4" />
            {autoExecution ? 'Auto On' : 'Auto Off'}
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="font-bebas text-3xl text-primary">{adminReport?.summary?.totalActionsExecuted || 0}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Actions</div>
        </div>
        <div className="bg-card border border-success/20 rounded-lg p-4 text-center">
          <div className="font-bebas text-3xl text-success">{successCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Completed</div>
        </div>
        <div className={`bg-card border rounded-lg p-4 text-center ${
          errorCount > 0 ? 'border-danger/20' : 'border-border'
        }`}>
          <div className={`font-bebas text-3xl ${errorCount > 0 ? 'text-danger' : 'text-muted-foreground'}`}>
            {errorCount}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Errors</div>
        </div>
        <div className="bg-card border border-warning/20 rounded-lg p-4 text-center">
          <div className="font-bebas text-3xl text-warning">{adminReport?.summary?.flaggedItems || 0}</div>
          <div className="text-xs text-muted-foreground mt-1">Flagged for Review</div>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-6 border ${
        errorCount === 0
          ? 'bg-success/10 border-success/20'
          : 'bg-warning/10 border-warning/20'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`font-bebas text-2xl ${errorCount === 0 ? 'text-success' : 'text-warning'}`}>
              {errorCount === 0 ? 'ALL OPERATIONS SUCCESSFUL' : `${errorCount} ERRORS DETECTED`}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              AI Admin Controller Status • {adminReport?.executedBy}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>Last Run: {format(lastRun, 'h:mm:ss a')}</div>
            {adminReport?.nextExecution && (
              <div>Next Run: {format(new Date(adminReport.nextExecution), 'h:mm:ss a')}</div>
            )}
            <div>Execution: {adminReport?.executionTime || 0}ms</div>
          </div>
        </div>
      </div>

      {/* Action Categories */}
      <div className="space-y-6">
        <CategorySection
          title="Market Data Operations"
          icon={Zap}
          actions={marketActions}
        />
        <CategorySection
          title="Auto-Approvals"
          icon={CheckCircle}
          actions={approvalActions}
        />
        <CategorySection
          title="Cattle Lot Syncs"
          icon={Package}
          actions={cattleActions}
        />
        <CategorySection
          title="Cleanup & Optimization"
          icon={Trash2}
          actions={cleanupActions}
        />
      </div>

      {/* All Actions Timeline */}
      {adminReport?.actions && adminReport.actions.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-bebas text-lg text-foreground mb-4">ALL EXECUTED ACTIONS</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {adminReport.actions.map((action, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-xs">
                <span className="text-muted-foreground">{action.type.replace(/_/g, ' ')}</span>
                <span className={`px-2 py-0.5 rounded border ${
                  action.status === 'completed' ? 'bg-success/15 text-success border-success/20' :
                  action.status === 'auto_approved' ? 'bg-success/15 text-success border-success/20' :
                  action.status === 'error' ? 'bg-danger/15 text-danger border-danger/20' :
                  'bg-warning/15 text-warning border-warning/20'
                }`}>
                  {action.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}