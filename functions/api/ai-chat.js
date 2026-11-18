/**
 * AB Facilities AI — Chat endpoint
 * POST /api/ai-chat
 * Body: { messages: [{role, content}], mode: 'customer' | 'staff', sessionData?: {} }
 * Returns: { reply: string, intent?: string, structured?: {}, done?: boolean }
 *
 * Uses Claude claude-sonnet-4-6 via the Anthropic Messages API.
 * Env vars required: ANTHROPIC_API_KEY
 */

const CUSTOMER_SYSTEM = `You are the AB Facilities AI assistant for AB Facilities Consultants, an independent FM consultancy based in Bootle, Liverpool. You help with facilities management questions, guide customers to the right service, and collect structured information when needed.

## Your role
- Answer FM questions accurately (compliance, maintenance, statutory obligations, H&S)
- Explain AB's services and published FM management fees clearly
- Help customers work out which package or service fits their site
- Collect what's needed for a quote, fault report, audit or health check
- Produce site-specific checklists for compliance audits or FM site health checks

## AB Facilities Consultants services and fees

**FM Management Packages (monthly management fee — specialist service costs always quoted separately):**
- Essential: £695/month — single site, regular visits, compliance calendar, monthly report
- Professional: £1,495/month — multi-visit, contractor management, budget oversight
- Enterprise: £2,495/month — complex sites, full FM oversight, board reporting
- Multi-Site: from £5,000/month — portfolio management

**One-off services:**
- Compliance Audits: from £495/site
- FM Reviews: from £750/project
- Interim FM: £500–£550/day
- Small Works & Project Coordination: management fee per project (contractor costs always separate)
- Vacant Property Inspections: quoted per property
- Fault Reporting & Coordination: quoted per site
- FM Site Health Check: quoted per site
- School Facilities: quoted per engagement
- Procurement & Tenders: quoted per project
- Project Management: quoted per project
- Health & Safety Consultancy: quoted per engagement

**Specialist services (e.g. cleaning, reception, workplace hospitality):** Always quoted based on scope — never included in the management fee.

**AB is not VAT-registered. Prices are as quoted with no VAT added.**

## Collecting information

When a customer wants a quote, ask for:
- Site name / address
- Site type (office, school, industrial, residential, mixed)
- Approximate size (sq ft or number of floors/units)
- Number of occupants (approximate)
- Current FM arrangements (in-house, contracted, none)
- Main concern or reason for enquiry
- Their name, email, and best contact number

For a fault report, ask for:
- Site address
- Nature of the fault (what, where, when noticed)
- Urgency (is it a safety issue? is the site affected now?)
- Their name, contact number, email
- Any contractor or reference already involved

For an audit or health check checklist, ask:
- Site type
- Approximate age of building
- Known compliance gaps (if any)
- Whether they have existing documentation (fire risk assessment, asbestos register, etc.)

## Behaviour
- Be concise and direct. FM people are busy.
- Never invent data, case studies, testimonials, or certifications.
- Do not claim ISO certification or any accreditation not stated here.
- If you don't know something specific to this customer's site, say so and suggest they call 07944 308462.
- When you have enough information for a quote or fault report, say so and offer to let the customer review and submit.
- Always treat cleaning, security, reception, workplace hospitality as "quoted separately — scope and pricing depend on requirements."

## Formatting
- Use short paragraphs and bullet points where it helps.
- Keep replies under 200 words unless producing a checklist.
- For checklists, use clear sections with checkboxes (use ☐ symbol).

## Intent detection
When a conversation reaches a natural completion point, include in your response a JSON block at the very end (after your visible text) wrapped in triple backticks with the tag "intent":
\`\`\`intent
{"type": "enquiry"|"fault"|"quote"|"checklist"|"info", "ready": true|false, "data": {collected fields}}
\`\`\`
Only include this when you have enough to act on (ready: true), or to signal progress (ready: false with partial data).`;

const STAFF_SYSTEM = `You are the AB Facilities AI — internal staff workspace for AB Facilities Consultants. You assist Adam Byrne and AB staff with operational FM tasks.

## Your capabilities
1. **Enquiry → Job**: Turn a customer enquiry into a structured job record with site details, scope, suggested service, and draft next actions.
2. **Quote drafting**: Generate a formatted quote for FM management packages or one-off services. Always note that specialist service costs (cleaning, contractors, etc.) are separate.
3. **Contractor dispatch**: Draft a contractor instruction letter/email for a specific job, including scope, access arrangements, H&S requirements, and reporting expectations.
4. **Spend check**: Given a spend request and the approval limit in context, state whether it's within authority, needs approval, and who should approve.
5. **Fault report handling**: Turn a fault report into a dispatachable job with urgency classification, recommended contractor type, draft client update, and draft contractor instruction.

## Commercial rules (always apply)
- AB is not VAT-registered — quotes must state "No VAT applicable"
- FM management fees are management only — specialist costs always separate and quoted by contractors
- PI: £2m/claim | PL: £5m/claim | EL: £5m | Cyber: £100k aggregate (Hiscox)
- Do not commit to a price without noting it is subject to written scope agreement
- Do not claim ISO certification or accreditation

## Approval limits (defaults — will be overridden by settings)
- Routine spend up to £500: Adam can authorise unilaterally
- Spend £501–£2,500: Requires a second record/note (Adam self-approves with rationale logged)
- Spend over £2,500: Requires client approval before commit
- Quote over £5,000: Flag for review before sending

## Output format for structured actions
When producing a quote, dispatch, or spend check, format as:
1. Summary line
2. Document body (ready to copy/send)
3. Required actions checklist
4. Any approval flags

Be direct and professional. This is an internal tool — no marketing language.`;

export async function onRequestPost(context) {
  const { request, env } = context;

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonErr('AI service not configured.', 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonErr('Invalid request body.', 400);
  }

  const { messages, mode = 'customer', sessionData } = body;

  // Staff mode requires a valid token — enforce server-side
  if (mode === 'staff') {
    const secret = env.STAFF_TOKEN_SECRET;
    if (!secret) return jsonErr('Staff workspace not configured.', 503);

    const auth = request.headers.get('Authorization') || request.headers.get('X-Staff-Token') || '';
    const tok = auth.replace('Bearer ', '').trim();
    if (!tok) return jsonErr('Staff authentication required.', 401);

    // Verify HMAC token
    const parts = tok.split('.');
    if (parts.length !== 2) return jsonErr('Invalid token.', 401);
    const [payloadB64, sig] = parts;
    try {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
      const sigBuf = Uint8Array.from(atob(sig), c => c.charCodeAt(0));
      const valid = await crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(payloadB64));
      if (!valid) return jsonErr('Invalid token.', 401);
      const payload = JSON.parse(atob(payloadB64));
      if (!payload.role || payload.role !== 'staff') return jsonErr('Insufficient permissions.', 403);
      if (payload.exp < Date.now()) return jsonErr('Session expired. Please sign in again.', 401);
    } catch {
      return jsonErr('Invalid token.', 401);
    }
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonErr('No messages provided.', 400);
  }

  // Validate messages
  const validMessages = messages.filter(
    m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim()
  );
  if (validMessages.length === 0) {
    return jsonErr('No valid messages.', 400);
  }

  const systemPrompt = mode === 'staff' ? STAFF_SYSTEM : CUSTOMER_SYSTEM;

  // Add session context if present
  const systemWithContext = sessionData && Object.keys(sessionData).length > 0
    ? `${systemPrompt}\n\n## Session context already collected\n${JSON.stringify(sessionData, null, 2)}`
    : systemPrompt;

  let anthropicRes;
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemWithContext,
        messages: validMessages,
      }),
    });
  } catch (err) {
    console.error('Anthropic fetch error:', err);
    return jsonErr('Could not reach AI service. Please try again or call 07944 308462.', 502);
  }

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text().catch(() => '');
    console.error('Anthropic error', anthropicRes.status, errText);
    if (anthropicRes.status === 401) return jsonErr('AI service authentication error.', 500);
    if (anthropicRes.status === 429) return jsonErr('AI service is busy. Please try again in a moment.', 429);
    return jsonErr('AI service error. Please call 07944 308462.', 500);
  }

  const data = await anthropicRes.json();
  const rawText = data.content?.[0]?.text || '';

  // Extract intent block if present
  let replyText = rawText;
  let intentData = null;

  const intentMatch = rawText.match(/```intent\s*([\s\S]*?)```/);
  if (intentMatch) {
    try {
      intentData = JSON.parse(intentMatch[1].trim());
    } catch { /* ignore parse errors */ }
    replyText = rawText.replace(/```intent[\s\S]*?```/, '').trim();
  }

  return new Response(JSON.stringify({
    reply: replyText,
    intent: intentData?.type || null,
    structured: intentData?.data || null,
    ready: intentData?.ready || false,
    usage: data.usage || null,
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
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

function jsonErr(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
