export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Honeypot
  if (body['bot-field']) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Server-side validation
  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const organisation = (body.organisation || '').trim();
  const sector = (body.sector || '').trim();
  const numSites = (body.numSites || '').trim();
  const location = (body.location || '').trim();

  if (!name) return err('Full name is required.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('A valid email address is required.');
  if (!organisation) return err('Organisation name is required.');
  if (!sector) return err('Sector is required.');
  if (!numSites) return err('Number of sites is required.');
  if (!location) return err('Site location is required.');

  // Build structured fields
  const phone = (body.phone || '').trim();
  const jobTitle = (body.jobTitle || '').trim();
  const propertyType = (body.propertyType || '').trim();
  const approxSize = (body.approxSize || '').trim();
  const currentFm = (body.currentFm || '').trim();
  const termDates = (body.termDates || '').trim();
  const cqcRegistered = (body.cqcRegistered || '').trim();
  const rpRegistered = (body.rpRegistered || '').trim();
  const services = Array.isArray(body.services) ? body.services.filter(Boolean) : [];
  const packageInterest = (body.packageInterest || '').trim();
  const budget = (body.budget || '').trim();
  const timeframe = (body.timeframe || '').trim();
  const existingContractors = (body.existingContractors || '').trim();
  const challenges = (body.challenges || '').trim();
  const additionalInfo = (body.additionalInfo || '').trim();
  const marketingConsent = (body.marketingConsent || 'no').trim();
  const sourcePage = (body.sourcePage || '').trim();

  // Email subject
  const subject = `ABFC — New Quote Request — ${sector}`;

  // Build HTML email
  const servicesHtml = services.length
    ? services.map(s => `<li>${esc(s)}</li>`).join('')
    : '<li><em>Not specified</em></li>';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${esc(subject)}</title></head>
<body style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;max-width:680px;margin:0 auto;padding:20px">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1f3c;border-radius:8px 8px 0 0">
  <tr><td style="padding:20px 24px">
    <span style="color:#fff;font-size:18px;font-weight:bold">AB Facilities Consultants</span>
    <span style="color:#0e7f74;font-size:13px;margin-left:12px">New Quote Request</span>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
  <tr><td style="padding:24px">

    <h2 style="color:#0d1f3c;margin:0 0 4px">${esc(subject)}</h2>
    <p style="color:#718096;margin:0 0 24px;font-size:13px">Received ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'full', timeStyle: 'short' })}</p>

    <h3 style="color:#0d1f3c;border-bottom:2px solid #0e7f74;padding-bottom:6px;margin-bottom:16px">Contact Details</h3>
    ${row('Full Name', name)}
    ${row('Organisation', organisation)}
    ${row('Business Email', `<a href="mailto:${esc(email)}">${esc(email)}</a>`)}
    ${phone ? row('Telephone', phone) : ''}
    ${jobTitle ? row('Job Title', jobTitle) : ''}

    <h3 style="color:#0d1f3c;border-bottom:2px solid #0e7f74;padding-bottom:6px;margin:24px 0 16px">Premises Information</h3>
    ${row('Sector', `<strong>${esc(sector)}</strong>`)}
    ${row('Number of Sites', numSites)}
    ${row('Location', location)}
    ${propertyType ? row('Property Type', propertyType) : ''}
    ${approxSize ? row('Approximate Size', approxSize) : ''}
    ${currentFm ? row('Current FM Arrangement', currentFm) : ''}
    ${termDates ? row('Term Dates Coordination', termDates) : ''}
    ${cqcRegistered ? row('CQC Registered', cqcRegistered) : ''}
    ${rpRegistered ? row('Registered Provider', rpRegistered) : ''}

    <h3 style="color:#0d1f3c;border-bottom:2px solid #0e7f74;padding-bottom:6px;margin:24px 0 16px">Services Required</h3>
    <ul style="margin:0 0 16px;padding-left:20px;line-height:1.8">${servicesHtml}</ul>
    ${packageInterest ? row('Preferred Package', packageInterest) : ''}
    ${budget ? row('Approximate Budget', budget) : ''}
    ${timeframe ? row('Desired Timeframe', timeframe) : ''}
    ${existingContractors ? row('Existing Contractor Arrangements', existingContractors) : ''}

    ${(challenges || additionalInfo) ? `<h3 style="color:#0d1f3c;border-bottom:2px solid #0e7f74;padding-bottom:6px;margin:24px 0 16px">Additional Information</h3>
    ${challenges ? row('Operational Challenges', esc(challenges).replace(/\n/g, '<br>')) : ''}
    ${additionalInfo ? row('Additional Notes', esc(additionalInfo).replace(/\n/g, '<br>')) : ''}` : ''}

    <h3 style="color:#0d1f3c;border-bottom:2px solid #0e7f74;padding-bottom:6px;margin:24px 0 16px">Metadata</h3>
    ${row('Marketing Consent', marketingConsent === 'yes' ? '✓ Yes' : '✗ No')}
    ${sourcePage ? row('Source Page', sourcePage) : ''}
    ${row('Submitted', new Date().toISOString())}

  </td></tr>
</table>

<p style="color:#a0aec0;font-size:11px;text-align:center;margin-top:16px">
  AB Facilities Consultants &middot; contact@abfacilities.com &middot; 07944 308462
</p>
</body>
</html>`;

  // Send via Resend
  const resendKey = env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('RESEND_API_KEY not set');
    return err('Email service not configured. Please call us on 07944 308462.', 500);
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: 'AB Facilities Consultants <noreply@abfacilities.com>',
      to: ['contact@abfacilities.com'],
      reply_to: email,
      subject,
      html,
    }),
  });

  if (!resendRes.ok) {
    const errBody = await resendRes.text().catch(() => '');
    console.error('Resend error', resendRes.status, errBody);
    return err('We could not send your enquiry right now. Please call 07944 308462.', 500);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function err(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(label, value) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">
    <tr>
      <td width="38%" style="color:#718096;font-size:13px;padding:6px 12px 6px 0;vertical-align:top">${label}</td>
      <td style="color:#1a1a1a;font-size:13px;padding:6px 0;vertical-align:top">${value}</td>
    </tr>
  </table>`;
}
