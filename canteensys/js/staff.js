// =====================================================
//  staff.js — Dashboard, products, purchase, users, reports
//  Used by index.html (staff dashboard) only
// =====================================================


// ════════════════════════════════════════
//  STAFF NAVIGATION
// ════════════════════════════════════════
const loaders = { dashboard: loadDashboard, products: loadProducts, purchase: loadPurchasePage, users: loadUsers, reports: loadReports };

function nav(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.querySelector(`[data-page="${id}"]`).classList.add('active');
  if (loaders[id]) loaders[id]();
}

// ════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════
async function loadDashboard() {
  document.getElementById('dash-date').textContent = new Date().toLocaleDateString('en-PH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  try {
    const d = await get('dashboard');
    document.getElementById('d-sales').textContent = peso(d.today_sales);
    document.getElementById('d-txns').textContent  = d.today_count;
    document.getElementById('d-prods').textContent = d.product_count;
    document.getElementById('d-users').textContent = d.user_count;
    const low = d.low_stock;
    document.getElementById('d-low').textContent = low;
    document.getElementById('d-low').style.color = low > 0 ? 'var(--accent)' : 'var(--ink)';
    const tbody = document.getElementById('dash-tbody');
    if (!d.recent.length) { tbody.innerHTML = '<tr class="loading-row"><td colspan="6">No transactions yet</td></tr>'; return; }
    tbody.innerHTML = d.recent.map(t => `<tr>
      <td class="mono-id">#${t.transaction_id}</td>
      <td>${esc(t.name)}</td>
      <td>${typeBadge(t.user_type)}</td>
      <td style="font-weight:700;color:var(--accent)">${peso(t.total_amount)}</td>
      <td class="mono-id">${fmtDate(t.transaction_date)}</td>
      <td><span class="badge badge-green">Charged</span></td>
    </tr>`).join('');
    setDbStatus(true);
  } catch(e) { setDbStatus(false); }
}

// ════════════════════════════════════════
//  PRODUCTS
// ════════════════════════════════════════
async function loadProducts() {
  try {
    const d = await get('products');
    products = d.products;
    renderProducts();
    setDbStatus(true);
  } catch(e) { setDbStatus(false); toast('Could not load products.', 'error'); }
}

function renderProducts() {
  const tbody = document.getElementById('prod-tbody');
  if (!products.length) { tbody.innerHTML = '<tr class="loading-row"><td colspan="6">No products found</td></tr>'; return; }
  tbody.innerHTML = products.map(p => `<tr>
    <td class="mono-id">${p.product_id}</td>
    <td><input class="edit-input" data-id="${p.product_id}" data-f="name"  value="${esc(p.name)}"  onblur="saveProductField(this)"></td>
    <td><input class="edit-input" data-id="${p.product_id}" data-f="price" value="${parseFloat(p.price).toFixed(2)}" type="number" step="0.01" onblur="saveProductField(this)" style="max-width:90px"></td>
    <td><input class="edit-input" data-id="${p.product_id}" data-f="stock" value="${p.stock}" type="number" onblur="saveProductField(this)" style="max-width:74px"></td>
    <td>${stockBadge(p.stock)}</td>
    <td><button class="btn btn-sm btn-danger-soft" onclick="deleteProduct(${p.product_id},'${esc(p.name)}')">Delete</button></td>
  </tr>`).join('');
}

async function saveProductField(input) {
  const id = input.dataset.id;
  const p  = products.find(x => x.product_id == id);
  if (!p) return;
  const updated = { ...p };
  if (input.dataset.f === 'name')  updated.name  = input.value.trim() || p.name;
  if (input.dataset.f === 'price') updated.price = parseFloat(input.value) || p.price;
  if (input.dataset.f === 'stock') updated.stock = parseInt(input.value) ?? p.stock;
  const r = await post('product_update', { id: p.product_id, name: updated.name, price: updated.price, stock: updated.stock });
  if (r.ok) { toast('Saved.'); await loadProducts(); }
  else toast(r.error, 'error');
}

async function createProduct() {
  const name  = document.getElementById('np-name').value.trim();
  const price = parseFloat(document.getElementById('np-price').value);
  const stock = parseInt(document.getElementById('np-stock').value) || 0;
  if (!name || isNaN(price)) { toast('Name and price are required.', 'error'); return; }
  const r = await post('product_create', { name, price, stock });
  if (r.ok) { toast('Product created!'); closeModal('modal-add-product'); document.getElementById('np-name').value = ''; await loadProducts(); }
  else toast(r.error, 'error');
}

function deleteProduct(id, name) {
  confirm_('Delete Product', `Delete "${name}"? This cannot be undone.`, async () => {
    const r = await post('product_delete', { id });
    if (r.ok) { toast('Product deleted.'); await loadProducts(); }
    else toast(r.error, 'error');
  }, 'Delete');
}

// ════════════════════════════════════════
//  USERS
// ════════════════════════════════════════
async function loadUsers() {
  try { const d = await get('users'); users = d.users; renderUsers(); }
  catch(e) { toast('Could not load users.', 'error'); }
}

function renderUsers() {
  const tbody = document.getElementById('users-tbody');
  if (!users.length) { tbody.innerHTML = '<tr class="loading-row"><td colspan="4">No users found</td></tr>'; return; }
  tbody.innerHTML = users.map(u => `<tr>
    <td class="mono-id">${u.user_id}</td>
    <td style="font-weight:600">${esc(u.name)}</td>
    <td>${typeBadge(u.user_type)}</td>
    <td style="font-family:var(--mono);font-weight:700;color:${parseFloat(u.balance)>0?'var(--accent)':'var(--green)'}">${peso(u.balance)}</td>
  </tr>`).join('');
}

async function createUser() {
  const name = document.getElementById('nu-name').value.trim();
  const type = document.getElementById('nu-type').value;
  const pass = document.getElementById('nu-pass').value;
  if (!name)           { toast('Name is required.', 'error'); return; }
  if (pass.length < 6) { toast('Password must be at least 6 characters.', 'error'); return; }
  const r = await post('user_create', { name, user_type: type, password: pass });
  if (r.ok) {
    toast('User created!'); closeModal('modal-add-user');
    document.getElementById('nu-name').value = '';
    document.getElementById('nu-pass').value = '';
    await loadUsers();
  } else toast(r.error, 'error');
}

// ════════════════════════════════════════
//  PURCHASE
// ════════════════════════════════════════
let purchaseUsers = []; // separate from global users, stores profile info for purchase page

async function loadPurchasePage() {
  try {
    const [pd, ud] = await Promise.all([get('products'), get('users')]);
    products = pd.products; users = ud.users;
    purchaseUsers = ud.users.filter(u => u.user_type !== 'staff');
    // reset search fields on page load
    document.getElementById('pur-user').value       = '';
    document.getElementById('pur-user-input').value = '';
    document.getElementById('pur-prod').value       = '';
    document.getElementById('pur-prod-input').value = '';
    document.getElementById('user-info-bar').style.display = 'none';
  } catch(e) { toast('Could not load purchase data.', 'error'); }
}

// ── SEARCHABLE USER DROPDOWN ─────────────────────────
let userHighlight = -1;
function openSearchDrop(type) {
  if (type === 'user') filterUserSearch();
  else                 filterProdSearch();
}
function filterUserSearch() {
  const q    = document.getElementById('pur-user-input').value.toLowerCase();
  const drop = document.getElementById('user-search-drop');
  const list = purchaseUsers.filter(u => u.name.toLowerCase().includes(q));
  userHighlight = -1;
  if (!list.length) {
    drop.innerHTML = '<div class="search-empty">No users found</div>';
  } else {
    drop.innerHTML = list.map(u => {
      const badge = u.user_type === 'teacher'
        ? '<span class="opt-badge opt-badge-t">Teacher</span>'
        : '<span class="opt-badge opt-badge-s">Student</span>';
      return `<div class="search-option" data-id="${u.user_id}" onclick="selectUser(${u.user_id},'${esc(u.name)}')">
        <span class="opt-name">${badge}${esc(u.name)}</span>
        <span class="opt-meta">Owes ${peso(u.balance)}</span>
      </div>`;
    }).join('');
  }
  drop.classList.add('open');
}
function selectUser(uid, name) {
  document.getElementById('pur-user').value       = uid;
  document.getElementById('pur-user-input').value = name;
  document.getElementById('user-search-drop').classList.remove('open');
  onUserChange();
}

// ── SEARCHABLE PRODUCT DROPDOWN ──────────────────────
let prodHighlight = -1;
function filterProdSearch() {
  const q    = document.getElementById('pur-prod-input').value.toLowerCase();
  const drop = document.getElementById('prod-search-drop');
  const list = products.filter(p => parseInt(p.stock) > 0 && p.name.toLowerCase().includes(q));
  prodHighlight = -1;
  if (!list.length) {
    drop.innerHTML = '<div class="search-empty">No products found</div>';
  } else {
    drop.innerHTML = list.map(p => {
      const stockColor = parseInt(p.stock) <= 5 ? 'var(--amber)' : 'var(--ink3)';
      return `<div class="search-option" onclick="selectProd(${p.product_id},'${esc(p.name)}')">
        <span class="opt-name">${esc(p.name)}</span>
        <span class="opt-meta" style="color:${stockColor}">${peso(p.price)} &middot; ${p.stock} left</span>
      </div>`;
    }).join('');
  }
  drop.classList.add('open');
}
function selectProd(pid, name) {
  document.getElementById('pur-prod').value       = pid;
  document.getElementById('pur-prod-input').value = name;
  document.getElementById('prod-search-drop').classList.remove('open');
}

// ── KEYBOARD NAVIGATION ──────────────────────────────
function searchKeyNav(e, type) {
  const drop    = document.getElementById(type === 'user' ? 'user-search-drop' : 'prod-search-drop');
  const options = drop.querySelectorAll('.search-option');
  let   hi      = type === 'user' ? userHighlight : prodHighlight;
  if      (e.key === 'ArrowDown')          { hi = Math.min(hi + 1, options.length - 1); }
  else if (e.key === 'ArrowUp')            { hi = Math.max(hi - 1, 0); }
  else if (e.key === 'Enter' && hi >= 0)   { e.preventDefault(); options[hi].click(); return; }
  else if (e.key === 'Escape')             { drop.classList.remove('open'); return; }
  else { return; }
  options.forEach(o => o.classList.remove('highlighted'));
  if (options[hi]) options[hi].classList.add('highlighted');
  if (type === 'user') userHighlight = hi; else prodHighlight = hi;
}

// Close dropdowns when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('#user-search-box')) document.getElementById('user-search-drop').classList.remove('open');
  if (!e.target.closest('#prod-search-box')) document.getElementById('prod-search-drop').classList.remove('open');
});

function onUserChange() {
  const uid  = parseInt(document.getElementById('pur-user').value);
  const user = purchaseUsers.find(u => u.user_id == uid);
  const bar  = document.getElementById('user-info-bar');
  if (!user) { bar.style.display = 'none'; return; }
  bar.style.display = 'block';
  document.getElementById('user-bal-show').textContent = peso(user.balance);
  document.getElementById('user-budget-bar-wrap').style.display = 'none';
}

function addToCart() {
  const pid = parseInt(document.getElementById('pur-prod').value);
  const qty = parseInt(document.getElementById('pur-qty').value) || 1;
  if (!pid) { toast('Select a product first.', 'error'); return; }
  const prod = products.find(p => p.product_id == pid);
  if (!prod) return;
  const existing = cart.find(c => c.product.product_id == pid);
  const newQty   = (existing ? existing.qty : 0) + qty;
  if (newQty > parseInt(prod.stock)) { toast(`Only ${prod.stock} in stock.`, 'error'); return; }
  if (existing) existing.qty = newQty;
  else cart.push({ product: prod, qty });
  // reset product search after adding
  document.getElementById('pur-prod').value       = '';
  document.getElementById('pur-prod-input').value = '';
  document.getElementById('pur-qty').value = 1;
  renderCart();
  toast(`${prod.name} added to cart.`);
}

function removeFromCart(pid) { cart = cart.filter(c => c.product.product_id != pid); renderCart(); }
function changeQty(pid, delta) {
  const item = cart.find(c => c.product.product_id == pid);
  if (!item) return;
  const newQty = item.qty + delta;
  if (newQty <= 0) { removeFromCart(pid); return; }
  if (newQty > parseInt(item.product.stock)) { toast('Not enough stock.', 'error'); return; }
  item.qty = newQty; renderCart();
}
function clearCart() { cart = []; renderCart(); }

function renderCart() {
  const list    = document.getElementById('cart-list');
  const summary = document.getElementById('cart-summary');
  const btn     = document.getElementById('checkout-btn');
  if (!cart.length) { list.innerHTML = '<div class="cart-empty">Cart is empty</div>'; summary.style.display = 'none'; btn.disabled = true; return; }
  list.innerHTML = cart.map(c => `
    <div class="cart-item">
      <div class="ci-name">${esc(c.product.name)}</div>
      <div class="cart-qty">
        <button onclick="changeQty(${c.product.product_id},-1)">−</button>
        <span>${c.qty}</span>
        <button onclick="changeQty(${c.product.product_id},1)">+</button>
      </div>
      <div class="ci-price">${peso(c.product.price * c.qty)}</div>
      <button onclick="removeFromCart(${c.product.product_id})" style="background:transparent;border:none;cursor:pointer;color:var(--ink3);font-size:16px;padding:2px 4px;">×</button>
    </div>`).join('');
  const subtotal = cart.reduce((s,c) => s + c.product.price * c.qty, 0);
  document.getElementById('cs-sub').textContent   = peso(subtotal);
  document.getElementById('cs-total').textContent = peso(subtotal);
  summary.style.display = 'block'; btn.disabled = false;
}

async function checkout() {
  const uid = parseInt(document.getElementById('pur-user').value);
  if (!uid)        { toast('Select a user first.', 'error'); return; }
  if (!cart.length){ toast('Cart is empty.', 'error'); return; }
  const user  = purchaseUsers.find(u => u.user_id == uid);
  const total = cart.reduce((s,c) => s + c.product.price * c.qty, 0);
  const items = cart.map(c => ({ product_id: c.product.product_id, quantity: c.qty }));
  confirm_('Confirm Transaction',
    `Charge ${peso(total)} to ${user?.name || 'this user'}? This will be added to their ${user?.user_type === 'teacher' ? 'salary deduction' : 'tuition'}.`,
    async () => {
      const btn = document.getElementById('checkout-btn');
      btn.innerHTML = '<span class="spinner"></span> Processing…'; btn.disabled = true;
      const r = await post('purchase', { user_id: uid, items: JSON.stringify(items) });
      btn.innerHTML = 'Confirm &amp; Charge Account'; btn.disabled = false;
      if (r.ok) { showReceipt(r, user); await loadPurchasePage(); }
      else toast(r.error, 'error');
    }, 'Charge Account');
}

function showReceipt(r, user) {
  const rows = r.items.map(i => `<div class="r-row"><span>${esc(i.name)} × ${i.qty}</span><span>${peso(i.subtotal)}</span></div>`).join('');
  const note = user?.user_type === 'teacher' ? 'Deducted from salary' : 'Added to tuition';
  document.getElementById('receipt-body').innerHTML = `
    <div class="r-header"><h4>Canteen System</h4><div>Txn #${r.transaction_id} · ${new Date().toLocaleString('en-PH')}</div></div>
    <div class="r-row"><span>Customer</span><span>${esc(user?.name||'—')} (${user?.user_type||''})</span></div>
    ${rows}
    <div class="r-row bold"><span>Total Charged</span><span>${peso(r.total)}</span></div>
    <div class="r-row"><span>Total Balance Owed</span><span>${peso(r.new_balance)}</span></div>
    <div class="r-footer">${note} · Thank you!</div>`;
  closeModal('modal-confirm'); openModal('modal-receipt');
}

// ════════════════════════════════════════
//  REPORTS
// ════════════════════════════════════════
async function loadReports() {
  try {
    const d = await get('reports');
    document.getElementById('r-sales').textContent = peso(d.today_sales);
    document.getElementById('r-count').textContent = d.today_count;
    const tbody = document.getElementById('rep-tbody');
    if (!d.transactions.length) { tbody.innerHTML = '<tr class="loading-row"><td colspan="5">No transactions yet</td></tr>'; return; }
    tbody.innerHTML = d.transactions.map(t => `<tr>
      <td class="mono-id">#${t.transaction_id}</td>
      <td>${esc(t.name)}</td>
      <td>${typeBadge(t.user_type)}</td>
      <td style="font-weight:700">${peso(t.total_amount)}</td>
      <td class="mono-id">${fmtDate(t.transaction_date)}</td>
    </tr>`).join('');
  } catch(e) { toast('Could not load reports.', 'error'); }
}

// ════════════════════════════════════════
//  STUDENT PORTAL
// ════════════════════════════════════════

// ═══════════════════════════════════════
//  BOOT — verify staff session
// ═══════════════════════════════════════
(async () => {
  const r = await get('me');
  if (!r.logged_in || r.user.user_type !== 'staff') {
    window.location.href = 'login.html';
    return;
  }
  currentUser = r.user;
  document.getElementById('sb-username').textContent = currentUser.name + ' · Staff';
  setDbStatus(true);
  nav('dashboard');
})();
