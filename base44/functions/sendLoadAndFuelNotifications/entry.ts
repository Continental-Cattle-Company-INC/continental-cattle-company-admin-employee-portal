/**
 * Send notifications for new loads and fuel threshold violations
 * Uses internal alert system + email notifications to relevant staff
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const payload = await req.json().catch(() => ({}));
    const base44 = createClientFromRequest(req);
    
    // Verify this is called by automation (service role) or authenticated user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { alertType, lotData, fuelData, routeData } = payload;

    // Get relevant staff members to notify
    const staff = await base44.entities.StaffDirectory.filter({ status: 'active' });
    const recipients = staff.filter(s => 
      s.department === 'Executive' || 
      s.department === 'Trucking' || 
      s.department === 'Management' ||
      s.role === 'admin' ||
      s.role === 'super_admin'
    );

    // Create alert record
    let alertMessage = '';
    let alertTitle = '';
    let severity = 'medium';
    let fuelCostPerMile = null;
    let thresholdExceeded = null;

    if (alertType === 'new_load') {
      alertTitle = `🚛 New Load Added: ${lotData?.lot_id || 'Unknown'}`;
      alertMessage = `New cattle load created:\n` +
        `Lot: ${lotData?.lot_id || 'N/A'}\n` +
        `Breed: ${lotData?.breed_type || 'N/A'}\n` +
        `Head Count: ${lotData?.head_count || 0}\n` +
        `Weight: ${lotData?.purchase_weight || 0} lbs\n` +
        `Purchase Price: $${lotData?.purchase_price || 0}/cwt\n` +
        `Yard: ${lotData?.yard || 'N/A'}, Pen: ${lotData?.pen || 'N/A'}\n` +
        `Created by: ${lotData?.created_by || 'System'}`;
      severity = 'low';
    } else if (alertType === 'fuel_threshold') {
      fuelCostPerMile = fuelData?.costPerMile || 0;
      thresholdExceeded = fuelData?.threshold || 2.50;
      alertTitle = `⚠️ FUEL COST THRESHOLD EXCEEDED`;
      alertMessage = `Route fuel cost has exceeded threshold:\n` +
        `Route: ${routeData?.origin || 'Unknown'} → ${routeData?.destination || 'Unknown'}\n` +
        `Current Fuel Cost: $${fuelCostPerMile.toFixed(2)}/mile\n` +
        `Threshold: $${thresholdExceeded.toFixed(2)}/mile\n` +
        `Excess: $${(fuelCostPerMile - thresholdExceeded).toFixed(2)}/mile\n` +
        `Total Distance: ${routeData?.miles || 0} miles\n` +
        `Estimated Total Fuel Cost: $${(fuelCostPerMile * (routeData?.miles || 0)).toFixed(2)}\n\n` +
        `RECOMMENDED ACTION: Review route alternatives or negotiate fuel surcharge`;
      severity = 'high';
    }

    const alert = await base44.entities.Alert.create({
      alert_type: alertType,
      severity: severity,
      title: alertTitle,
      message: alertMessage,
      related_entity: lotData ? 'CattleLot' : 'RouteCalculation',
      related_entity_id: lotData?.id || null,
      fuel_cost_per_mile: fuelCostPerMile,
      threshold_exceeded: thresholdExceeded,
      recipient_roles: ['admin', 'super_admin', 'trucking_admin', 'manager'],
      is_read: false,
    });

    // Send email notifications to relevant staff
    const emailPromises = recipients.map(async recipient => {
      try {
        await base44.integrations.Core.SendEmail({
          to: recipient.email,
          subject: `[${severity.toUpperCase()}] ${alertTitle}`,
          body: `Hi ${recipient.full_name},\n\n${alertMessage}\n\n---\nContinental Cattle Co. Alert System\nTimestamp: ${new Date().toISOString()}\n\nView all alerts in your dashboard.`,
          from_name: 'Continental Alerts',
        });
        return { email: recipient.email, status: 'sent' };
      } catch (emailError) {
        console.error(`Failed to email ${recipient.email}:`, emailError.message);
        return { email: recipient.email, status: 'failed', error: emailError.message };
      }
    });

    const emailResults = await Promise.all(emailPromises);

    return Response.json({
      status: 'success',
      alertId: alert.id,
      alertTitle,
      recipientsNotified: recipients.length,
      emailResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[LOAD/FUEL NOTIFICATION] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});