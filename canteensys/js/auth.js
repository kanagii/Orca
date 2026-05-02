// =====================================================
//  auth.js — Portal chooser, login, register, logout
//  Used by login.html only
// =====================================================

//  PORTAL CHOOSER
// ════════════════════════════════════════
function choosePortal(type) {
  currentPortal = type;
  document.getElementById('portal-chooser').style.display = 'none';

  const tag   = document.getElementById('auth-portal-tag');
  const title = document.getElementById('auth-portal-title');
  const tabs  = document.getElementById('auth-tabs');

  tag.className = 'portal-tag ' + type;

  if (type === 'staff') {
    tag.textContent   = 'Staff';
    title.textContent = 'Staff Portal';
    tabs.classList.add('staff-only');
    // Force login tab only
    switchTab('login');
  } else if (type === 'student') {
    tag.textContent   = 'Student';
    title.textContent = 'Student Portal';
    tabs.classList.remove('staff-only');
  } else {
    tag.textContent   = 'Teacher';
    title.textContent = 'Teacher Portal';
    tabs.classList.remove('staff-only');
  }

  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('l-name').value = '';
  document.getElementById('l-pass').value = '';
  switchTab('login');
}

function goBackToChooser() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('portal-chooser').style.display = 'flex';
  currentPortal = null;
}

// ════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  const tabs = document.querySelectorAll('.auth-tab');
  if (tab === 'login') tabs[0].classList.add('active');
  else tabs[1].classList.add('active');
  document.getElementById(`form-${tab}`).classList.add('active');
  document.getElementById('login-error').classList.remove('show');
  document.getElementById('register-error').classList.remove('show');
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
}

async function doLogin(e) {
  e.preventDefault();
  const btn  = document.getElementById('login-btn');
  const name = document.getElementById('l-name').value.trim();
  const pass = document.getElementById('l-pass').value;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Signing in…';
  document.getElementById('login-error').classList.remove('show');

  const r = await post('login', { name, password: pass });
  btn.disabled = false; btn.textContent = 'Sign In';

  if (!r.ok) { showAuthError('login-error', r.error); return; }

  // Validate that user is logging into correct portal
  if (currentPortal === 'staff' && r.user_type !== 'staff') {
    showAuthError('login-error', 'This account does not have staff access. Please use the correct portal.');
    await post('logout');
    return;
  }
  if (currentPortal === 'student' && r.user_type !== 'student') {
    showAuthError('login-error', 'This is not a student account. Please use the correct portal.');
    await post('logout');
    return;
  }
  if (currentPortal === 'teacher' && r.user_type !== 'teacher') {
    showAuthError('login-error', 'This is not a teacher account. Please use the correct portal.');
    await post('logout');
    return;
  }

  currentUser = r;
  enterApp();
}

async function doRegister(e) {
  e.preventDefault();
  const btn   = document.getElementById('register-btn');
  const name  = document.getElementById('r-name').value.trim();
  const pass  = document.getElementById('r-pass').value;
  const pass2 = document.getElementById('r-pass2').value;

  document.getElementById('register-error').classList.remove('show');
  if (pass !== pass2) { showAuthError('register-error', 'Passwords do not match.'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating…';

  const user_type = currentPortal; // 'student' or 'teacher'
  const r = await post('register', { name, user_type, password: pass });
  btn.disabled = false; btn.textContent = 'Create Account';

  if (r.ok) { currentUser = r; enterApp(); }
  else showAuthError('register-error', r.error);
}

async function doLogout() {
  await post('logout');
  window.location.href = 'login.html';
}

function enterApp() {
  const type = currentUser.user_type;
  if (type === 'staff')   { window.location.href = 'index.html';   }
  else if (type === 'student') { window.location.href = 'student.html'; }
  else if (type === 'teacher') { window.location.href = 'teacher.html'; }
}


//  BOOT — check existing session
// ════════════════════════════════════════
(async () => {
  const r = await get('me');
  if (r.logged_in) {
    currentUser   = r.user;
    currentPortal = r.user.user_type;
    enterApp(); // redirect to the correct page
  }
  // else stay on login.html portal chooser
})();
