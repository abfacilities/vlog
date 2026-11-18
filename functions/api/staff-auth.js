/**
 * AB Facilities AI — Staff authentication endpoint
 * POST /api/staff-auth
 * Body: { pin: string }
 * Returns: { token: string } (short-lived signed token stored in sessionStorage)
 * Env vars required: STAFF_PIN (the PIN Adam sets), STAFF_TOKEN_SECRET (random 32-char string)
 *
 * Simple PIN auth — not production-grade SSO, but adequate for a single-user internal tool.
 * Upgrade to Cloudflare Access or proper auth when multi-staff access is needed.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const correctPin = env.STAFF_PIN;
  const secret = env.STAFF_TOKEN_SECRET;

  if (!correctPin || !secret) {
    return jsonErr('Staff workspace is not yet configured. Contact the site administrator.', 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonErr('Invalid request.', 400);
  }

  const { pin } = body;
  if (!pin) return jsonErr('PIN required.', 400);

  // Constant-time comparison to avoid timing attacks
  if (!timingSafeEqual(String(pin).trim(), String(correctPin).trim())) {
    // Add a small delay to slow brute-force
    await new Promise(r => setTimeout(r, 800));
    return jsonErr('Incorrect PIN.', 401);
  }

  // Generate a simple token: base64(payload).signature
  const payload = JSON.stringify({ role: 'staff', issued: Date.now(), exp: Date.now() + 8 * 60 * 60 * 1000 }); // 8h
  const payloadB64 = btoa(payload);
  const sig = await hmacSign(payloadB64, secret);
  const token = `${payloadB64}.${sig}`;

  return new Response(JSON.stringify({ token }), {
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

// Also expose a verify endpoint used by the staff workspace to check token on load
export async function onRequestGet(context) {
  const { request, env } = context;
  const secret = env.STAFF_TOKEN_SECRET;
  if (!secret) return jsonErr('Staff workspace is not yet configured.', 503);

  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return jsonErr('No token.', 401);

  const valid = await verifyToken(token, secret);
  if (!valid) return jsonErr('Invalid or expired token.', 401);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function hmacSign(data, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function hmacVerify(data, sig, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const sigBuf = Uint8Array.from(atob(sig), c => c.charCodeAt(0));
  return crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(data));
}

async function verifyToken(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  try {
    const ok = await hmacVerify(payloadB64, sig, secret);
    if (!ok) return false;
    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function jsonErr(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
