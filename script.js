/**
 * PortForge — script.js  (production-final)
 *
 * SETUP — fill in your two Supabase values below, then deploy.
 * Get them from: Supabase Dashboard → Project → Settings → API
 *
 * SUPABASE CHECKLIST (do this once in your dashboard):
 *  1. Enable RLS on the "users" table
 *  2. Add INSERT policy:  target=anon, check=true
 *  3. Do NOT add a SELECT policy (keeps data private)
 *  4. Create this RPC function for the counter (paste into SQL Editor):
 *
 *     create or replace function get_user_count()
 *     returns integer
 *     language sql
 *     security definer
 *     as $$
 *       select count(*)::integer from users;
 *     $$;
 *
 *  5. Grant execute to anon:
 *     grant execute on function get_user_count() to anon;
 */

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';  // ← fill in
const SUPABASE_KEY = 'YOUR_PUBLIC_ANON_KEY';                  // ← fill in

/** Displayed count = BASE_COUNT + real DB rows.
 *  Update this number whenever you want to bump the baseline display. */
const BASE_COUNT = 127;
// ────────────────────────────────────────────────────────────────────────────

/** Valid role values — must match your DB check constraint */
const VALID_ROLES = ['editor', 'client', 'both'];

let db           = null;
let selectedRole = 'both';
let isSubmitting = false;   // prevent double-submit

// ─── INIT ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  initCounter();
  initFAQ();
  initRoles();
  initForm();
});

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
function showForm() {
  document.getElementById('landingPage').classList.add('hidden');
  document.getElementById('formPage').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function showLanding() {
  document.getElementById('formPage').classList.add('hidden');
  document.getElementById('landingPage').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// Expose to inline onclick handlers
window.showForm    = showForm;
window.showLanding = showLanding;

// ─── COUNTER ─────────────────────────────────────────────────────────────────
/**
 * Calls the RPC function instead of SELECT *
 * → no SELECT policy needed → no data leak possible
 */
async function initCounter() {
  let total = BASE_COUNT;

  try {
    const { data, error } = await db.rpc('get_user_count');
    if (!error && typeof data === 'number') {
      total = BASE_COUNT + data;
    }
  } catch (e) {
    // Silently fall back to BASE_COUNT — counter is cosmetic
    console.warn('[PortForge] Counter RPC failed, using base count.', e);
  }

  animateCount(total);
}

function animateCount(target) {
  if (target === 0) {
    ['countNum', 'proofNum'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
    return;
  }

  ['countNum', 'proofNum'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    let current = 0;
    // Use requestAnimationFrame for smooth, performant animation
    const duration = 1200; // ms
    const startTime = performance.now();

    function tick(now) {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      current = Math.floor(eased * target);
      el.textContent = current.toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString();
    }

    requestAnimationFrame(tick);
  });
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
function initFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // close all
      document.querySelectorAll('.faq-item.open').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-btn')?.setAttribute('aria-expanded', 'false');
      });
      // toggle clicked
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

// ─── ROLE SELECTOR ───────────────────────────────────────────────────────────
function initRoles() {
  document.querySelectorAll('.role-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.role-opt').forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
      selectedRole = btn.dataset.role || 'both';
    });
  });
}

// ─── FORM ────────────────────────────────────────────────────────────────────
function initForm() {
  const form      = document.getElementById('regForm');
  const emailEl   = document.getElementById('emailInput');
  const userEl    = document.getElementById('usernameInput');
  const msgEl     = document.getElementById('msgInput');

  if (!form) return;

  // Validate on blur (not on every keystroke — no cursor jumping)
  emailEl?.addEventListener('blur',  () => validateEmail(emailEl));
  userEl?.addEventListener('blur',   () => validateUsername(userEl));

  // Clear field error as soon as user starts correcting it
  emailEl?.addEventListener('input', () => clearFieldErr(emailEl, 'emailErr'));
  userEl?.addEventListener('input',  () => clearFieldErr(userEl, 'usernameErr'));

  // Hard cap message
  msgEl?.addEventListener('input', () => {
    if (msgEl.value.length > 500) msgEl.value = msgEl.value.slice(0, 500);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    handleSubmit();
  });
}

// ─── SUBMIT ──────────────────────────────────────────────────────────────────
async function handleSubmit() {
  if (isSubmitting) return;   // hard guard against double-submit

  clearAllErrors();

  const emailEl = document.getElementById('emailInput');
  const userEl  = document.getElementById('usernameInput');
  const msgEl   = document.getElementById('msgInput');
  const hpEl    = document.getElementById('hpField');

  // Honeypot check — bots fill this, real users don't
  if (hpEl && hpEl.value.trim() !== '') {
    // Silently pretend success to confuse bots
    console.warn('[PortForge] Honeypot triggered.');
    window.location.href = 'success.html';
    return;
  }

  const email    = (emailEl?.value  || '').trim().toLowerCase();
  const username = (userEl?.value   || '').trim().toLowerCase();
  const message  = (msgEl?.value    || '').trim().slice(0, 500);

  // Client-side validation
  let valid = true;
  if (!validateEmail(emailEl))    valid = false;
  if (!validateUsername(userEl))  valid = false;

  // Role guard
  if (!VALID_ROLES.includes(selectedRole)) {
    selectedRole = 'both';
  }

  if (!valid) return;

  isSubmitting = true;
  setLoading(true);

  try {
    const { error } = await db
      .from('users')
      .insert({
        email,
        username,
        role:    selectedRole,
        message: message || null,   // store NULL not empty string
      });

    if (error) {
      handleDBError(error);
      return;
    }

    // ✅ Success
    window.location.href = 'success.html';

  } catch (e) {
    // Network failure / Supabase unreachable
    showStatus({
      type:    'error',
      icon:    '⚠️',
      heading: 'Connection failed.',
      body:    'Check your internet connection and try again.',
    });
    console.error('[PortForge] Unexpected error:', e);
  } finally {
    isSubmitting = false;
    setLoading(false);
  }
}

// ─── DB ERROR HANDLER ────────────────────────────────────────────────────────
/**
 * Supabase Postgres error codes:
 *   23505 = unique_violation  (duplicate email or username)
 *   23514 = check_violation   (role not in allowed values)
 */
function handleDBError(error) {
  const code = error.code || '';
  const msg  = (error.message || '').toLowerCase();

  if (code === '23505') {
    if (msg.includes('username')) {
      // Username taken — keep form visible, show inline error only
      const el  = document.getElementById('usernameInput');
      const err = document.getElementById('usernameErr');
      markBad(el, err, 'That username is already taken — try another.');
      el?.focus();
    } else {
      // Email taken — friendly panel, hide form
      showStatus({
        type:    'already-in',
        icon:    '🔥',
        heading: 'You\'re already forged in.',
        body:    'That email is already registered. Your spot is secured — we\'ll reach out when access opens.',
      });
      hideForm();
    }
    return;
  }

  if (code === '23514') {
    showStatus({
      type:    'error',
      icon:    '⚠️',
      heading: 'Something looks off.',
      body:    'Please refresh the page and try again.',
    });
    return;
  }

  // Catch-all
  showStatus({
    type:    'error',
    icon:    '⚠️',
    heading: 'Something went wrong.',
    body:    'Our servers hit a snag. Give it a moment and try again.',
  });
  console.error('[PortForge] DB error:', error);
}

// ─── STATUS PANEL ────────────────────────────────────────────────────────────
/**
 * @param {{ type: 'already-in'|'error', icon: string, heading: string, body: string }} opts
 */
function showStatus({ type, icon, heading, body }) {
  const panel = document.getElementById('statusPanel');
  if (!panel) return;

  panel.querySelector('#statusIcon').textContent    = icon;
  panel.querySelector('#statusHeading').textContent = heading;
  panel.querySelector('#statusBody').textContent    = body;

  panel.classList.remove('hidden', 'is-error');
  if (type === 'error') panel.classList.add('is-error');

  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideForm() {
  const form = document.getElementById('regForm');
  if (form) form.style.display = 'none';
}

// ─── VALIDATION ──────────────────────────────────────────────────────────────
function validateEmail(el) {
  const v   = (el?.value || '').trim().toLowerCase();
  const err = document.getElementById('emailErr');

  if (!v)                                      return markBad(el, err, 'Email is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return markBad(el, err, 'Enter a valid email address.');

  markGood(el, err);
  return true;
}

function validateUsername(el) {
  const v   = (el?.value || '').trim().toLowerCase();
  const err = document.getElementById('usernameErr');

  if (!v)            return markBad(el, err, 'Username is required.');
  if (v.length < 3)  return markBad(el, err, 'Must be at least 3 characters.');
  if (v.length > 20) return markBad(el, err, 'Must be 20 characters or fewer.');
  if (!/^[a-z0-9_.]+$/.test(v))     return markBad(el, err, 'Letters, numbers, underscores, and dots only.');
  if (/^[._]/.test(v) || /[._]$/.test(v)) return markBad(el, err, "Can't start or end with . or _");
  if (/[._]{2,}/.test(v))           return markBad(el, err, 'No consecutive dots or underscores.');

  markGood(el, err);
  return true;
}

// ─── FIELD STATE HELPERS ─────────────────────────────────────────────────────
function markBad(inputEl, errEl, msg) {
  inputEl?.classList.add('bad');
  if (errEl) errEl.textContent = msg;
  return false;
}

function markGood(inputEl, errEl) {
  inputEl?.classList.remove('bad');
  if (errEl) errEl.textContent = '';
}

function clearFieldErr(inputEl, errId) {
  inputEl?.classList.remove('bad');
  const err = document.getElementById(errId);
  if (err) err.textContent = '';
}

function clearAllErrors() {
  document.querySelectorAll('input.bad').forEach(el => el.classList.remove('bad'));
  document.querySelectorAll('.field-err').forEach(el => { el.textContent = ''; });
}

// ─── LOADING STATE ────────────────────────────────────────────────────────────
function setLoading(on) {
  const btn     = document.getElementById('submitBtn');
  const label   = document.getElementById('btnLabel');
  const spinner = document.getElementById('btnSpinner');

  if (!btn) return;
  btn.disabled = on;
  if (label)   label.textContent = on ? 'Securing your spot…' : 'Lock in my spot';
  if (spinner) spinner.classList.toggle('hidden', !on);
}
