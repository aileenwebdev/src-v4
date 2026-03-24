// api/trigger-workflow.js - Vercel Edge Function (PRODUCTION READY)
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // ✅ ADDED: Try/catch for error handling
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }

    const { workflowId, contactId, data } = await req.json();
    const token = process.env.GHL_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    // ✅ FIXED: No extra spaces in URL
    const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
        'locationId': locationId,
      },
      body: JSON.stringify({
        tags: [`workflow_${workflowId}_triggered`],
        customFields: {
          workflow_trigger_id: workflowId,
          workflow_triggered_at: new Date().toISOString(),
          ...data
        }
      })
    });

    const result = await response.json();
    return new Response(JSON.stringify({
      success: response.ok,
      contactId,
      workflowId
    }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Workflow trigger error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}