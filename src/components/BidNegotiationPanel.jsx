import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { CheckCircle, XCircle, MessageSquare, DollarSign, ChevronDown, ChevronRight, Gavel } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_STYLES = {
  active:   'bg-warning/15 text-warning border-warning/20',
  accepted: 'bg-success/15 text-success border-success/20',
  rejected: 'bg-danger/15 text-danger border-danger/20',
  withdrawn:'bg-muted text-muted-foreground border-border',
  expired:  'bg-muted text-muted-foreground border-border',
};

function BidRow({ bid, lot, onAccept, onReject, onUpdateNotes }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(bid.admin_notes || '');
  const [settleForm, setSettleForm] = useState({ seller_id: '', commission_percent: 5, freight_cost: 0, other_expenses: 0 });
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    if (!settleForm.seller_id.trim()) {
      toast.error('Enter seller ID/email to process payment');
      return;
    }
    setAccepting(true);
    await onAccept(bid.id, settleForm);
    setAccepting(false);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-secondary/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <Gavel className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">{bid.bidder_id}</div>
            <div className="text-xs text-muted-foreground">
              Lot {lot?.lot_id || bid.cattle_lot_id} · {lot?.head_count || '?'} head · {lot?.cattle_class || ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-bebas text-lg text-primary">${bid.bid_amount?.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">${bid.price_per_unit}/cwt</div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${STATUS_STYLES[bid.status]}`}>
            {bid.status}
          </span>
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 bg-secondary/20 border-t border-border space-y-4 pt-3">
          {/* Bid Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div><span className="text-muted-foreground">Placed: </span>{bid.bid_timestamp ? format(new Date(bid.bid_timestamp), 'MMM d, h:mm a') : '—'}</div>
            <div><span className="text-muted-foreground">Unit Type: </span>{bid.unit_type}</div>
            <div><span className="text-muted-foreground">Bank ID: </span>{bid.bank_account_id?.slice(0, 10)}…</div>
            <div><span className="text-muted-foreground">Bidder Type: </span>{bid.bidder_type}</div>
          </div>

          {/* Lot Details */}
          {lot && (
            <div className="p-3 bg-card border border-border rounded text-xs space-y-1">
              <div className="font-medium text-foreground mb-1">Lot Details</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div><span className="text-muted-foreground">Class: </span>{lot.cattle_class}</div>
                <div><span className="text-muted-foreground">Head: </span>{lot.head_count}</div>
                <div><span className="text-muted-foreground">Weight: </span>{lot.current_weight || lot.purchase_weight} lbs/hd</div>
                <div><span className="text-muted-foreground">Ask: </span>${lot.purchase_price}/cwt</div>
              </div>
            </div>
          )}

          {/* Admin Notes / Negotiation */}
          {bid.status === 'active' && (
            <div>
              <label className="text-xs font-medium mb-1 block flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> Negotiation Notes (visible to buyer)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded bg-card text-sm resize-none"
                rows={2}
                placeholder="Counter offer, conditions, etc..."
              />
              <button
                onClick={() => { onUpdateNotes(bid.id, notes); toast.success('Notes saved'); }}
                className="mt-1 text-xs px-3 py-1 bg-secondary hover:bg-secondary/80 border border-border rounded"
              >
                Save Notes
              </button>
            </div>
          )}

          {/* Settlement Form - shown only for active bids */}
          {bid.status === 'active' && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded space-y-3">
              <div className="text-xs font-medium text-primary flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Accept & Process Payment Immediately
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Seller Email/ID *</label>
                  <input
                    type="text"
                    value={settleForm.seller_id}
                    onChange={e => setSettleForm(f => ({ ...f, seller_id: e.target.value }))}
                    placeholder="seller@email.com"
                    className="w-full px-2 py-1.5 border border-border rounded bg-card text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Commission %</label>
                  <input
                    type="number"
                    value={settleForm.commission_percent}
                    onChange={e => setSettleForm(f => ({ ...f, commission_percent: parseFloat(e.target.value) }))}
                    className="w-full px-2 py-1.5 border border-border rounded bg-card text-xs"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Freight Cost ($)</label>
                  <input
                    type="number"
                    value={settleForm.freight_cost}
                    onChange={e => setSettleForm(f => ({ ...f, freight_cost: parseFloat(e.target.value) }))}
                    className="w-full px-2 py-1.5 border border-border rounded bg-card text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Other Expenses ($)</label>
                  <input
                    type="number"
                    value={settleForm.other_expenses}
                    onChange={e => setSettleForm(f => ({ ...f, other_expenses: parseFloat(e.target.value) }))}
                    className="w-full px-2 py-1.5 border border-border rounded bg-card text-xs"
                  />
                </div>
              </div>

              {/* Payment Preview */}
              <div className="text-xs text-muted-foreground bg-card/80 p-2 rounded border border-border">
                <div className="flex justify-between"><span>Sale Price:</span><span className="text-foreground">${bid.bid_amount?.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Commission ({settleForm.commission_percent}%):</span><span className="text-warning">-${((bid.bid_amount || 0) * settleForm.commission_percent / 100).toFixed(0)}</span></div>
                <div className="flex justify-between"><span>Freight:</span><span className="text-warning">-${settleForm.freight_cost}</span></div>
                <div className="flex justify-between font-medium mt-1 pt-1 border-t border-border">
                  <span>Seller Receives:</span>
                  <span className="text-success">${((bid.bid_amount || 0) - (bid.bid_amount || 0) * settleForm.commission_percent / 100 - settleForm.freight_cost - settleForm.other_expenses).toFixed(0)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Continental Receives:</span>
                  <span className="text-primary">${((bid.bid_amount || 0) * settleForm.commission_percent / 100).toFixed(0)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-success/15 hover:bg-success/25 text-success border border-success/20 rounded text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {accepting ? 'Processing Payment...' : 'Accept & Collect Payment'}
                </button>
                <button
                  onClick={() => onReject(bid.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-danger/15 hover:bg-danger/25 text-danger border border-danger/20 rounded text-sm font-medium transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          )}

          {bid.status === 'accepted' && (
            <div className="text-xs text-success bg-success/10 border border-success/20 rounded p-2">
              ✓ Accepted by {bid.accepted_by} on {bid.accepted_timestamp ? format(new Date(bid.accepted_timestamp), 'MMM d, h:mm a') : '—'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BidNegotiationPanel() {
  const qc = useQueryClient();

  const { data: bids = [] } = useQuery({
    queryKey: ['allBids'],
    queryFn: () => base44.entities.Bid.list('-bid_timestamp', 100),
    refetchInterval: 3000,
  });

  const { data: lots = [] } = useQuery({
    queryKey: ['allLotsMap'],
    queryFn: () => base44.entities.CattleLot.list(),
  });

  const lotsMap = Object.fromEntries(lots.map(l => [l.id, l]));

  const [filter, setFilter] = useState('active');
  const filtered = bids.filter(b => filter === 'all' || b.status === filter);

  const activeBids = bids.filter(b => b.status === 'active').length;

  const acceptBid = async (bidId, settleForm) => {
    const res = await base44.functions.invoke('processBidPayment', {
      bid_id: bidId,
      seller_id: settleForm.seller_id,
      commission_percent: settleForm.commission_percent,
      freight_cost: settleForm.freight_cost,
      other_expenses: settleForm.other_expenses,
    });
    if (res.data?.success) {
      toast.success(`Payment collected! Settlement ${res.data.settlement_id?.slice(0, 8)}`);
      qc.invalidateQueries({ queryKey: ['allBids'] });
    } else {
      toast.error(res.data?.error || 'Payment failed');
    }
  };

  const rejectBid = async (bidId) => {
    await base44.entities.Bid.update(bidId, { status: 'rejected' });
    toast.success('Bid rejected');
    qc.invalidateQueries({ queryKey: ['allBids'] });
  };

  const updateNotes = async (bidId, notes) => {
    await base44.entities.Bid.update(bidId, { admin_notes: notes });
    qc.invalidateQueries({ queryKey: ['allBids'] });
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Bids', value: activeBids, color: 'text-warning' },
          { label: 'Accepted', value: bids.filter(b => b.status === 'accepted').length, color: 'text-success' },
          { label: 'Total Volume', value: `$${bids.filter(b => b.status === 'active').reduce((s, b) => s + (b.bid_amount || 0), 0).toLocaleString()}`, color: 'text-primary' },
        ].map(k => (
          <Card key={k.label} className="p-3 text-center border border-border">
            <div className={`font-bebas text-2xl ${k.color}`}>{k.value}</div>
            <div className="text-xs text-muted-foreground">{k.label}</div>
          </Card>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['active', 'accepted', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
            {f} {f === 'active' && activeBids > 0 ? `(${activeBids})` : ''}
          </button>
        ))}
      </div>

      {/* Bid List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No {filter} bids</div>
        ) : (
          filtered.map(bid => (
            <BidRow
              key={bid.id}
              bid={bid}
              lot={lotsMap[bid.cattle_lot_id]}
              onAccept={acceptBid}
              onReject={rejectBid}
              onUpdateNotes={updateNotes}
            />
          ))
        )}
      </div>
    </div>
  );
}