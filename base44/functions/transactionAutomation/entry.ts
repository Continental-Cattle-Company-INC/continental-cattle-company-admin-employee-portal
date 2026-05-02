import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Service-level function - auto-disable transactions on account disconnect
    const body = await req.json();
    const { event_type, bank_account_id } = body;

    if (event_type === 'account_disconnected') {
      // Find all pending/approved transactions using this account
      const allTransactions = await base44.asServiceRole.entities.Transaction.list('');
      
      const affectedTxns = allTransactions.filter(t => 
        (t.from_bank_account_id === bank_account_id || t.to_bank_account_id === bank_account_id) &&
        ['pending', 'awaiting_signatures', 'approved'].includes(t.status)
      );

      // Cancel all affected transactions
      for (const txn of affectedTxns) {
        await base44.asServiceRole.entities.Transaction.update(txn.id, {
          status: 'cancelled',
          notes: `Auto-cancelled: Bank account ${bank_account_id} was disconnected`,
        });

        // Notify both parties
        await base44.integrations.Core.SendEmail({
          to: txn.from_party_id,
          subject: `Transaction Cancelled: Bank Account Disconnected`,
          body: `Your transaction for $${txn.amount} has been cancelled because the bank account has been disconnected. Amount: $${txn.amount}. Status: CANCELLED. Contact support if you need assistance.`,
        });

        await base44.integrations.Core.SendEmail({
          to: txn.to_party_id,
          subject: `Transaction Cancelled: Bank Account Disconnected`,
          body: `A transaction you were involved in ($${txn.amount}) has been cancelled because the bank account has been disconnected. Contact support if you need assistance.`,
        });

        console.log(`[CRITICAL] Transaction ${txn.id} auto-cancelled due to account disconnect`);
      }
    }

    if (event_type === 'funds_verification_expired') {
      // Mark verification as expired after 24 hours
      const account = await base44.asServiceRole.entities.BankAccount.list('', 1, { id: bank_account_id });
      if (account[0]?.verification_timestamp) {
        const verifiedAt = new Date(account[0].verification_timestamp);
        const now = new Date();
        const hoursDiff = (now - verifiedAt) / (1000 * 60 * 60);

        if (hoursDiff > 24) {
          await base44.asServiceRole.entities.BankAccount.update(bank_account_id, {
            verification_label: 'expired',
            funds_verified: false,
          });
          console.log(`[AUDIT] Fund verification expired for account ${bank_account_id}`);
        }
      }
    }

    return Response.json({
      success: true,
      message: 'Transaction automation executed',
    });
  } catch (error) {
    console.error('[ERROR] Transaction automation failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});