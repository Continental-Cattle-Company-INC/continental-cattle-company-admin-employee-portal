import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const INTUIT_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const INTUIT_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/tokens/oauth';
const INTUIT_API_BASE = 'https://quickbooks.api.intuit.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, code, realm_id, account_holder_type, account_holder_id } = body;

    // Action 1: Generate OAuth URL for user to authorize
    if (action === 'get_oauth_url') {
      const clientId = Deno.env.get('INTUIT_CLIENT_ID');
      const redirectUri = Deno.env.get('INTUIT_REDIRECT_URI') || 'https://your-app.com/bank-linking/callback';

      const authUrl = new URL(INTUIT_AUTH_URL);
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', 'com.intuit.quickbooks.accounting');
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('state', user.id);

      return Response.json({ oauth_url: authUrl.toString() });
    }

    // Action 2: Exchange OAuth code for access token
    if (action === 'exchange_code') {
      const clientId = Deno.env.get('INTUIT_CLIENT_ID');
      const clientSecret = Deno.env.get('INTUIT_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        return Response.json({ error: 'Intuit credentials not configured' }, { status: 400 });
      }

      const tokenResponse = await fetch(INTUIT_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: Deno.env.get('INTUIT_REDIRECT_URI') || 'https://your-app.com/bank-linking/callback',
        }).toString(),
        auth: `${clientId}:${clientSecret}`,
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        return Response.json({ error: 'Failed to exchange code for token' }, { status: 400 });
      }

      // Fetch account info from Intuit
      const accountResponse = await fetch(`${INTUIT_API_BASE}/v2/companies/${realm_id}/companyinfo/${realm_id}`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const accountData = await accountResponse.json();

      // Store bank account in database
      const bankAccount = {
        account_holder_type,
        account_holder_id: account_holder_id || user.email,
        institution_name: accountData.CompanyName || 'QuickBooks',
        account_type: 'checking',
        oauth_provider: 'intuit',
        oauth_access_token: tokenData.access_token,
        last_synced: new Date().toISOString(),
        is_active: true,
      };

      const created = await base44.entities.BankAccount.create(bankAccount);

      return Response.json({
        success: true,
        bank_account_id: created.id,
        message: 'Bank account linked successfully',
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});