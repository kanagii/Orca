// =====================================================
//  shared.js — API helpers, toast, modals, utils
//  Included by all pages
// =====================================================

const API = 'api.php';

// ── state ──────────────────────────────────────────
let products = [], users = [], cart = [];
let currentUser = null;
let currentPortal = null; // 'staff' | 'student' | 'teacher'

// ── api helpers ────────────────────────────────────
async function get(action) {
  const r = await fetch(`${API}?action=${action}`);
  return r.json();
}
async function post(action, data = {}) {
  const fd = new FormData();
  fd.append('action', action);
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  const r = await fetch(API, { method: 'POST', body: fd });
  return r.json();
}

// ── toast ──────────────────────────────────────────
let _tt;
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = type; t.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => t.classList.remove('show'), 3500);
}

// ── modals ─────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function confirm_(title, body, cb, label = 'Confirm') {
  document.getElementById('mc-title').textContent = title;
  document.getElementById('mc-body').textContent  = body;
  document.getElementById('mc-ok').textContent    = label;
  document.getElementById('mc-ok').onclick = () => { closeModal('modal-confirm'); cb(); };
  openModal('modal-confirm');
}

// ── utils ──────────────────────────────────────────
const peso = n => '₱' + parseFloat(n || 0).toFixed(2);
const esc  = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function fmtDate(s) { return new Date(s).toLocaleString('en-PH', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }); }
function stockBadge(s) {
  s = parseInt(s);
  if (s <= 0) return `<span class="badge badge-red">Out of stock</span>`;
  if (s <= 5) return `<span class="badge badge-amber">Low · ${s}</span>`;
  return `<span class="badge badge-green">In stock · ${s}</span>`;
}
function typeBadge(type) {
  if (type === 'teacher') return `<span class="badge badge-blue">teacher</span>`;
  if (type === 'staff')   return `<span class="badge badge-purple">staff</span>`;
  return `<span class="badge badge-green">student</span>`;
}
function setDbStatus(ok) {
  const el = document.getElementById('db-status');
  if (!el) return;
  el.textContent = ok ? 'Connected' : 'Offline';
  el.style.color  = ok ? 'rgba(151,196,89,0.8)' : 'rgba(240,149,149,0.8)';
}

// ════════════════════════════════════════

// ── logout (usable from any page) ──────────────────
async function doLogout() {
  await post('logout');
  window.location.href = 'login.html';
}
