const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCE_REGEX = /^[a-zA-Z0-9:_-]+$/;

const MAX_NAME_LENGTH = 100;
const MIN_EMAIL_LENGTH = 3;
const MAX_EMAIL_LENGTH = 254;
const MAX_SOURCE_LENGTH = 100;
const DEFAULT_SOURCE = 'landing_page_free';

export function parseFreeWaitlistRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false };
  }

  const name = normalizeText(payload.name);
  const email = normalizeText(payload.email);
  const source = normalizeSource(payload.source);

  if (!name || name.length > MAX_NAME_LENGTH) {
    return { ok: false };
  }

  if (!email || email.length < MIN_EMAIL_LENGTH || email.length > MAX_EMAIL_LENGTH) {
    return { ok: false };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { ok: false };
  }

  if (!source || source.length > MAX_SOURCE_LENGTH || !SOURCE_REGEX.test(source)) {
    return { ok: false };
  }

  return {
    ok: true,
    value: {
      name,
      email,
      emailNormalized: email.toLowerCase(),
      source,
    },
  };
}

export async function upsertFreeWaitlistEntry({ supabase, entry }) {
  const { error } = await supabase.rpc('upsert_up_free_waitlist_entry', {
    p_email: entry.email,
    p_email_normalized: entry.emailNormalized,
    p_name: entry.name,
    p_source: entry.source,
  });

  if (error) {
    throw error;
  }
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSource(value) {
  const normalized = normalizeText(value);
  return normalized || DEFAULT_SOURCE;
}
