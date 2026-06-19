/**
 * Notification triggers for various business events
 * Called by entity automations to send real-time alerts
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const payload = await req.json().catch(() => ({}));
    const base44 = createClientFromRequest(req);
    
    // Get event data from automation trigger
    const { event, data, old_data } = payload;
    
    if (!event || !data) {
      return Response.json({ error: 'Invalid trigger data' }, { status: 400 });
    }

    const notifications = [];

    // Handle different entity events
    switch (event.entity_name) {
      case 'CattleLot':
        if (event.type === 'create') {
          // New cattle load notification
          notifications.push({
            alert_type: 'new_load',
            category: 'cattle_movement',
            title: `🚛 New Load: ${data.lot_id || data.breed_type}`,
            message: `New cattle lot created:\n` +
              `Lot: ${data.lot_id || 'N/A'}\n` +
              `Breed: ${data.breed_type}\n` +
              `Sex: ${data.sex}\n` +
              `Head Count: ${data.head_count}\n` +
              `Weight: ${data.purchase_weight} lbs\n` +
              `Purchase Price: $${data.purchase_price}/cwt\n` +
              `Yard: ${data.yard}, Pen: ${data.pen}\n` +
              `Stage: ${data.stage}`,
            severity: 'low',
            related_entity: 'CattleLot',
            related_entity_id: data.id,
          });
        }
        if (event.type === 'update') {
          // Status change notification
          if (data.status !== old_data?.status) {
            notifications.push({
              alert_type: 'status_change',
              category: 'cattle_movement',
              title: `📊 Lot Status Changed: ${data.lot_id}`,
              message: `Lot ${data.lot_id} status changed from ${old_data?.status} to ${data.status}\n` +
                `Yard: ${data.yard}, Pen: ${data.pen}\n` +
                `Head Count: ${data.head_count}\n` +
                `Current Weight: ${data.current_weight} lbs`,
              severity: data.status === 'sold' || data.status === 'dead' ? 'high' : 'medium',
              related_entity: 'CattleLot',
              related_entity_id: data.id,
            });
          }
        }
        break;

      case 'LotHealthEvent':
        if (event.type === 'create') {
          // Health event notification
          const severity = data.event_type === 'death' ? 'critical' : 
                          data.event_type === 'pull' ? 'high' : 'medium';
          
          notifications.push({
            alert_type: 'health_event',
            category: 'health_event',
            title: `⚕️ Health Event: ${data.event_type}`,
            message: `Health event recorded:\n` +
              `Type: ${data.event_type}\n` +
              `Lot: ${data.cattle_lot_id}\n` +
              `Yard: ${data.yard}, Pen: ${data.pen}\n` +
              `Date: ${data.event_date}\n` +
              `Head Affected: ${data.head_affected}\n` +
              `Diagnosis: ${data.diagnosis || 'N/A'}\n` +
              `Treatment: ${data.treatment || 'N/A'}`,
            severity,
            related_entity: 'LotHealthEvent',
            related_entity_id: data.id,
          });
        }
        break;

      case 'PenFeedOrder':
        if (event.type === 'create') {
          // Feed order notification
          notifications.push({
            alert_type: 'feed_order',
            category: 'feed_order',
            title: `🌾 New Feed Order: Pen ${data.pen}`,
            message: `Feed order created:\n` +
              `Yard: ${data.yard}\n` +
              `Pen: ${data.pen}\n` +
              `Ration: ${data.ration_name}\n` +
              `Total Lbs: ${data.total_lbs}\n` +
              `Feed Time: ${data.feed_time}\n` +
              `Date: ${data.feed_date}`,
            severity: 'low',
            related_entity: 'PenFeedOrder',
            related_entity_id: data.id,
          });
        }
        break;

      case 'Bid':
        if (event.type === 'create') {
          notifications.push({
            alert_type: 'bid_created',
            category: 'bid_created',
            title: `💰 New Bid Placed`,
            message: `New bid received:\n` +
              `Bidder: ${data.bidder_id}\n` +
              `Amount: $${data.bid_amount}\n` +
              `Price/Unit: $${data.price_per_unit}/${data.unit_type}\n` +
              `Lot: ${data.cattle_lot_id}`,
            severity: 'medium',
            related_entity: 'Bid',
            related_entity_id: data.id,
          });
        }
        if (event.type === 'update' && data.status === 'accepted' && old_data?.status !== 'accepted') {
          notifications.push({
            alert_type: 'bid_accepted',
            category: 'bid_accepted',
            title: `✅ Bid Accepted`,
            message: `Bid has been accepted:\n` +
              `Bid ID: ${data.id}\n` +
              `Amount: $${data.bid_amount}\n` +
              `Buyer: ${data.bidder_id}\n` +
              `Lot: ${data.cattle_lot_id}\n` +
              `Accepted by: ${data.accepted_by}`,
            severity: 'high',
            related_entity: 'Bid',
            related_entity_id: data.id,
          });
        }
        break;

      case 'BidSettlement':
        if (event.type === 'create') {
          notifications.push({
            alert_type: 'settlement',
            category: 'settlement',
            title: `💵 Settlement Created`,
            message: `New settlement processed:\n` +
              `Sale Price: $${data.total_sale_price}\n` +
              `Weight: ${data.total_weight} lbs\n` +
              `Commission: $${data.commission_amount}\n` +
              `Seller Receives: $${data.seller_receives}\n` +
              `Status: ${data.payment_status}`,
            severity: 'high',
            related_entity: 'BidSettlement',
            related_entity_id: data.id,
          });
        }
        break;

      case 'MaintenanceTicket':
        if (event.type === 'create') {
          const severity = data.priority === 'urgent' ? 'critical' : 
                          data.priority === 'high' ? 'high' : 'medium';
          
          notifications.push({
            alert_type: 'maintenance_urgent',
            category: 'maintenance_urgent',
            title: `🔧 Maintenance: ${data.title}`,
            message: `Maintenance ticket created:\n` +
              `Priority: ${data.priority}\n` +
              `Category: ${data.category}\n` +
              `Location: ${data.location}\n` +
              `Reported by: ${data.reported_by}`,
            severity,
            related_entity: 'MaintenanceTicket',
            related_entity_id: data.id,
          });
        }
        break;

      case 'DealCalculator':
        if (event.type === 'create' || event.type === 'update') {
          // Check if trucking cost is high
          const truckingIn = data.trucking_in || 0;
          const truckingOut = data.trucking_out || 0;
          const totalTrucking = truckingIn + truckingOut;
          
          if (totalTrucking > 1000) {
            notifications.push({
              alert_type: 'fuel_threshold',
              category: 'logistics',
              title: `⛽ High Freight Cost Alert`,
              message: `Freight costs exceed threshold:\n` +
                `Deal: ${data.deal_name}\n` +
                `Trucking In: $${truckingIn}\n` +
                `Trucking Out: $${truckingOut}\n` +
                `Total: $${totalTrucking}\n` +
                `Threshold: $1,000`,
              severity: 'high',
              related_entity: 'DealCalculator',
              related_entity_id: data.id,
              custom_data: { trucking_in: truckingIn, trucking_out: truckingOut, threshold: 1000 },
            });
          }
        }
        break;

      case 'FieldSubmission':
        if (event.type === 'create') {
          notifications.push({
            alert_type: 'field_submission',
            category: 'operations',
            title: `📝 New Field Submission: ${data.title}`,
            message: `Field submission received:\n` +
              `Type: ${data.submission_type}\n` +
              `Entity: ${data.entity}\n` +
              `Submitted by: ${data.submitted_by}\n` +
              `Status: ${data.status}`,
            severity: data.status === 'pending' ? 'medium' : 'low',
            related_entity: 'FieldSubmission',
            related_entity_id: data.id,
          });
        }
        break;

      case 'StaffDirectory':
        if (event.type === 'create') {
          notifications.push({
            alert_type: 'employee',
            category: 'hr',
            title: `👤 New Employee Added`,
            message: `New staff member:\n` +
              `Name: ${data.full_name}\n` +
              `Role: ${data.role}\n` +
              `Department: ${data.department}\n` +
              `Email: ${data.email}\n` +
              `Phone: ${data.phone}`,
            severity: 'low',
            related_entity: 'StaffDirectory',
            related_entity_id: data.id,
          });
        }
        break;

      default:
        console.log(`No notification handler for entity: ${event.entity_name}`);
    }

    // Send all notifications
    const results = [];
    for (const notification of notifications) {
      try {
        const res = await base44.functions.invoke('sendComprehensiveNotifications', {
          ...notification,
          timestamp: new Date().toISOString(),
        });
        results.push({ notification: notification.title, status: 'sent', alertId: res.data?.alertId });
      } catch (error) {
        results.push({ notification: notification.title, status: 'failed', error: error.message });
      }
    }

    return Response.json({
      status: 'success',
      notificationsGenerated: notifications.length,
      notificationsSent: results.filter(r => r.status === 'sent').length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[NOTIFICATION TRIGGER] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});