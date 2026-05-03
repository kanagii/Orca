// =====================================================
//  student.js — Student portal logic
//  Used by student.html only
// =====================================================

// ════════════════════════════════════════
async function loadStudentPortal() {
  document.getElementById('st-topbar-name').textContent = currentUser.name;
  document.getElementById('st-hero-name').textContent   = 'Hello, ' + currentUser.name + '!';
  try {
    const d = await get('my_profile');
    const user    = d.user;
    const spent   = d.spent_30days;
    const budget  = d.budget;
    const recent  = d.recent;

    document.getElementById('st-hero-balance').textContent  = peso(user.balance);
    document.getElementById('st-spent').textContent         = peso(spent);

    if (budget && budget > 0) {
      document.getElementById('st-budget-display').textContent = peso(budget);
      const pct = Math.min((spent / budget) * 100, 100);
      const rem = Math.max(budget - spent, 0);
      document.getElementById('st-budget-rem').textContent = peso(rem);
      document.getElementById('budget-input').value = budget;

      const bar = document.getElementById('st-budget-bar');
      bar.style.width = pct + '%';
      bar.className   = 'budget-bar' + (pct >= 100 ? ' danger' : pct >= 75 ? ' warn' : '');

      document.getElementById('st-budget-text').textContent =
        `You've spent ${peso(spent)} of your ${peso(budget)} monthly limit (${pct.toFixed(0)}%).`;
    } else {
      document.getElementById('st-budget-display').textContent = 'No limit';
      document.getElementById('st-budget-rem').textContent = '—';
      document.getElementById('st-budget-bar').style.width = '0%';
      document.getElementById('st-budget-text').textContent = 'No budget limit set. Set one to track your canteen spending.';
    }

    // Render recent transactions
    const list = document.getElementById('st-txn-list');
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

async function saveBudget(remove = false) {
  const amount = remove ? 0 : parseFloat(document.getElementById('budget-input').value) || 0;
  const r = await post('set_budget', { amount });
  if (r.ok) {
    toast(remove ? 'Budget limit removed.' : `Budget set to ${peso(amount)}.`);
    await loadStudentPortal();
  } else toast(r.error, 'error');
}

// ════════════════════════════════════════
//  TEACHER PORTAL

// ═══════════════════════════════════════
//  BOOT — verify student session
// ═══════════════════════════════════════
(async () => {
  const r = await get('me');
  if (!r.logged_in || r.user.user_type !== 'student') {
    window.location.href = 'login.html';
    return;
  }
  currentUser = r.user;
  loadStudentPortal();
})();
