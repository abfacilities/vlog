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

  const { name, email, phone, company, role, location, numSites, propertyType,
          approxSize, services, packageInterest, currentFm, message } = body;

  if (!name || !email || !company) {
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
<h2>New Quote Request</h2>
<table style="border-collapse:collapse;width:100%">
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;width:200px">Name</td><td style="padding:8px;border:1px solid #ddd">${name}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd">${email}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Phone</td><td style="padding:8px;border:1px solid #ddd">${phone || '—'}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Company</td><td style="padding:8px;border:1px solid #ddd">${company}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Role</td><td style="padding:8px;border:1px solid #ddd">${role || '—'}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Location(s)</td><td style="padding:8px;border:1px solid #ddd">${location || '—'}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Number of Sites</td><td style="padding:8px;border:1px solid #ddd">${numSites || '—'}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Property Type</td><td style="padding:8px;border:1px solid #ddd">${propertyType || '—'}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Approximate Size</td><td style="padding:8px;border:1px solid #ddd">${approxSize || '—'}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Services of Interest</td><td style="padding:8px;border:1px solid #ddd">${services || '—'}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Package Interest</td><td style="padding:8px;border:1px solid #ddd">${packageInterest || '—'}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Current FM Situation</td><td style="padding:8px;border:1px solid #ddd">${currentFm || '—'}</td></tr>
</table>
${message ? `<h3>Additional Information</h3><p style="white-space:pre-wrap">${message}</p>` : ''}
<hr>
<p style="color:#666;font-size:12px">Submitted via abfacilities.com/quote/</p>`;

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
      subject: `Quote Request: ${company} — ${name}`,
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
