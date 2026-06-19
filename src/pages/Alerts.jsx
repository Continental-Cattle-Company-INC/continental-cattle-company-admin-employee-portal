import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SectionHeader from '@/components/SectionHeader';
import { Bell, CheckCircle, AlertCircle, AlertTriangle, Info, Truck, TrendingUp, X } from 'lucide-react';
import { format } from 'date-fns';

const SEVERITY_ICONS = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: Bell,
  low: Info,
};

const SEVERITY_COLORS = {
  critical: 'bg-red-500/10 border-red-500/30 text-red-400',
  high: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
  medium: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  low: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

export default function Alerts() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => base44.entities.Alert.list('-created_date', 100),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId) => {
      const user = await base44.auth.me();
      await base44.entities.Alert.update(alertId, {
        is_read: true,
        acknowledged_by: user?.email,
        acknowledged_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (alertId) => base44.entities.Alert.delete(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.is_read;
    if (filter === 'critical') return alert.severity === 'critical';
    if (filter === 'high') return alert.severity === 'high';
    return true;
  });

  const unreadCount = alerts.filter(a => !a.is_read).length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.is_read).length;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <SectionHeader
        title="TEAM ALERTS"
        subtitle="Real-time notifications for loads, fuel costs, and system events"
        badge={unreadCount > 0 ? `${unreadCount} unread` : undefined}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total Alerts</span>
          </div>
          <div className="font-bebas text-3xl text-foreground">{alerts.length}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-xs text-muted-foreground">Critical</span>
          </div>
          <div className="font-bebas text-3xl text-red-400">{criticalCount}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <span className="text-xs text-muted-foreground">High Priority</span>
          </div>
          <div className="font-bebas text-3xl text-orange-400">
            {alerts.filter(a => a.severity === 'high' && !a.is_read).length}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-success" />
            <span className="text-xs text-muted-foreground">Acknowledged</span>
          </div>
          <div className="font-bebas text-3xl text-success">
            {alerts.filter(a => a.is_read).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'all', label: 'All Alerts' },
          { value: 'unread', label: 'Unread' },
          { value: 'critical', label: 'Critical' },
          { value: 'high', label: 'High Priority' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-foreground hover:bg-secondary/40'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading alerts...</div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
            No alerts match your filter
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const Icon = SEVERITY_ICONS[alert.severity];
            const colorClass = SEVERITY_COLORS[alert.severity];

            return (
              <div
                key={alert.id}
                className={`bg-card border rounded-xl p-5 transition-all ${
                  alert.is_read ? 'border-border opacity-70' : 'border-primary/30 shadow-lg'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bebas text-lg text-foreground tracking-wide">
                          {alert.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="capitalize">{alert.severity}</span>
                          <span>•</span>
                          <span>{format(new Date(alert.created_date), 'MMM d, h:mm a')}</span>
                          {alert.alert_type === 'new_load' && (
                            <>
                              <span>•</span>
                              <Truck className="w-3 h-3" />
                              <span>New Load</span>
                            </>
                          )}
                          {alert.alert_type === 'fuel_threshold' && (
                            <>
                              <span>•</span>
                              <TrendingUp className="w-3 h-3" />
                              <span>Fuel Alert</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {alert.message}
                    </p>

                    {alert.fuel_cost_per_mile && (
                      <div className="mt-3 flex gap-4 text-xs">
                        <div className="bg-warning/10 border border-warning/20 rounded px-3 py-1.5">
                          <span className="text-muted-foreground">Fuel Cost: </span>
                          <span className="text-warning font-semibold">
                            ${alert.fuel_cost_per_mile.toFixed(2)}/mile
                          </span>
                        </div>
                        {alert.threshold_exceeded && (
                          <div className="bg-muted/50 border border-border rounded px-3 py-1.5">
                            <span className="text-muted-foreground">Threshold: </span>
                            <span className="text-foreground font-semibold">
                              ${alert.threshold_exceeded.toFixed(2)}/mile
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {alert.is_read && alert.acknowledged_by && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-success">
                        <CheckCircle className="w-3 h-3" />
                        <span>Acknowledged by {alert.acknowledged_by} on {format(new Date(alert.acknowledged_date), 'MMM d, h:mm a')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {!alert.is_read && (
                      <button
                        onClick={() => acknowledgeMutation.mutate(alert.id)}
                        className="p-2 text-success hover:bg-success/10 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(alert.id)}
                      className="p-2 text-muted-foreground hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Delete alert"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}