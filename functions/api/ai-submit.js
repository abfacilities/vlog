/**
 * AB Facilities AI — Submission endpoint
 * POST /api/ai-submit
 * Body: { type: 'enquiry'|'fault'|'quote', sessionData: {}, conversation: [{role, content}] }
 * Routes the completed AI session to the right handler and sends email via Resend.
 * Env vars required: RESEND_API_KEY
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const resendKey = env.RESEND_API_KEY;
  if (!resendKey) {
    return jsonErr('Email service not configured. Please call 07944 308462.', 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonErr('Invalid request body.', 400);
  }

  const { type, sessionData = {}, conversation = [] } = body;

  if (!type) return jsonErr('Submission type required.', 400);

  const name = (sessionData.name || '').trim();
  const email = (sessionData.email || '').trim();

  if (!name) return jsonErr('Name is required.', 400);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonErr('A valid email address is required.', 400);
  }

  const ts = new Date().toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  let subject, html;

  if (type === 'fault') {
    subject = `ABFC — FAULT REPORT — ${esc(sessionData.site || 'Unknown site')}`;
    html = buildFaultEmail({ sessionData, conversation, ts });
  } else if (type === 'quote') {
    subject = `ABFC — Quote Request — ${esc(name)} — ${esc(sessionData.siteType || sessionData.site || 'Site')}`;
    html = buildQuoteEmail({ sessionData, conversation, ts });
  } else {
    subject = `ABFC — AI Enquiry — ${esc(name)}`;
    html = buildEnquiryEmail({ sessionData, conversation, ts });
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: 'AB Facilities AI <noreply@abfacilities.com>',
      to: ['contact@abfacilities.com'],
      reply_to: email,
      subject,
      html,
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text().catch(() => '');
    console.error('Resend error', resendRes.status, errText);
    return jsonErr('Could not send your message. Please call 07944 308462.', 500);
  }

  // Also send acknowledgement to customer
  const ackRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: 'AB Facilities Consultants <noreply@abfacilities.com>',
      to: [email],
      reply_to: 'contact@abfacilities.com',
      subject: `${type === 'fault' ? 'Fault report received' : 'Enquiry received'} — AB Facilities Consultants`,
      html: buildAckEmail({ name, type, ts }),
    }),
  }).catch(() => null);

  if (!ackRes?.ok) {
    // Non-fatal — log but don't fail the submission
    console.warn('Ack email failed');
  }

  return new Response(JSON.stringify({ ok: true, type }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// ── Email builders ──────────────────────────────────────────────────────────

function buildEnquiryEmail({ sessionData, conversation, ts }) {
  const fields = Object.entries(sessionData)
    .filter(([, v]) => v)
    .map(([k, v]) => row(formatKey(k), esc(String(v))))
    .join('');

  const transcript = formatTranscript(conversation);

  return wrapEmail(`
    <h2 style="color:#0d1f3c;margin:0 0 4px">AI Enquiry — ${esc(sessionData.name || '')}</h2>
    <p style="color:#718096;margin:0 0 24px;font-size:13px">Received ${ts} via AB Facilities AI Assistant</p>
    <h3 style="color:#0d1f3c;border-bottom:2px solid #0e7f74;padding-bottom:6px;margin-bottom:16px">Customer Details</h3>
    ${fields}
    <h3 style="color:#0d1f3c;border-bottom:2px solid #0e7f74;padding-bottom:6px;margin:24px 0 16px">AI Conversation Transcript</h3>
    ${transcript}
  `);
}

function buildQuoteEmail({ sessionData, conversation, ts }) {
  const fields = Object.entries(sessionData)
    .filter(([, v]) => v)
    .map(([k, v]) => row(formatKey(k), esc(String(v))))
    .join('');

  const transcript = formatTranscript(conversation);

  return wrapEmail(`
    <h2 style="color:#0d1f3c;margin:0 0 4px">Quote Request — ${esc(sessionData.name || '')}</h2>
    <p style="color:#718096;margin:0 0 24px;font-size:13px">Received ${ts} via AB Facilities AI Assistant</p>
    <div style="background:#fef3c7;border-left:4px solid #d97706;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:20px">
      <strong style="color:#92400e">Quote request — follow up within 2 working days</strong>
    </div>
    <h3 style="color:#0d1f3c;border-bottom:2px solid #0e7f74;padding-bottom:6px;margin-bottom:16px">Site &amp; Customer Details</h3>
    ${fields}
    <h3 style="color:#0d1f3c;border-bottom:2px solid #0e7f74;padding-bottom:6px;margin:24px 0 16px">AI Conversation Transcript</h3>
    ${transcript}
  `);
}

function buildFaultEmail({ sessionData, conversation, ts }) {
  const fields = Object.entries(sessionData)
    .filter(([, v]) => v)
    .map(([k, v]) => row(formatKey(k), esc(String(v))))
    .join('');

  const transcript = formatTranscript(conversation);
  const urgent = String(sessionData.urgency || '').toLowerCase().includes('safety') ||
                 String(sessionData.urgency || '').toLowerCase().includes('urgent') ||
                 String(sessionData.urgency || '').toLowerCase().includes('immediate');

  return wrapEmail(`
    <h2 style="color:${urgent ? '#991b1b' : '#0d1f3c'};margin:0 0 4px">
      ${urgent ? '⚠ URGENT — ' : ''}Fault Report — ${esc(sessionData.site || 'Unknown site')}
    </h2>
    <p style="color:#718096;margin:0 0 24px;font-size:13px">Received ${ts} via AB Facilities AI</p>
    ${urgent ? `<div style="background:#fef2f2;border-left:4px solid #991b1b;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:20px">
      <strong style="color:#991b1b">Safety / urgent flag raised by customer — action required promptly</strong>
    </div>` : ''}
    <h3 style="color:#0d1f3c;border-bottom:2px solid #0e7f74;padding-bottom:6px;margin-bottom:16px">Fault Details</h3>
    ${fields}
    <h3 style="color:#0d1f3c;border-bottom:2px solid #0e7f74;padding-bottom:6px;margin:24px 0 16px">Full Conversation</h3>
    ${transcript}
  `);
}

function buildAckEmail({ name, type, ts }) {
  const typeLabel = type === 'fault' ? 'fault report' : 'enquiry';
  return wrapEmail(`
    <h2 style="color:#0d1f3c;margin:0 0 4px">Thanks, ${esc(name)} — we've received your ${typeLabel}</h2>
    <p style="color:#718096;margin:0 0 24px;font-size:13px">Sent ${ts}</p>
    <p>We've received your ${typeLabel} and will come back to you within ${type === 'fault' ? 'one working day' : 'two working days'}.</p>
    <p>If this is urgent or you need to speak to someone now, call us on <a href="tel:+447944308462">07944 308462</a>.</p>
    <p style="color:#718096;font-size:13px;margin-top:24px">AB Facilities Consultants · Bootle, Liverpool · <a href="https://www.abfacilities.com">abfacilities.com</a></p>
  `);
}

function wrapEmail(inner) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;max-width:680px;margin:0 auto;padding:20px">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1f3c;border-radius:8px 8px 0 0">
  <tr><td style="padding:20px 24px">
    <span style="color:#fff;font-size:18px;font-weight:bold">AB Facilities Consultants</span>
    <span style="color:#0e7f74;font-size:13px;margin-left:12px">AI Assistant</span>
  </td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
  <tr><td style="padding:24px">${inner}</td></tr>
</table>
<p style="color:#a0aec0;font-size:11px;text-align:center;margin-top:16px">
  AB Facilities Consultants · contact@abfacilities.com · 07944 308462
</p></body></html>`;
}

function formatTranscript(conversation) {
  if (!Array.isArray(conversation) || conversation.length === 0) return '<p style="color:#718096">No transcript available.</p>';
  return conversation.map(m => `
    <div style="margin-bottom:12px;padding:10px 14px;border-radius:8px;background:${m.role === 'user' ? '#f0fdf4' : '#f8fafc'};border-left:3px solid ${m.role === 'user' ? '#0e7f74' : '#cbd5e1'}">
      <div style="font-size:11px;font-weight:700;color:${m.role === 'user' ? '#065f46' : '#475569'};margin-bottom:4px;text-transform:uppercase">${m.role === 'user' ? 'Customer' : 'AB Facilities AI'}</div>
      <div style="font-size:13px;line-height:1.5">${esc(m.content).replace(/\n/g, '<br>')}</div>
    </div>`).join('');
}

function formatKey(k) {
  return k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
}

function row(label, value) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px">
    <tr>
      <td width="38%" style="color:#718096;font-size:13px;padding:6px 12px 6px 0;vertical-align:top">${label}</td>
      <td style="color:#1a1a1a;font-size:13px;padding:6px 0;vertical-align:top">${value}</td>
    </tr>
  </table>`;
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function jsonErr(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
