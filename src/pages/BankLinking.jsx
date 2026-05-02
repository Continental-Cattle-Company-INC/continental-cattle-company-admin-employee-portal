import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import SectionHeader from '@/components/SectionHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link, ExternalLink, Trash2 } from 'lucide-react';

export default function BankLinking() {
  const [linking, setLinking] = useState(false);
  const [holderType, setHolderType] = useState('user');
  const [holderId, setHolderId] = useState('');

  const { data: bankAccounts, isLoading, refetch } = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: () => base44.entities.BankAccount.list('-created_date'),
    initialData: [],
  });

  const handleLinkAccount = async () => {
    if (!holderId && holderType !== 'user') {
      alert('Please provide account holder ID');
      return;
    }

    setLinking(true);
    try {
      const response = await base44.functions.invoke('intuitOAuthHandler', {
        action: 'get_oauth_url',
        account_holder_type: holderType,
        account_holder_id: holderId,
      });

      if (response.data.oauth_url) {
        window.open(response.data.oauth_url, '_blank', 'width=600,height=700');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (accountId) => {
    if (confirm('Remove this bank account?')) {
      await base44.entities.BankAccount.delete(accountId);
      refetch();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <SectionHeader 
        title="Bank Account Linking" 
        subtitle="Connect bank accounts for users, entities, and trusts"
      />

      {/* Link New Account */}
      <Card className="p-6 border border-border">
        <h2 className="font-bebas text-xl mb-4">Link New Account</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Account Holder Type</label>
            <select
              value={holderType}
              onChange={(e) => setHolderType(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded bg-card"
            >
              <option value="user">User</option>
              <option value="entity">Entity</option>
              <option value="trust">Trust</option>
            </select>
          </div>

          {holderType !== 'user' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Account Holder Name/ID</label>
              <input
                type="text"
                value={holderId}
                onChange={(e) => setHolderId(e.target.value)}
                placeholder={`Enter ${holderType} name or ID`}
                className="w-full px-3 py-2 border border-border rounded bg-card"
              />
            </div>
          )}

          <Button
            onClick={handleLinkAccount}
            disabled={linking}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {linking ? 'Connecting...' : 'Connect Intuit/QuickBooks'}
          </Button>
        </div>
      </Card>

      {/* Linked Accounts */}
      <div>
        <h2 className="font-bebas text-xl mb-4">Linked Accounts</h2>
        {isLoading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : bankAccounts.length === 0 ? (
          <div className="text-muted-foreground">No bank accounts linked yet</div>
        ) : (
          <div className="space-y-3">
            {bankAccounts.map((account) => (
              <Card key={account.id} className="p-4 border border-border flex items-center justify-between">
                <div>
                  <div className="font-medium">{account.institution_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {account.account_holder_type} • {account.account_holder_id}
                  </div>
                  {account.account_number_last4 && (
                    <div className="text-xs text-muted-foreground">
                      ••••{account.account_number_last4}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    Last synced: {account.last_synced ? new Date(account.last_synced).toLocaleDateString() : 'Never'}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleUnlink(account.id)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}