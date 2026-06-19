import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getQueueStatus, forceSync, clearFailedOperations, checkServiceHealth } from '@/lib/offlineEngine';
import SectionHeader from '@/components/SectionHeader';
import { Activity, Wifi, WifiOff, Server, Brain, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SystemStatus() {
  const [health, setHealth] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshStatus = async () => {
    const [healthStatus, queue] = await Promise.all([
      checkServiceHealth(),
      forceSync(),
    ]);
    setHealth(healthStatus);
    setQueueStatus(queue);
    setLoading(false);
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleClearFailed = async () => {
    const remaining = clearFailedOperations();
    await refreshStatus();
    toast.success(`Cleared failed operations. ${remaining} pending.`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <SectionHeader title="SYSTEM STATUS" subtitle="Loading..." />
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const getStatusIcon = (status, online) => {
    if (!online) return <XCircle className="w-5 h-5 text-danger" />;
    if (status === 'degraded') return <AlertTriangle className="w-5 h-5 text-warning" />;
    return <CheckCircle className="w-5 h-5 text-success" />;
  };

  const getStatusBadge = (online, label) => (
    <span className={`text-xs px-2 py-1 rounded-full border ${
      online 
        ? 'bg-success/15 text-success border-success/20' 
        : 'bg-danger/15 text-danger border-danger/20'
    }`}>
      {online ? label : 'OFFLINE'}
    </span>
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <SectionHeader
        title="SYSTEM STATUS"
        subtitle="Real-time service health and offline queue monitoring"
        badge="LIVE"
      />

      {/* Service Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Internet */}
        <div className={`border rounded-xl p-5 ${health?.internet.online ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {health?.internet.online ? <Wifi className="w-5 h-5 text-success" /> : <WifiOff className="w-5 h-5 text-danger" />}
              <span className="font-bebas text-lg text-foreground">INTERNET</span>
            </div>
            {getStatusBadge(health?.internet.online, 'ONLINE')}
          </div>
          <div className="text-xs text-muted-foreground">
            Last check: {new Date(health?.internet.lastCheck).toLocaleTimeString()}
          </div>
        </div>

        {/* Backend */}
        <div className={`border rounded-xl p-5 ${health?.backend.online ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              <span className="font-bebas text-lg text-foreground">BACKEND</span>
            </div>
            {getStatusBadge(health?.backend.online, 'ONLINE')}
          </div>
          <div className="text-xs text-muted-foreground">
            Last check: {new Date(health?.backend.lastCheck).toLocaleTimeString()}
          </div>
        </div>

        {/* AI Services */}
        <div className={`border rounded-xl p-5 ${health?.ai.online && health?.ai.creditsAvailable ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <span className="font-bebas text-lg text-foreground">AI SERVICES</span>
            </div>
            {health?.ai.creditsAvailable 
              ? getStatusBadge(true, 'ACTIVE')
              : getStatusBadge(false, 'NO CREDITS')}
          </div>
          <div className="text-xs text-muted-foreground">
            {health?.ai.creditsAvailable 
              ? 'AI available' 
              : 'Using deterministic fallbacks'}
          </div>
        </div>
      </div>

      {/* Offline Queue Status */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-bebas text-lg text-foreground">OFFLINE QUEUE</span>
            {queueStatus?.syncing && (
              <span className="text-xs bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 rounded-full animate-pulse">
                SYNCING...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshStatus}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
            {queueStatus?.failed > 0 && (
              <button
                onClick={handleClearFailed}
                className="p-2 hover:bg-danger/10 rounded-lg transition-colors"
                title="Clear failed"
              >
                <Trash2 className="w-4 h-4 text-danger" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
            <div className="font-bebas text-2xl text-primary">{queueStatus?.pending || 0}</div>
            <div className="text-xs text-muted-foreground">Pending Sync</div>
          </div>
          <div className="bg-danger/5 border border-danger/20 rounded-lg p-4 text-center">
            <div className="font-bebas text-2xl text-danger">{queueStatus?.failed || 0}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
          <div className="bg-success/5 border border-success/20 rounded-lg p-4 text-center">
            <div className="font-bebas text-2xl text-success">
              {queueStatus?.health?.internet.online && queueStatus?.health?.backend.online ? 'READY' : 'PAUSED'}
            </div>
            <div className="text-xs text-muted-foreground">Sync Status</div>
          </div>
        </div>

        {queueStatus?.pending > 0 ? (
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-3 h-3" />
              <span>Operations queued during offline period will sync automatically when services are restored</span>
            </div>
            <div className="space-y-1">
              {['Entity operations', 'AI requests with fallbacks', 'Function invocations'].map((type, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>{type}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-success">
            <CheckCircle className="w-4 h-4" />
            <span>All operations synced — queue empty</span>
          </div>
        )}
      </div>

      {/* Resilience Info */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Activity className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm text-foreground">
            <div className="font-bebas text-primary text-base">OFFLINE-FIRST RESILIENCE ACTIVE</div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              The platform automatically continues operations during service outages, AI credit exhaustion, or internet loss. 
              All actions are queued locally and synced automatically when services are restored. 
              Deterministic algorithms replace AI tools when credits are unavailable.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-xs bg-success/15 text-success border border-success/20 px-2 py-1 rounded">✓ Auto-retry on failure</span>
              <span className="text-xs bg-success/15 text-success border border-success/20 px-2 py-1 rounded">✓ Local storage fallback</span>
              <span className="text-xs bg-success/15 text-success border border-success/20 px-2 py-1 rounded">✓ Deterministic AI fallbacks</span>
              <span className="text-xs bg-success/15 text-success border border-success/20 px-2 py-1 rounded">✓ Auto-sync on recovery</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}