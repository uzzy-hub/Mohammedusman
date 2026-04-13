/**
 * app.js — Society Finance Management System
 * All UI logic, CRUD operations, and page rendering
 */

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await openDB();
  await seedIfEmpty();

  setTodayDate();
  setDefaultDates();
  initNav();
  initMenuToggle();
  await loadDashboard();
});

function setTodayDate() {
  const el = document.getElementById('todayDate');
  if (el) el.textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
}

function setDefaultDates() {
  const today = new Date().toISOString().slice(0, 10);
  ['p_date','ex_date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = today;
  });
}

// ── NAVIGATION ───────────────────────────────────────────────────────────────
const pageTitles = {
  dashboard: 'Dashboard',
  members:   'Members Management',
  feetypes:  'Fee Types',
  payments:  'Payments',
  expenses:  'Expenses',
  reports:   'Reports',
};

function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      switchPage(page);
    });
  });
}

async function switchPage(page) {
  // Nav active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

  // Page visibility
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  // Update title
  document.getElementById('pageTitle').textContent = pageTitles[page] || page;

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');

  // Refresh page data
  const loaders = {
    dashboard: loadDashboard,
    members:   loadMembers,
    feetypes:  loadFeeTypes,
    payments:  async () => { await populatePaymentSelects(); loadPayments(); },
    expenses:  loadExpenses,
    reports:   () => {},
  };
  if (loaders[page]) await loaders[page]();
}

function initMenuToggle() {
  const btn = document.getElementById('menuToggle');
  const sb  = document.getElementById('sidebar');
  btn?.addEventListener('click', () => sb.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    if (!sb.contains(e.target) && !btn.contains(e.target)) {
      sb.classList.remove('open');
    }
  });
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
let _toastTimer = null;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = (type === 'success' ? '✓  ' : type === 'error' ? '✗  ' : '⚠  ') + msg;
  el.className = `toast show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function fmt(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function modeBadge(mode) {
  const map = { Cash: 'mode-cash', Online: 'mode-online', Cheque: 'mode-cheque', UPI: 'mode-upi' };
  const cls = map[mode] || 'badge-info';
  return `<span class="badge ${cls}">${mode}</span>`;
}

function emptyRow(colspan, msg = 'No records found') {
  return `<tr class="empty-row"><td colspan="${colspan}">${msg}</td></tr>`;
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  const members  = await dbGetMembers();
  const payments = await dbGetPayments();
  const expenses = await dbGetExpenses();

  const activeMembers = members.filter(m => m.is_active).length;
  const totalIncome   = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExpense  = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const balance       = totalIncome - totalExpense;

  const statGrid = document.getElementById('statGrid');
  statGrid.innerHTML = '';

  const stats = [
    { icon: '👥', label: 'Active Members',  value: String(activeMembers),   color: '#1A237E', bg: '#E8EAF6' },
    { icon: '💰', label: 'Total Income',    value: fmt(totalIncome),         color: '#00C48C', bg: '#DCFCE7' },
    { icon: '🧾', label: 'Total Expenses',  value: fmt(totalExpense),        color: '#E74C3C', bg: '#FEE2E2' },
    { icon: '📊', label: 'Net Balance',     value: fmt(balance),             color: balance >= 0 ? '#00C48C' : '#E74C3C', bg: balance >= 0 ? '#DCFCE7' : '#FEE2E2' },
  ];

  stats.forEach(s => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.style.setProperty('--stat-color', s.color);
    card.style.setProperty('--stat-bg', s.bg);
    card.innerHTML = `
      <div class="stat-icon">${s.icon}</div>
      <div class="stat-info">
        <div class="stat-value">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    `;
    statGrid.appendChild(card);
  });

  // Recent payments (join-like)
  const memberMap  = Object.fromEntries(members.map(m => [m.member_id, m]));
  const feeTypes   = await dbGetFeeTypes();
  const feeMap     = Object.fromEntries(feeTypes.map(f => [f.fee_type_id, f]));

  const recentPay  = [...payments].sort((a, b) => b.payment_id - a.payment_id).slice(0, 20);
  const tbody = document.querySelector('#dashPayTable tbody');
  tbody.innerHTML = recentPay.length ? recentPay.map(p => {
    const m = memberMap[p.member_id] || {};
    const f = feeMap[p.fee_type_id] || {};
    return `<tr>
      <td>${p.pay_date}</td>
      <td>${m.name || '—'}</td>
      <td><strong>${m.flat_no || '—'}</strong></td>
      <td>${f.type_name || '—'}</td>
      <td>${fmt(p.amount)}</td>
      <td>${modeBadge(p.mode)}</td>
    </tr>`;
  }).join('') : emptyRow(6, 'No payments recorded yet');
}

// ── MEMBERS ──────────────────────────────────────────────────────────────────
async function loadMembers() {
  const q    = document.getElementById('m_search')?.value.toLowerCase() || '';
  const rows = await dbGetMembers();
  const filtered = rows.filter(r =>
    r.name?.toLowerCase().includes(q) || r.flat_no?.toLowerCase().includes(q)
  ).sort((a, b) => (a.flat_no || '').localeCompare(b.flat_no || ''));

  const tbody = document.querySelector('#membersTable tbody');
  tbody.innerHTML = filtered.length ? filtered.map(r => `
    <tr data-id="${r.member_id}" onclick="selectMember(${r.member_id})">
      <td>${r.member_id}</td>
      <td>${r.name}</td>
      <td><strong>${r.flat_no}</strong></td>
      <td>${r.phone || '—'}</td>
      <td>${r.email || '—'}</td>
      <td><span class="badge ${r.is_active ? 'badge-success' : 'badge-danger'}">${r.is_active ? 'Yes' : 'No'}</span></td>
    </tr>`).join('') : emptyRow(6);
}

async function selectMember(id) {
  highlightRow('membersTable', id);
  const r = (await dbGetMembers()).find(m => m.member_id === id);
  if (!r) return;
  document.getElementById('m_id').value    = r.member_id;
  document.getElementById('m_name').value  = r.name;
  document.getElementById('m_flat').value  = r.flat_no;
  document.getElementById('m_phone').value = r.phone || '';
  document.getElementById('m_email').value = r.email || '';
}

async function saveMember() {
  const name  = document.getElementById('m_name').value.trim();
  const flat  = document.getElementById('m_flat').value.trim();
  const phone = document.getElementById('m_phone').value.trim();
  const email = document.getElementById('m_email').value.trim();
  const id    = parseInt(document.getElementById('m_id').value) || null;

  if (!name || !flat) { showToast('Name and Flat No. are required', 'warn'); return; }

  const record = { name, flat_no: flat, phone, email, is_active: 1, join_date: new Date().toISOString().slice(0,10) };
  if (id) record.member_id = id;

  try {
    await dbSaveMember(record);
    showToast(id ? 'Member updated!' : 'Member added!');
    clearMember();
    loadMembers();
  } catch(e) {
    showToast('Flat No. already exists!', 'error');
  }
}

async function deleteMember() {
  const id = parseInt(document.getElementById('m_id').value);
  if (!id) { showToast('Select a member first', 'warn'); return; }
  if (!confirm('Delete this member? All related payments will be removed.')) return;
  await dbDeleteMember(id);
  showToast('Member deleted', 'error');
  clearMember();
  loadMembers();
}

function clearMember() {
  ['m_id','m_name','m_flat','m_phone','m_email'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.querySelectorAll('#membersTable tr').forEach(r => r.classList.remove('selected'));
}

// ── FEE TYPES ────────────────────────────────────────────────────────────────
async function loadFeeTypes() {
  const rows = await dbGetFeeTypes();
  const sorted = [...rows].sort((a, b) => (a.type_name||'').localeCompare(b.type_name||''));
  const tbody = document.querySelector('#feeTypesTable tbody');
  tbody.innerHTML = sorted.length ? sorted.map(r => `
    <tr onclick="selectFeeType(${r.fee_type_id})">
      <td>${r.fee_type_id}</td>
      <td>${r.type_name}</td>
      <td>${fmt(r.amount)}</td>
      <td><span class="badge badge-info">${r.frequency}</span></td>
    </tr>`).join('') : emptyRow(4);
}

async function selectFeeType(id) {
  highlightRow('feeTypesTable', id);
  const r = (await dbGetFeeTypes()).find(f => f.fee_type_id === id);
  if (!r) return;
  document.getElementById('ft_id').value     = r.fee_type_id;
  document.getElementById('ft_name').value   = r.type_name;
  document.getElementById('ft_amount').value = r.amount;
  document.getElementById('ft_freq').value   = r.frequency;
}

async function saveFeeType() {
  const name   = document.getElementById('ft_name').value.trim();
  const amount = parseFloat(document.getElementById('ft_amount').value);
  const freq   = document.getElementById('ft_freq').value;
  const id     = parseInt(document.getElementById('ft_id').value) || null;

  if (!name) { showToast('Type name required', 'warn'); return; }
  if (isNaN(amount)) { showToast('Amount must be a number', 'warn'); return; }

  const record = { type_name: name, amount, frequency: freq };
  if (id) record.fee_type_id = id;

  try {
    await dbSaveFeeType(record);
    showToast(id ? 'Fee type updated!' : 'Fee type added!');
    clearFeeType();
    loadFeeTypes();
  } catch(e) {
    showToast('Type name already exists!', 'error');
  }
}

async function deleteFeeType() {
  const id = parseInt(document.getElementById('ft_id').value);
  if (!id) { showToast('Select a fee type first', 'warn'); return; }
  if (!confirm('Delete this fee type?')) return;
  await dbDeleteFeeType(id);
  showToast('Fee type deleted', 'error');
  clearFeeType();
  loadFeeTypes();
}

function clearFeeType() {
  document.getElementById('ft_id').value     = '';
  document.getElementById('ft_name').value   = '';
  document.getElementById('ft_amount').value = '';
  document.getElementById('ft_freq').value   = 'Monthly';
  document.querySelectorAll('#feeTypesTable tr').forEach(r => r.classList.remove('selected'));
}

// ── PAYMENTS ─────────────────────────────────────────────────────────────────
async function populatePaymentSelects() {
  const members  = (await dbGetMembers()).filter(m => m.is_active).sort((a,b) => a.flat_no.localeCompare(b.flat_no));
  const feeTypes = (await dbGetFeeTypes()).sort((a,b) => a.type_name.localeCompare(b.type_name));

  const mSel = document.getElementById('p_member');
  const fSel = document.getElementById('p_feetype');

  const prevMember = mSel.value;
  const prevFee    = fSel.value;

  mSel.innerHTML = members.map(m => `<option value="${m.member_id}">${m.flat_no} – ${m.name}</option>`).join('');
  fSel.innerHTML = feeTypes.map(f => `<option value="${f.fee_type_id}">${f.type_name}</option>`).join('');

  if (prevMember) mSel.value = prevMember;
  if (prevFee)    fSel.value = prevFee;
}

async function loadPayments() {
  const q = document.getElementById('p_search')?.value.toLowerCase() || '';
  const [members, feeTypes, payments] = await Promise.all([dbGetMembers(), dbGetFeeTypes(), dbGetPayments()]);

  const memberMap = Object.fromEntries(members.map(m => [m.member_id, m]));
  const feeMap    = Object.fromEntries(feeTypes.map(f => [f.fee_type_id, f]));

  const filtered = payments
    .map(p => ({ ...p, member: memberMap[p.member_id], fee: feeMap[p.fee_type_id] }))
    .filter(p => !q || p.member?.name?.toLowerCase().includes(q) || p.member?.flat_no?.toLowerCase().includes(q))
    .sort((a, b) => b.payment_id - a.payment_id);

  const tbody = document.querySelector('#paymentsTable tbody');
  tbody.innerHTML = filtered.length ? filtered.map(p => `
    <tr data-id="${p.payment_id}" onclick="selectPayment(${p.payment_id})">
      <td>${p.payment_id}</td>
      <td>${p.pay_date}</td>
      <td>${p.member?.name || '—'}</td>
      <td><strong>${p.member?.flat_no || '—'}</strong></td>
      <td>${p.fee?.type_name || '—'}</td>
      <td>${fmt(p.amount)}</td>
      <td>${modeBadge(p.mode)}</td>
      <td>${p.for_period || '—'}</td>
    </tr>`).join('') : emptyRow(8);
}

async function selectPayment(id) {
  highlightRow('paymentsTable', id);
  document.getElementById('p_id').value = id;
}

async function savePayment() {
  const member_id   = parseInt(document.getElementById('p_member').value);
  const fee_type_id = parseInt(document.getElementById('p_feetype').value);
  const amount      = parseFloat(document.getElementById('p_amount').value);
  const pay_date    = document.getElementById('p_date').value;
  const for_period  = document.getElementById('p_period').value.trim();
  const mode        = document.getElementById('p_mode').value;
  const remarks     = document.getElementById('p_remarks').value.trim();

  if (!member_id || !fee_type_id) { showToast('Select member and fee type', 'warn'); return; }
  if (isNaN(amount) || amount <= 0) { showToast('Enter a valid amount', 'warn'); return; }

  await dbSavePayment({ member_id, fee_type_id, amount, pay_date, for_period, mode, remarks });
  showToast('Payment recorded!');
  clearPayment();
  loadPayments();
}

async function deletePayment() {
  const id = parseInt(document.getElementById('p_id').value);
  if (!id) { showToast('Select a payment first', 'warn'); return; }
  if (!confirm('Delete this payment?')) return;
  await dbDeletePayment(id);
  showToast('Payment deleted', 'error');
  clearPayment();
  loadPayments();
}

function clearPayment() {
  ['p_id','p_amount','p_period','p_remarks'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('p_date').value = new Date().toISOString().slice(0,10);
  document.querySelectorAll('#paymentsTable tr').forEach(r => r.classList.remove('selected'));
}

// ── EXPENSES ─────────────────────────────────────────────────────────────────
async function loadExpenses() {
  const rows = await dbGetExpenses();
  const sorted = [...rows].sort((a, b) => b.expense_id - a.expense_id);
  const tbody = document.querySelector('#expensesTable tbody');
  tbody.innerHTML = sorted.length ? sorted.map(r => `
    <tr onclick="selectExpense(${r.expense_id})">
      <td>${r.expense_id}</td>
      <td>${r.exp_date}</td>
      <td><span class="badge badge-info">${r.category}</span></td>
      <td>${r.description || '—'}</td>
      <td>${fmt(r.amount)}</td>
      <td>${r.paid_to || '—'}</td>
      <td>${r.approved_by || '—'}</td>
    </tr>`).join('') : emptyRow(7);
}

async function selectExpense(id) {
  highlightRow('expensesTable', id);
  const r = (await dbGetExpenses()).find(e => e.expense_id === id);
  if (!r) return;
  document.getElementById('ex_id').value     = r.expense_id;
  document.getElementById('ex_cat').value    = r.category;
  document.getElementById('ex_desc').value   = r.description || '';
  document.getElementById('ex_amount').value = r.amount;
  document.getElementById('ex_date').value   = r.exp_date;
  document.getElementById('ex_paid').value   = r.paid_to || '';
  document.getElementById('ex_appr').value   = r.approved_by || '';
}

async function saveExpense() {
  const category    = document.getElementById('ex_cat').value;
  const description = document.getElementById('ex_desc').value.trim();
  const amount      = parseFloat(document.getElementById('ex_amount').value);
  const exp_date    = document.getElementById('ex_date').value;
  const paid_to     = document.getElementById('ex_paid').value.trim();
  const approved_by = document.getElementById('ex_appr').value.trim();
  const id          = parseInt(document.getElementById('ex_id').value) || null;

  if (isNaN(amount) || amount <= 0) { showToast('Enter a valid amount', 'warn'); return; }

  const record = { category, description, amount, exp_date, paid_to, approved_by };
  if (id) record.expense_id = id;

  await dbSaveExpense(record);
  showToast(id ? 'Expense updated!' : 'Expense added!');
  clearExpense();
  loadExpenses();
}

async function deleteExpense() {
  const id = parseInt(document.getElementById('ex_id').value);
  if (!id) { showToast('Select an expense first', 'warn'); return; }
  if (!confirm('Delete this expense?')) return;
  await dbDeleteExpense(id);
  showToast('Expense deleted', 'error');
  clearExpense();
  loadExpenses();
}

function clearExpense() {
  ['ex_id','ex_desc','ex_amount','ex_paid','ex_appr'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('ex_date').value = new Date().toISOString().slice(0,10);
  document.getElementById('ex_cat').value  = 'Maintenance';
  document.querySelectorAll('#expensesTable tr').forEach(r => r.classList.remove('selected'));
}

// ── REPORTS ──────────────────────────────────────────────────────────────────
async function generateReport() {
  const choice  = document.getElementById('rpt_choice').value;
  const output  = document.getElementById('reportOutput');
  const table   = document.getElementById('reportTable');
  output.style.display = 'block';

  const [members, feeTypes, payments, expenses] = await Promise.all([
    dbGetMembers(), dbGetFeeTypes(), dbGetPayments(), dbGetExpenses()
  ]);

  const memberMap = Object.fromEntries(members.map(m => [m.member_id, m]));
  const feeMap    = Object.fromEntries(feeTypes.map(f => [f.fee_type_id, f]));

  let cols = [], rows = [];

  if (choice === 'Member-wise Payment Summary') {
    cols = ['Flat', 'Name', 'Payments', 'Total Paid'];
    const summary = {};
    members.forEach(m => { summary[m.member_id] = { member: m, cnt: 0, total: 0 }; });
    payments.forEach(p => {
      if (summary[p.member_id]) {
        summary[p.member_id].cnt++;
        summary[p.member_id].total += p.amount || 0;
      }
    });
    rows = Object.values(summary)
      .sort((a, b) => a.member.flat_no.localeCompare(b.member.flat_no))
      .map(s => [s.member.flat_no, s.member.name, s.cnt, fmt(s.total)]);

  } else if (choice === 'Monthly Income Summary') {
    cols = ['Month', 'Transactions', 'Total Income'];
    const monthly = {};
    payments.forEach(p => {
      const m = (p.pay_date || '').slice(0, 7);
      if (!monthly[m]) monthly[m] = { cnt: 0, total: 0 };
      monthly[m].cnt++;
      monthly[m].total += p.amount || 0;
    });
    rows = Object.entries(monthly)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([m, v]) => [m, v.cnt, fmt(v.total)]);

  } else if (choice === 'Category-wise Expense Summary') {
    cols = ['Category', 'Count', 'Total Spent'];
    const cats = {};
    expenses.forEach(e => {
      if (!cats[e.category]) cats[e.category] = { cnt: 0, total: 0 };
      cats[e.category].cnt++;
      cats[e.category].total += e.amount || 0;
    });
    rows = Object.entries(cats)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([cat, v]) => [cat, v.cnt, fmt(v.total)]);

  } else {
    // Defaulters
    cols = ['Flat', 'Name', 'Phone'];
    const curMonth = new Date().toISOString().slice(0, 7);
    const paidIds  = new Set(
      payments.filter(p => (p.pay_date || '').slice(0, 7) === curMonth).map(p => p.member_id)
    );
    rows = members
      .filter(m => m.is_active && !paidIds.has(m.member_id))
      .sort((a, b) => a.flat_no.localeCompare(b.flat_no))
      .map(m => [m.flat_no, m.name, m.phone || '—']);
  }

  // Render
  table.querySelector('thead tr').innerHTML = cols.map(c => `<th>${c}</th>`).join('');
  table.querySelector('tbody').innerHTML = rows.length
    ? rows.map(r => `<tr>${r.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')
    : emptyRow(cols.length, choice === 'Defaulters List (No Payment This Month)' ? '🎉 No defaulters this month!' : 'No data available');
}

// ── UTILITY ───────────────────────────────────────────────────────────────────
function highlightRow(tableId, id) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;
  tbody.querySelectorAll('tr').forEach(r => {
    r.classList.toggle('selected', parseInt(r.dataset.id) === id);
  });
}
