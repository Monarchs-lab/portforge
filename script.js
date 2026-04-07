// PortForge — script.js
// Pre-register page logic

var STORE_KEY  = 'pf_members';
var BASE_COUNT = 127; // Base member count — changes as real people join
var selectedRole = 'both';

document.addEventListener('DOMContentLoaded', function () {
  setupCounter();
  setupFAQ();
  setupRoles();
  setupForm();
});

// ─────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────
function showForm() {
  document.getElementById('landingPage').classList.add('hidden');
  document.getElementById('formPage').classList.remove('hidden');
  window.scrollTo(0, 0);
}

function showLanding() {
  document.getElementById('formPage').classList.add('hidden');
  document.getElementById('landingPage').classList.remove('hidden');
  window.scrollTo(0, 0);
}

// Expose to onclick attributes
window.showForm    = showForm;
window.showLanding = showLanding;

// ─────────────────────────────────────
// COUNTER — animates up to real total
// ─────────────────────────────────────
function setupCounter() {
  var members = loadMembers();
  var total   = BASE_COUNT + members.length;

  var targets = ['countNum', 'proofNum'];

  targets.forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;

    var current = 0;
    var step    = total / 70; // 70 frames
    var timer   = setInterval(function () {
      current += step;
      if (current >= total) {
        current = total;
        clearInterval(timer);
      }
      el.textContent = Math.floor(current).toLocaleString();
    }, 18);
  });
}

// ─────────────────────────────────────
// FAQ ACCORDION
// ─────────────────────────────────────
function setupFAQ() {
  var items = document.querySelectorAll('.faq-item');
  items.forEach(function (item) {
    var btn = item.querySelector('.faq-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      // close all
      items.forEach(function (i) { i.classList.remove('open'); });
      // open this one if it was closed
      if (!isOpen) item.classList.add('open');
    });
  });
}

// ─────────────────────────────────────
// ROLE SELECTOR
// ─────────────────────────────────────
function setupRoles() {
  var btns = document.querySelectorAll('.role-opt');
  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      btns.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedRole = btn.getAttribute('data-role') || 'both';
    });
  });
}

// ─────────────────────────────────────
// FORM
// ─────────────────────────────────────
function setupForm() {
  var form     = document.getElementById('regForm');
  var emailEl  = document.getElementById('emailInput');
  var userEl   = document.getElementById('usernameInput');
  var msgEl    = document.getElementById('msgInput');

  if (!form) return;

  // sanitise username live as user types
  if (userEl) {
    userEl.addEventListener('input', function () {
      var v = userEl.value;
      var clean = v.toLowerCase().replace(/[^a-z0-9_.]/g, '');
      if (v !== clean) userEl.value = clean;
    });
    userEl.addEventListener('blur', function () { validateUsername(); });
  }

  if (emailEl) {
    emailEl.addEventListener('blur', function () { validateEmail(); });
  }

  // cap message at 500 chars
  if (msgEl) {
    msgEl.addEventListener('input', function () {
      if (msgEl.value.length > 500) msgEl.value = msgEl.value.slice(0, 500);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    handleSubmit();
  });
}

function handleSubmit() {
  clearErrors();

  var emailEl = document.getElementById('emailInput');
  var userEl  = document.getElementById('usernameInput');
  var msgEl   = document.getElementById('msgInput');

  var email    = emailEl.value.trim().toLowerCase();
  var username = userEl.value.trim().toLowerCase();
  var message  = msgEl ? msgEl.value.trim().slice(0, 500) : '';

  var ok = true;
  if (!validateEmail())    ok = false;
  if (!validateUsername()) ok = false;
  if (!ok) return;

  var members     = loadMembers();
  var emailTaken  = members.some(function (m) { return m.email    === email;    });
  var userTaken   = members.some(function (m) { return m.username === username; });

  if (emailTaken || userTaken) {
    showAlreadyIn();
    return;
  }

  setLoading(true);

  var entry = {
    id:       uid(),
    email:    email,
    username: username,
    role:     selectedRole,
    message:  safeText(message),
    joinedAt: new Date().toISOString()
  };

  setTimeout(function () {
    saveEntry(entry);
    window.location.href = 'success.html';
  }, 1000);
}

// ─────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────
function validateEmail() {
  var el  = document.getElementById('emailInput');
  var err = document.getElementById('emailErr');
  var v   = el.value.trim().toLowerCase();

  if (!v) {
    setErr(el, err, 'Email is required'); return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
    setErr(el, err, 'Enter a valid email address'); return false;
  }
  clearErr(el, err);
  return true;
}

function validateUsername() {
  var el  = document.getElementById('usernameInput');
  var err = document.getElementById('usernameErr');
  var v   = el.value.trim().toLowerCase();

  if (!v)        { setErr(el, err, 'Username is required'); return false; }
  if (v.length < 3)  { setErr(el, err, 'Must be at least 3 characters'); return false; }
  if (v.length > 20) { setErr(el, err, 'Must be 20 characters or fewer'); return false; }
  if (!/^[a-z0-9_.]+$/.test(v)) {
    setErr(el, err, 'Letters, numbers, underscores and dots only'); return false;
  }
  if (/^[._]|[._]$/.test(v)) {
    setErr(el, err, "Can't start or end with . or _"); return false;
  }
  if (/[._]{2,}/.test(v)) {
    setErr(el, err, 'No consecutive dots or underscores'); return false;
  }

  clearErr(el, err);
  return true;
}

function setErr(inputEl, errEl, msg) {
  if (inputEl) inputEl.classList.add('bad');
  if (errEl)   errEl.textContent = msg;
}

function clearErr(inputEl, errEl) {
  if (inputEl) inputEl.classList.remove('bad');
  if (errEl)   errEl.textContent = '';
}

function clearErrors() {
  document.querySelectorAll('input.bad').forEach(function (el) { el.classList.remove('bad'); });
  document.querySelectorAll('.field-err').forEach(function (el) { el.textContent = ''; });
}

// ─────────────────────────────────────
// ALREADY-IN MESSAGE
// ─────────────────────────────────────
function showAlreadyIn() {
  var box  = document.getElementById('alreadyMsg');
  var form = document.getElementById('regForm');
  if (box)  box.classList.remove('hidden');
  if (form) form.style.display = 'none';
  window.scrollTo(0, 0);
}

// ─────────────────────────────────────
// LOADING STATE
// ─────────────────────────────────────
function setLoading(on) {
  var btn     = document.getElementById('submitBtn');
  var label   = document.getElementById('btnLabel');
  var spinner = document.getElementById('btnSpinner');

  if (!btn) return;
  btn.disabled = on;
  if (label)   label.textContent = on ? 'Securing your spot…' : 'Lock in my spot';
  if (spinner) spinner.classList.toggle('hidden', !on);
}

// ─────────────────────────────────────
// LOCAL STORAGE
// ─────────────────────────────────────
function loadMembers() {
  try {
    var d = localStorage.getItem(STORE_KEY);
    return d ? JSON.parse(d) : [];
  } catch (e) { return []; }
}

function saveEntry(entry) {
  try {
    var members = loadMembers();
    members.push(entry);
    localStorage.setItem(STORE_KEY, JSON.stringify(members));
  } catch (e) {
    console.error('PortForge: save failed', e);
  }
}

// ─────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function safeText(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
