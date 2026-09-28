// Handles two lead-capture flows for abfacilities.com via the Resend REST API:
//   - "guide": visitor requests the 2026/27 Compliance Changes Checklist PDF
//   - "newsletter": visitor signs up for occasional compliance-update emails
//
// Both flows now also add the visitor as a contact to the Resend Audience
// (RESEND_AUDIENCE_ID) so they actually receive future newsletter sends, plus a
// one-off notification email to Adam so leads aren't missed.
//
// Cloudflare Pages Function. Calls Resend directly via fetch (no npm SDK), matching
// the pattern used by functions/api/contact.js.
//
// Required environment variables (set in Cloudflare Pages project settings, never in git):
//   RESEND_API_KEY      - API key from resend.com
//   RESEND_AUDIENCE_ID   - Resend Audience ID to add subscribers to (see setup-audience.js)
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

  // Add to the Resend audience so this person actually receives future newsletter sends.
  // Non-fatal if this fails (e.g. audience not configured yet, or already subscribed) -
  // we still want the visitor to get their checklist / confirmation.
  if (env.RESEND_AUDIENCE_ID) {
    try {
      await fetch(`https://api.resend.com/audiences/${env.RESEND_AUDIENCE_ID}/contacts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: String(email), unsubscribed: false })
      });
    } catch (e) {
      // swallow - notification email below still lets Adam know about the lead
    }
  }

  const subject = src === 'guide'
    ? `New compliance checklist download: ${email}`
    : `New newsletter signup: ${email}`;

  const text = src === 'guide'
    ? `${email} requested the 2026/27 Compliance Changes Checklist PDF from abfacilities.com and has been added to the newsletter list.`
    : `${email} signed up for compliance update emails from abfacilities.com and has been added to the newsletter list.`;

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
      // Contact was likely still added to the audience above, so don't fail the whole
      // request just because the notification email had trouble - the visitor still
      // gets their download.
      return new Response(
        JSON.stringify({ ok: true, downloadUrl: '/assets/downloads/compliance-changes-checklist-2026-27.pdf', warning: 'notification_failed', detail: errText }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
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
