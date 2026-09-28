// Handles two lead-capture flows for abfacilities.com via the Resend REST API:
//   - "guide": visitor requests the 2026/27 Compliance Changes Checklist PDF
//   - "newsletter": visitor signs up for occasional compliance-update emails
//
// Cloudflare Pages Function. Calls Resend directly via fetch (no npm SDK), matching
// the pattern used by functions/api/contact.js.
//
// Required environment variable (set in Cloudflare Pages project settings, never in git):
//   RESEND_API_KEY     - API key from resend.com
//
// Optional environment variables:
//   CONTACT_TO_EMAIL    - Where lead notifications land. Defaults to contact@abfacilities.com
//   CONTACT_FROM_EMAIL  - Verified sending address. Defaults to the shared sandbox sender.

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'This form is not fully set up yet. Please call or email us directly instead.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let email, source, botField;
  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      ({ email, source, 'bot-field': botField } = await request.json());
    } else {
      const form = await request.formData();
      email = form.get('email');
      source = form.get('source');
      botField = form.get('bot-field');
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Honeypot: bots fill hidden fields, real users leave it blank.
  if (botField) {
    return new Response(JSON.stringify({ ok: true, downloadUrl: '/assets/downloads/compliance-changes-checklist-2026-27.pdf' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailPattern.test(String(email))) {
    return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const validSources = ['guide', 'newsletter'];
  const src = validSources.includes(source) ? source : 'newsletter';

  const toEmail = env.CONTACT_TO_EMAIL || 'contact@abfacilities.com';
  const fromEmail = env.CONTACT_FROM_EMAIL || 'AB Facilities Website <contact@abfacilities.com>';

  const subject = src === 'guide'
    ? `New compliance checklist download: ${email}`
    : `New newsletter signup: ${email}`;

  const text = src === 'guide'
    ? `${email} requested the 2026/27 Compliance Changes Checklist PDF from abfacilities.com.`
    : `${email} signed up for compliance update emails from abfacilities.com.`;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: String(email),
        subject,
        text
      })
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      return new Response(
        JSON.stringify({ error: 'Could not process your request. Please try again or contact us directly.', detail: errText }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, downloadUrl: '/assets/downloads/compliance-changes-checklist-2026-27.pdf' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Could not process your request. Please try again or contact us directly.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function onRequestGet() {
  return new Response('Method Not Allowed', { status: 405 });
}
