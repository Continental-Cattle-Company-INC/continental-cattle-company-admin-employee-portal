/**
 * COMPREHENSIVE NOTIFICATION ORCHESTRATOR
 * Triggers real-time alerts across all departments based on event type
 * Routes notifications to appropriate recipients by role and responsibility
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Role-based recipient mapping
const ROLE_ROUTING = {
  // Executive/Admin
  super_admin: ['all'],
  admin: ['all'],
  
  // Operations
  feedlot_admin: ['feedlot', 'health', 'weight', 'pen'],
  trucking_admin: ['trucking', 'logistics', 'dispatch'],
  maintenance_admin: ['maintenance', 'repairs'],
  market_admin: ['sales', 'purchases', 'bids'],
  staff_admin: ['hr', 'payroll', 'scheduling'],
  field_admin: ['field_ops', 'cattle_health'],
  office_manager: ['admin', 'coordination'],
  
  // Trucking
  dispatch: ['load_assignments', 'route_changes'],
  truck_owner: ['load_awards', 'payments', 'schedule'],
  truck_driver: ['assigned_loads', 'route_updates'],
  
  // Feedlot
  feed_mill: ['feed_orders', 'inventory'],
  feed_truck: ['feeding_schedule', 'pen_assignments'],
  cowboy: ['health_events', 'pen_work'],
  field_rep: ['cattle_checks', 'health_alerts'],
  
  // Financial/Legal
  financial_admin: ['payments', 'settlements', 'approvals'],
  accountant: ['financials', 'tax', 'reporting'],
  attorney_cpa: ['contracts', 'compliance', 'legal'],
  
  // External
  seller: ['listings', 'sales', 'payments'],
  buyer: ['bids', 'purchases', 'deliveries'],
  hauler: ['load_board', 'assignments'],
};

// Department contact lists
const DEPARTMENT_EMAILS = {
  executive: ['rinconcattleco@gmail.com', 'beesonbuckingbulls@outlook.com', 'lanebeeson@outlook.com'],
  trucking: [],
  feedlot: [],
  maintenance: [],
  financial: [],
  legal: [],
  hr: [],
  sales: [],
  operations: [],
};

async function getRecipientsForAlert(alertCategory, severity, relatedEntity) {
  const base44 = createClientFromRequest(req);
  
  // Get all active staff
  const staff = await base44.entities.StaffDirectory.filter({ status: 'active' });
  
  // Get all users with relevant roles
  const users = await base44.entities.User.list();
  
  const recipients = new Set();
  
  // Always notify super_admin and admin for high/critical alerts
  if (severity === 'high' || severity === 'critical') {
    staff.filter(s => s.role === 'super_admin' || s.role === 'admin')
      .forEach(s => recipients.add(s.email));
  }
  
  // Route by category
  switch (alertCategory) {
    case 'new_load':
    case 'cattle_movement':
      // Feedlot admin, trucking admin, field admin, relevant cowboys
      staff.filter(s => 
        s.role === 'feedlot_admin' || 
        s.role === 'trucking_admin' ||
        s.role === 'field_admin' ||
        s.department === 'Ranch Ops' ||
        s.department === 'Feedlot'
      ).forEach(s => recipients.add(s.email));
      break;
      
    case 'fuel_threshold':
    case 'route_change':
    case 'logistics':
      // Trucking admin, dispatch, truck owners, drivers
      staff.filter(s => 
        s.role === 'trucking_admin' ||
        s.role === 'dispatch' ||
        s.role === 'truck_owner' ||
        s.role === 'truck_driver' ||
        s.department === 'Trucking'
      ).forEach(s => recipients.add(s.email));
      break;
      
    case 'health_event':
    case 'vaccination':
    case 'pull':
      // Feedlot admin, field admin, cowboys, field reps
      staff.filter(s => 
        s.role === 'feedlot_admin' ||
        s.role === 'field_admin' ||
        s.role === 'cowboy' ||
        s.role === 'field_rep' ||
        s.department === 'Ranch Ops'
      ).forEach(s => recipients.add(s.email));
      break;
      
    case 'bid_created':
    case 'bid_accepted':
    case 'sale_completed':
      // Market admin, financial admin, seller, buyer
      staff.filter(s => 
        s.role === 'market_admin' ||
        s.role === 'financial_admin'
      ).forEach(s => recipients.add(s.email));
      break;
      
    case 'payment_pending':
    case 'settlement':
      // Financial admin, accountant, attorney_cpa
      staff.filter(s => 
        s.role === 'financial_admin' ||
        s.role === 'accountant' ||
        s.role === 'attorney_cpa'
      ).forEach(s => recipients.add(s.email));
      break;
      
    case 'maintenance_urgent':
    case 'equipment_failure':
      // Maintenance admin, welder, maintenance staff
      staff.filter(s => 
        s.role === 'maintenance_admin' ||
        s.role === 'welder' ||
        s.role === 'maintenance' ||
        s.department === 'Maintenance'
      ).forEach(s => recipients.add(s.email));
      break;
      
    case 'feed_order':
    case 'ration_change':
      // Feed mill, feed truck, feedlot admin
      staff.filter(s => 
        s.role === 'feed_mill' ||
        s.role === 'feed_truck' ||
        s.role === 'feedlot_admin'
      ).forEach(s => recipients.add(s.email));
      break;
      
    case 'employee':
    case 'hr':
    case 'payroll':
      // Staff admin, office manager, HR
      staff.filter(s => 
        s.role === 'staff_admin' ||
        s.role === 'office_manager' ||
        s.department === 'Executive'
      ).forEach(s => recipients.add(s.email));
      break;
      
    case 'compliance':
    case 'legal':
      // Attorney CPA, admin, financial admin
      staff.filter(s => 
        s.role === 'attorney_cpa' ||
        s.role === 'admin' ||
        s.role === 'financial_admin'
      ).forEach(s => recipients.add(s.email));
      break;
      
    default:
      // Default: admin and relevant department heads
      staff.filter(s => s.role === 'admin' || s.role === 'super_admin')
        .forEach(s => recipients.add(s.email));
  }
  
  return Array.from(recipients);
}

async function sendNotificationEmail(recipientEmail, alertData) {
  try {
    const base44 = createClientFromRequest(req);
    
    await base44.integrations.Core.SendEmail({
      to: recipientEmail,
      subject: `[${alertData.severity.toUpperCase()}] ${alertData.title}`,
      body: `Hi,\n\n${alertData.message}\n\n---\nCategory: ${alertData.alert_type}\nPriority: ${alertData.severity}\nTimestamp: ${alertData.timestamp}\n\n---\nContinental Cattle Co. Alert System\nView all alerts in your dashboard: /alerts`,
      from_name: 'Continental Alerts',
    });
    
    return { email: recipientEmail, status: 'sent' };
  } catch (error) {
    console.error(`Email failed to ${recipientEmail}:`, error.message);
    return { email: recipientEmail, status: 'failed', error: error.message };
  }
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json().catch(() => ({}));
    const base44 = createClientFromRequest(req);
    
    // Verify authentication (allow service role for automations)
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      alert_type,
      title,
      message,
      severity = 'medium',
      category,
      related_entity,
      related_entity_id,
      custom_data = {},
    } = payload;

    // Get recipients based on alert type and severity
    const recipients = await getRecipientsForAlert(category || alert_type, severity, related_entity);

    // Create alert record
    const alert = await base44.entities.Alert.create({
      alert_type,
      severity,
      title,
      message,
      related_entity,
      related_entity_id,
      recipient_roles: recipients.map(r => 'user'), // Simplified
      is_read: false,
      notes: JSON.stringify(custom_data),
    });

    // Send emails to all recipients
    const emailPromises = recipients.map(email => 
      sendNotificationEmail(email, {
        severity,
        title,
        message,
        alert_type,
        timestamp: new Date().toISOString(),
      })
    );

    const emailResults = await Promise.all(emailPromises);
    const sentCount = emailResults.filter(r => r.status === 'sent').length;
    const failedCount = emailResults.filter(r => r.status === 'failed').length;

    return Response.json({
      status: 'success',
      alertId: alert.id,
      recipientsTotal: recipients.length,
      emailsSent: sentCount,
      emailsFailed: failedCount,
      emailResults: failedCount > 0 ? emailResults : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[COMPREHENSIVE NOTIFICATION] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});