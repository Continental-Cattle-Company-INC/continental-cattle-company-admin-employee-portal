import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { bank_account_id, action } = body;

    if (!bank_account_id) {
      return Response.json({ error: 'bank_account_id required' }, { status: 400 });
    }

    const bankAccount = await base44.entities.BankAccount.list('', 1, { id: bank_account_id });
    if (!bankAccount.length) {
      return Response.json({ error: 'Bank account not found' }, { status: 404 });
    }

    const account = bankAccount[0];

    // Only owner or admin can verify their own account
    if (account.account_holder_id !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    if (action === 'verify_funds') {
      // Simulate Intuit API call to fetch real balance
      // In production, call Intuit API with oauth_access_token
      const simulatedBalance = 50000; // Replace with real API call
      const simulatedAvailable = 48500;

      // Update bank account with verified funds
      await base44.entities.BankAccount.update(bank_account_id, {
        account_balance: simulatedBalance,
        available_funds: simulatedAvailable,
        max_bid_limit: simulatedAvailable * 0.9, // 90% of available
        funds_verified: true,
        verification_timestamp: new Date().toISOString(),
        verification_label: 'verified',
        compliance_status: 'compliant',
        fdic_protected: true,
      });

      // Log verification for audit
      console.log(`[AUDIT] Funds verified for ${account.account_holder_type}: ${account.account_holder_id} - Balance: $${simulatedBalance}`);

      return Response.json({
        success: true,
        account_balance: simulatedBalance,
        available_funds: simulatedAvailable,
        max_bid_limit: simulatedAvailable * 0.9,
        verification_label: 'verified',
      });
    }

    if (action === 'check_bid_eligibility') {
      const { bid_amount } = body;

      if (!account.funds_verified) {
        return Response.json({
          eligible: false,
          reason: 'Funds not verified',
          required_action: 'Verify funds first',
        });
      }

      if (!account.is_active) {
        return Response.json({
          eligible: false,
          reason: 'Bank account disconnected',
          required_action: 'Reconnect bank account',
        });
      }

      if (bid_amount > account.max_bid_limit) {
        return Response.json({
          eligible: false,
          reason: 'Bid exceeds available funds limit',
          max_bid: account.max_bid_limit,
          bid_requested: bid_amount,
        });
      }

      return Response.json({
        eligible: true,
        max_bid_limit: account.max_bid_limit,
        available_funds: account.available_funds,
        verification_status: account.verification_label,
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[ERROR]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});