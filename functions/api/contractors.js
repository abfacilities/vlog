export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Honeypot check
  if (body['bot-field']) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }

  const { businessName, contactName, contactRole, email, phone, location, coverage,
          trades, otherTrade, plCover, elCover, accreditation, workers, message } = body;

  if (!businessName || !contactName || !email || !phone || !message) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email address' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const html = `
<h2>New Contractor Registration</h2>
<h3>Business Details</h3>
<table style="border-collapse:collapse;width:100%">
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;width:200px">Business Name</td><td style="padding:8px;border:1px solid #ddd">${businessName}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Contact Name</td><td style="padding:8px;border:1px solid #ddd">${contactName}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Role</td><td style="padding:8px;border:1px solid #ddd">${contactRole || '—'}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd">${email}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Phone</td><td style="padding:8px;border:1px solid #ddd">${phone}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Based In</td><td style="padding:8px;border:1px solid #ddd">${location || '—'}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Coverage Area</td><td style="padding:8px;border:1px solid #ddd">${coverage || '—'}</td></tr>
</table>
<h3>Trade Coverage</h3>
<table style="border-collapse:collapse;width:100%">
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;width:200px">Trades</td><td style="padding:8px;border:1px solid #ddd">${trades || '—'}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Other Trades</td><td style="padding:8px;border:1px solid #ddd">${otherTrade || '—'}</td></tr>
</table>
<h3>Insurance &amp; Compliance</h3>
<table style="border-collapse:collapse;width:100%">
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;width:200px">Public Liability</td><td style="padding:8px;border:1px solid #ddd">${plCover || '—'}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Employer's Liability</td><td style="padding:8px;border:1px solid #ddd">${elCover || '—'}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Accreditations</td><td style="padding:8px;border:1px solid #ddd">${accreditation || '—'}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Workforce Size</td><td style="padding:8px;border:1px solid #ddd">${workers || '—'}</td></tr>
</table>
<h3>About the Business</h3>
<p style="white-space:pre-wrap">${message}</p>
<hr>
<p style="color:#666;font-size:12px">Submitted via abfacilities.com/contractors/</p>`;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'AB Facilities Website <noreply@abfacilities.com>',
      to: ['contact@abfacilities.com'],
      reply_to: email,
      subject: `Contractor Registration: ${businessName} — ${trades || 'Various trades'}`,
      html
    })
  });

  if (!resendRes.ok) {
    const err = await resendRes.text();
    console.error('Resend error:', err);
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestGet() {
  return new Response('Method Not Allowed', { status: 405 });
}
