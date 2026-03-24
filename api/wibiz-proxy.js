// api/ghl-proxy.js - Vercel Edge Function (PRODUCTION READY)
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    const token = process.env.GHL_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    const { searchParams } = new URL(req.url);
    
    const endpoint = searchParams.get('endpoint') || '/contacts';
    const memberId = searchParams.get('memberId');
    const action = searchParams.get('action');
    const partySize = searchParams.get('partySize');

    // ✅ FIXED: No extra spaces in URL
    const ghlUrl = `https://services.leadconnectorhq.com${endpoint}`;
    
    const ghlHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
      'locationId': locationId,
    };

    // Handle different actions
    if (action === 'increment-visit-count') {
      return await handleVisitCountIncrement(token, locationId, memberId);
    }
    
    if (action === 'decrement-capacity') {
      return await handleCapacityDecrement(token, locationId, memberId, partySize);
    }

    // Default: fetch from GHL
    const response = await fetch(ghlUrl, {
      method: req.method,
      headers: ghlHeaders,
      body: req.method !== 'GET' ? await req.text() : undefined,
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers,
    });

  } catch (error) {
    console.error('GHL Proxy Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers,
    });
  }
}

// WF-02: Increment guest visit count (GHL can't do math)
async function handleVisitCountIncrement(token, locationId, guestId) {
  try {
    // ✅ FIXED: No extra spaces in URL
    const contactRes = await fetch(`https://services.leadconnectorhq.com/contacts/${guestId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
        'locationId': locationId,
      }
    });
    
    if (!contactRes.ok) {
      throw new Error(`Failed to fetch contact: ${contactRes.status}`);
    }
    
    const contact = await contactRes.json();
    const currentCount = contact.contact?.customFields?.visit_count_this_month || 0;
    const newCount = currentCount + 1;
    
    // ✅ FIXED: No extra spaces in URL
    const updateRes = await fetch(`https://services.leadconnectorhq.com/contacts/${guestId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
        'locationId': locationId,
      },
      body: JSON.stringify({
        customFields: { visit_count_this_month: newCount }
      })
    });
    
    if (!updateRes.ok) {
      throw new Error(`Failed to update contact: ${updateRes.status}`);
    }
    
    return new Response(JSON.stringify({ success: true, newCount }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Visit count increment error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// WF-14: Decrement facility capacity (GHL can't subtract)
async function handleCapacityDecrement(token, locationId, facilityId, partySize) {
  try {
    // ✅ FIXED: No extra spaces in URL
    const facilityRes = await fetch(`https://services.leadconnectorhq.com/customObjects/facilities/${facilityId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
        'locationId': locationId,
      }
    });
    
    if (!facilityRes.ok) {
      throw new Error(`Failed to fetch facility: ${facilityRes.status}`);
    }
    
    const facility = await facilityRes.json();
    const currentCap = facility.customObject?.capacity || 0;
    const newCap = Math.max(0, currentCap - (parseInt(partySize) || 1));
    
    // ✅ FIXED: No extra spaces in URL
    const updateRes = await fetch(`https://services.leadconnectorhq.com/customObjects/facilities/${facilityId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
        'locationId': locationId,
      },
      body: JSON.stringify({
        capacity: newCap
      })
    });
    
    if (!updateRes.ok) {
      throw new Error(`Failed to update facility: ${updateRes.status}`);
    }
    
    return new Response(JSON.stringify({ success: true, newCapacity: newCap }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Capacity decrement error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}