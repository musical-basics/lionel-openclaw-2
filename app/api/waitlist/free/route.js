import { NextResponse } from 'next/server';

import { getSupabaseAdminClient } from '../../../../lib/supabase/admin';
import {
  parseFreeWaitlistRequest,
  upsertFreeWaitlistEntry,
} from '../../../../lib/ultimate-pianist/free-waitlist';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const rateLimitStore =
  globalThis.__upFreeWaitlistRateLimitStore ??
  (globalThis.__upFreeWaitlistRateLimitStore = new Map());

export async function POST(request) {
  const clientIp = getClientIp(request) ?? 'ip_unavailable';

  if (!allowRequestForIp(clientIp)) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429 },
    );
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_input' },
      { status: 400 },
    );
  }

  const parsedRequest = parseFreeWaitlistRequest(payload);

  if (!parsedRequest.ok) {
    return NextResponse.json(
      { ok: false, error: 'invalid_input' },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();

    await upsertFreeWaitlistEntry({
      supabase,
      entry: parsedRequest.value,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Free waitlist signup failed.', error);

    return NextResponse.json(
      { ok: false, error: 'server_error' },
      { status: 500 },
    );
  }
}

function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    const [firstForwardedIp] = forwardedFor.split(',');
    if (firstForwardedIp?.trim()) {
      return firstForwardedIp.trim();
    }
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp?.trim()) {
    return realIp.trim();
  }

  const connectingIp = request.headers.get('cf-connecting-ip');
  if (connectingIp?.trim()) {
    return connectingIp.trim();
  }

  return null;
}

function allowRequestForIp(ipAddress, now = Date.now()) {
  pruneExpiredRateLimitEntries(now);

  const existingWindow = rateLimitStore.get(ipAddress);

  if (!existingWindow || existingWindow.expiresAt <= now) {
    rateLimitStore.set(ipAddress, {
      count: 1,
      expiresAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (existingWindow.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  existingWindow.count += 1;
  return true;
}

function pruneExpiredRateLimitEntries(now) {
  for (const [ipAddress, entry] of rateLimitStore.entries()) {
    if (entry.expiresAt <= now) {
      rateLimitStore.delete(ipAddress);
    }
  }
}
