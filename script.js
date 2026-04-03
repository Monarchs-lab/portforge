// PortForge - Minimal Pre-register (Production Ready)

let currentRole = 'both';
const REGISTRATIONS_KEY = 'portforge_registrations';
const MAX_MESSAGE_LENGTH = 500;
const MAX_USERNAME_LENGTH = 20;

document.addEventListener('DOMContentLoaded', init);

function init() {
    setupFAQ();
    setupRoleToggle();
    setupForm();
    console.log('%c PortForge ', 'background: #6C7AFF; color: #0A0A0F; font-size: 20px; font-weight: bold; padding: 8px 16px; border-radius: 8px;');
    console.log('%c Pre-register v4.1 - Ready ', 'color: #00C853;');
}

// Navigation
function showForm() {
    const landing = document.getElementById('landingPage');
    const form = document.getElementById('formPage');
    if (landing && form) {
        landing.classList.add('hidden');
        form.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function showLanding() {
    const landing = document.getElementById('landingPage');
    const form = document.getElementById('formPage');
    if (landing && form) {
        form.classList.add('hidden');
        landing.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// FAQ Toggle
function setupFAQ() {
    const items = document.querySelectorAll('.faq-item');
    items.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                // Close all
                items.forEach(i => i.classList.remove('open'));
                // Open clicked if wasn't open
                if (!isOpen) item.classList.add('open');
            });
        }
    });
}

// Role Toggle
function setupRoleToggle() {
    const buttons = document.querySelectorAll('.role-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentRole = btn.dataset.role || 'both';
        });
    });
}

// Form Handling
function setupForm() {
    const form = document.getElementById('preregisterForm');
    if (!form) return;

    // Real-time validation
    const emailInput = document.getElementById('email');
    const usernameInput = document.getElementById('username');
    const messageInput = document.getElementById('userMessage');

    if (emailInput) {
        emailInput.addEventListener('blur', () => validateEmail(emailInput));
    }
    if (usernameInput) {
        usernameInput.addEventListener('blur', () => validateUsername(usernameInput));
        usernameInput.addEventListener('input', () => sanitizeInput(usernameInput));
    }
    if (messageInput) {
        messageInput.addEventListener('input', () => {
            if (messageInput.value.length > MAX_MESSAGE_LENGTH) {
                messageInput.value = messageInput.value.substring(0, MAX_MESSAGE_LENGTH);
            }
        });
    }

    form.addEventListener('submit', handleSubmit);
}

function validateEmail(input) {
    const email = input.value.trim().toLowerCase();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const errorEl = document.getElementById('emailError');
    
    if (!email) {
        showError('email', 'Email is required');
        return false;
    }
    if (!isValid) {
        showError('email', 'Enter a valid email address');
        return false;
    }
    clearError('email');
    return true;
}

function validateUsername(input) {
    const username = input.value.trim().toLowerCase();
    const errorEl = document.getElementById('usernameError');
    
    if (!username) {
        showError('username', 'Username is required');
        return false;
    }
    if (username.length < 3) {
        showError('username', 'Username must be at least 3 characters');
        return false;
    }
    if (username.length > MAX_USERNAME_LENGTH) {
        showError('username', `Username must be under ${MAX_USERNAME_LENGTH} characters`);
        return false;
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
        showError('username', 'Only letters, numbers, and underscores allowed');
        return false;
    }
    clearError('username');
    return true;
}

function sanitizeInput(input) {
    // Remove special chars that could cause issues
    input.value = input.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

function handleSubmit(e) {
    e.preventDefault();
    clearAllErrors();

    const emailInput = document.getElementById('email');
    const usernameInput = document.getElementById('username');
    const messageInput = document.getElementById('userMessage');

    const email = emailInput.value.trim().toLowerCase();
    const username = usernameInput.value.trim().toLowerCase();
    const message = messageInput ? messageInput.value.trim().substring(0, MAX_MESSAGE_LENGTH) : '';

    // Validate
    let hasError = false;

    if (!validateEmail(emailInput)) hasError = true;
    if (!validateUsername(usernameInput)) hasError = true;

    if (hasError) return;

    // Check duplicates safely
    const existing = getExistingRegistrations();
    const emailTaken = existing.find(r => r.email === email);
    const usernameTaken = existing.find(r => r.username === username);

    if (emailTaken && usernameTaken) {
        showDuplicate('exists');
        return;
    }
    if (emailTaken) {
        showDuplicate('email');
        return;
    }
    if (usernameTaken) {
        showDuplicate('username');
        return;
    }

    // Prepare data
    const data = {
        id: generateId(),
        email: escapeHtml(email),
        username: escapeHtml(username),
        role: currentRole,
        message: escapeHtml(message),
        createdAt: new Date().toISOString(),
        status: 'waitlist',
        userAgent: navigator.userAgent
    };

    // Show loading state
    setLoading(true);

    // Simulate API delay
    setTimeout(() => {
        // Save
        saveRegistration(data);
        // Redirect
        window.location.href = 'success.html';
    }, 1200);
}

// Storage Functions
function getExistingRegistrations() {
    try {
        const data = localStorage.getItem(REGISTRATIONS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Failed to load registrations:', e);
        return [];
    }
}

function saveRegistration(data) {
    try {
        const existing = getExistingRegistrations();
        existing.push(data);
        localStorage.setItem(REGISTRATIONS_KEY, JSON.stringify(existing));
        console.log('Registration saved:', data.id);
    } catch (e) {
        console.error('Failed to save registration:', e);
        alert('Something went wrong. Please try again.');
    }
}

// UI Helpers
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(fieldId, message) {
    const el = document.getElementById(fieldId + 'Error');
    if (el) {
        el.textContent = message;
        el.style.color = '#F25F3A';
    }
    const input = document.getElementById(fieldId);
    if (input) input.style.borderColor = '#F25F3A';
}

function clearError(fieldId) {
    const el = document.getElementById(fieldId + 'Error');
    if (el) {
        el.textContent = '';
        el.style.color = '';
    }
    const input = document.getElementById(fieldId);
    if (input) input.style.borderColor = '';
}

function clearAllErrors() {
    document.querySelectorAll('.error-msg').forEach(el => {
        el.textContent = '';
        el.style.color = '';
    });
    document.querySelectorAll('input').forEach(el => {
        el.style.borderColor = '';
    });
}

function showDuplicate(type) {
    const msg = document.getElementById('duplicateMessage');
    const form = document.getElementById('preregisterForm');
    if (!msg || !form) return;

    const title = msg.querySelector('h3');
    const desc = msg.querySelector('p');
    const icon = msg.querySelector('.duplicate-icon');

    if (!title || !desc || !icon) return;

    // Style based on type
    if (type === 'exists') {
        title.textContent = 'Welcome back';
        desc.textContent = 'This account already exists. Check your email for access details.';
        icon.textContent = '✓';
        msg.style.cssText = 'background: rgba(0,200,83,0.1); border-color: rgba(0,200,83,0.3);';
    } else {
        title.textContent = type === 'email' ? 'Email taken' : 'Username reserved';
        desc.textContent = type === 'email' 
            ? 'This email is already registered with us.' 
            : 'This username is already taken. Try another one.';
        icon.textContent = '⚠';
        msg.style.cssText = 'background: rgba(242,95,58,0.1); border-color: rgba(242,95,58,0.3);';
    }

    form.style.display = 'none';
    msg.classList.remove('hidden');
}

function setLoading(isLoading) {
    const btn = document.getElementById('submitBtn');
    if (!btn) return;
    
    const btnText = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    
    if (btnText) btnText.textContent = isLoading ? 'Securing...' : 'Secure my spot';
    if (loader) loader.classList.toggle('hidden', !isLoading);
    btn.disabled = isLoading;
}

// Expose functions for onclick handlers
window.showForm = showForm;
window.showLanding = showLanding;
