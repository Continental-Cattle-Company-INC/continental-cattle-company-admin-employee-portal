/**
 * Live Continental Cattle Company Website Sync
 * Automatically fetches and syncs all marketplace & cattle data in real-time
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function fetchWebsiteData() {
  try {
    // Fetch raw HTML from Continental's website
    const response = await fetch('https://continentalcattlecompany.com');
    const html = await response.text();

    // Parse marketplace data (JSON-LD, data attributes, or structured content)
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/g);
    const structuredData = [];
    
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        try {
          const json = JSON.parse(match.replace(/<script[^>]*>|<\/script>/g, ''));
          structuredData.push(json);
        } catch (e) {
          // Continue if parse fails
        }
      }
    }

    // Extract cattle marketplace listings
    const cattleListings = [];
    
    // Look for cattle data in various formats
    const patterns = [
      /Ivanhoe.*?(\d+)\s*(?:head|hd).*?(\d+(?:\.\d+)?)\s*lbs?/gi,
      /Wagler.*?(\d+)\s*(?:head|hd).*?(\d+(?:\.\d+)?)\s*lbs?/gi,
      /Cooper.*?(\d+)\s*(?:head|hd).*?(\d+(?:\.\d+)?)\s*(?:lbs?|cwt)/gi,
      /marketplace.*?(\d+)\s*head.*?(\d+(?:\.\d+)?)\s*lbs?/gi,
      /for\s+sale.*?(\d+)\s*(?:head|hd).*?(\d+(?:\.\d+)?)\s*(?:lbs?|cwt)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        cattleListings.push({
          headCount: parseInt(match[1]),
          weight: parseFloat(match[2]),
          rawMatch: match[0],
        });
      }
    }

    return { 
      structuredData, 
      cattleListings,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[WEBSITE SYNC] Fetch error:', error.message);
    return { structuredData: [], cattleListings: [], error: error.message };
  }
}

async function parseCattleMarketplace(base44, webData) {
  try {
    const synced = [];
    const updates = [];

    // Default market conditions (will be overridden by live market data)
    const marketInputs = await base44.asServiceRole.entities.MarketInputs.list('-date', 1);
    const market = marketInputs[0] || {
      lc_futures: 240,
      choice_cutout: 320,
      corn_price: 4.25,
    };

    // Map web data to cattle lots
    for (const listing of webData.cattleListings) {
      if (!listing.headCount || !listing.weight) continue;

      // Calculate estimated value and metrics
      const liveWeight = listing.weight;
      const dressing = 0.62;
      const carcassWeight = liveWeight * dressing;
      const estimatedValue = (market.choice_cutout * carcassWeight / 100).toFixed(2);

      const cattleLot = {
        lot_id: `WEB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        entity: 'Continental',
        cattle_class: 'finished_cattle',
        head_count: listing.headCount,
        purchase_weight: listing.weight,
        current_weight: listing.weight,
        target_weight: listing.weight + 100,
        purchase_price: 215,
        purchase_date: new Date().toISOString().split('T')[0],
        yard: 'Ivanhoe',
        pen: 'Marketplace',
        cog: 0.65,
        yardage: 0.45,
        status: 'active',
        stage: 'finish',
        notes: `Live web sync from continentalcattlecompany.com - ${new Date().toLocaleString()}`,
      };

      synced.push(cattleLot);
    }

    return { synced, updates };
  } catch (error) {
    console.error('[WEBSITE SYNC] Parse error:', error.message);
    return { synced: [], updates: [], error: error.message };
  }
}

async function syncToDatabase(base44, cattleLots) {
  try {
    const results = {
      created: [],
      updated: [],
      errors: [],
    };

    for (const lot of cattleLots) {
      try {
        // Check if lot already exists (by lot_id)
        const existing = await base44.asServiceRole.entities.CattleLot.filter({ lot_id: lot.lot_id });

        if (existing.length === 0) {
          const created = await base44.asServiceRole.entities.CattleLot.create(lot);
          results.created.push(created.id);
        } else {
          // Update existing lot
          const updated = await base44.asServiceRole.entities.CattleLot.update(existing[0].id, {
            current_weight: lot.current_weight,
            updated_date: new Date().toISOString(),
          });
          results.updated.push(updated.id);
        }
      } catch (err) {
        results.errors.push({ lot: lot.lot_id, error: err.message });
      }
    }

    return results;
  } catch (error) {
    console.error('[WEBSITE SYNC] Database sync error:', error.message);
    return { created: [], updated: [], errors: [error.message] };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[WEBSITE SYNC] Starting real-time sync from continentalcattlecompany.com...');
    const startTime = Date.now();

    // Fetch data from website
    const webData = await fetchWebsiteData();

    // Parse into cattle lot format
    const { synced } = await parseCattleMarketplace(base44, webData);

    // Sync to database
    const syncResults = await syncToDatabase(base44, synced);

    const duration = Date.now() - startTime;

    console.log(`[WEBSITE SYNC] Complete: ${syncResults.created.length} created, ${syncResults.updated.length} updated (${duration}ms)`);

    return Response.json({
      status: 'synced',
      timestamp: new Date().toISOString(),
      website: {
        url: 'https://continentalcattlecompany.com',
        cattleListingsFound: webData.cattleListings.length,
      },
      sync: {
        created: syncResults.created.length,
        updated: syncResults.updated.length,
        errors: syncResults.errors.length,
      },
      auditDuration: duration,
    });
  } catch (error) {
    console.error('[WEBSITE SYNC] Fatal error:', error.message);
    return Response.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
});