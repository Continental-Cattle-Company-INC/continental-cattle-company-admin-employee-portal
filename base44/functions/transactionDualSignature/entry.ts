import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, transaction_id } = body;

    if (!transaction_id) {
      return Response.json({ error: 'transaction_id required' }, { status: 400 });
    }

    const txn = await base44.entities.Transaction.list('', 1, { id: transaction_id });
    if (!txn.length) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const transaction = txn[0];

    if (action === 'sign_as_initiator') {
      // Verify user is initiator
      if (transaction.from_party_id !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Only initiator can sign as initiator' }, { status: 403 });
      }

      await base44.entities.Transaction.update(transaction_id, {
        initiator_signed: true,
        initiator_signed_timestamp: new Date().toISOString(),
      });

      console.log(`[AUDIT] Initiator signed transaction ${transaction_id}`);
      return Response.json({ success: true, message: 'Initiator signature recorded' });
    }

    if (action === 'sign_as_receiver') {
      // Verify user is receiver
      if (transaction.to_party_id !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Only receiver can sign as receiver' }, { status: 403 });
      }

      await base44.entities.Transaction.update(transaction_id, {
        receiver_signed: true,
        receiver_signed_timestamp: new Date().toISOString(),
      });

      console.log(`[AUDIT] Receiver signed transaction ${transaction_id}`);
      return Response.json({ success: true, message: 'Receiver signature recorded' });
    }

    if (action === 'admin_approve') {
      // Only admin can approve
      if (user.role !== 'admin') {
        return Response.json({ error: 'Only admin can approve' }, { status: 403 });
      }

      // Check both parties signed
      if (!transaction.initiator_signed || !transaction.receiver_signed) {
        return Response.json({
          error: 'Both parties must sign before admin approval',
          initiator_signed: transaction.initiator_signed,
          receiver_signed: transaction.receiver_signed,
        }, { status: 400 });
      }

      // Verify funds
      const fromAccount = await base44.entities.BankAccount.list('', 1, { id: transaction.from_bank_account_id });
      const toAccount = await base44.entities.BankAccount.list('', 1, { id: transaction.to_bank_account_id });

      if (!fromAccount[0]?.is_active) {
        return Response.json({ error: 'Sender bank account is inactive' }, { status: 400 });
      }
      if (!toAccount[0]?.is_active) {
        return Response.json({ error: 'Receiver bank account is inactive' }, { status: 400 });
      }

      if (transaction.amount > fromAccount[0].available_funds) {
        return Response.json({ error: 'Insufficient funds in sender account' }, { status: 400 });
      }

      // Update transaction
      await base44.entities.Transaction.update(transaction_id, {
        admin_approved: true,
        admin_approved_by: user.email,
        admin_approved_timestamp: new Date().toISOString(),
        funds_verified: true,
        funds_verified_timestamp: new Date().toISOString(),
        is_compliant: true,
        status: 'approved',
      });

      console.log(`[AUDIT] Admin ${user.email} approved transaction ${transaction_id} for $${transaction.amount}`);
      return Response.json({ success: true, message: 'Transaction approved by admin', status: 'approved' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[ERROR]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});