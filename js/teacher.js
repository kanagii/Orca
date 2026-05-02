// =====================================================
//  teacher.js — Teacher portal logic
//  Used by teacher.html only
// =====================================================

//  TEACHER PORTAL
// ════════════════════════════════════════
async function loadTeacherPortal() {
  document.getElementById('tc-topbar-name').textContent = currentUser.name;
  document.getElementById('tc-hero-name').textContent   = 'Hello, ' + currentUser.name + '!';
  try {
    const d = await get('my_profile');
    const user   = d.user;
    const spent  = d.spent_30days;
    const recent = d.recent;

    document.getElementById('tc-hero-balance').textContent = peso(user.balance);
    document.getElementById('tc-spent').textContent        = peso(spent);
    document.getElementById('tc-balance').textContent      = peso(user.balance);

    const list = document.getElementById('tc-txn-list');
    if (!recent.length) {
      list.innerHTML = '<div style="text-align:center;padding:24px;font-family:var(--mono);font-size:12px;color:var(--ink3)">No transactions yet</div>';
    } else {
      list.innerHTML = recent.map(t => `
        <div class="txn-item">
          <div class="txn-item-left">
            <div class="txn-item-items">${esc(t.items || '—')}</div>
            <div class="txn-item-date">${fmtDate(t.transaction_date)} · #${t.transaction_id}</div>
          </div>
          <div class="txn-item-amount">${peso(t.total_amount)}</div>
        </div>`).join('');
    }
  } catch(e) { toast('Could not load profile data.', 'error'); }
}

// ════════════════════════════════════════
//  BOOT — check existing session

// ═══════════════════════════════════════
//  BOOT — verify teacher session
// ═══════════════════════════════════════
(async () => {
  const r = await get('me');
  if (!r.logged_in || r.user.user_type !== 'teacher') {
    window.location.href = 'login.html';
    return;
  }
  currentUser = r.user;
  loadTeacherPortal();
})();
