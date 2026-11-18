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
  const message = (body.message || '').trim();

  if (!name) return err('Full name is required.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('A valid email address is required.');
  if (!message) return err('Please include a message.');

  const phone = (body.phone || '').trim();
  const organisation = (body.organisation || '').trim();
  const category = (body.category || 'General enquiry').trim();

  // Email subject — format per brief
  const categoryLabel = category || 'General Enquiry';
  const subject = `ABFC — New FM Enquiry — ${categoryLabel}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${esc(subject)}</title></head>
<body style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;max-width:680px;margin:0 auto;padding:20px">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1f3c;border-radius:8px 8px 0 0">
  <tr><td style="padding:20px 24px">
    <span style="color:#fff;font-size:18px;font-weight:bold">AB Facilities Consultants</span>
    <span style="color:#0e7f74;font-size:13px;margin-left:12px">Contact Enquiry</span>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
  <tr><td style="padding:24px">

    <h2 style="color:#0d1f3c;margin:0 0 4px">${esc(subject)}</h2>
    <p style="color:#718096;margin:0 0 24px;font-size:13px">Received ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'full', timeStyle: 'short' })}</p>

    <h3 style="color:#0d1f3c;border-bottom:2px solid #0e7f74;padding-bottom:6px;margin-bottom:16px">Contact Details</h3>
    ${row('Full Name', name)}
    ${row('Email', `<a href="mailto:${esc(email)}">${esc(email)}</a>`)}
    ${phone ? row('Telephone', phone) : ''}
    ${organisation ? row('Organisation', organisation) : ''}
    ${row('Enquiry Category', `<strong>${esc(categoryLabel)}</strong>`)}

    <h3 style="color:#0d1f3c;border-bottom:2px solid #0e7f74;padding-bottom:6px;margin:24px 0 16px">Message</h3>
    <div style="background:#f7fafc;border-left:3px solid #0e7f74;padding:14px 16px;border-radius:0 6px 6px 0;line-height:1.6">
      ${esc(message).replace(/\n/g, '<br>')}
    </div>

    <h3 style="color:#0d1f3c;border-bottom:2px solid #0e7f74;padding-bottom:6px;margin:24px 0 16px">Metadata</h3>
    ${row('Submitted', new Date().toISOString())}

  </td></tr>
</table>

<p style="color:#a0aec0;font-size:11px;text-align:center;margin-top:16px">
  AB Facilities Consultants &middot; contact@abfacilities.com &middot; 07944 308462
</p>
</body>
</html>`;

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
    return err('We could not send your message right now. Please call 07944 308462.', 500);
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
