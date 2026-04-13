/**
 * db.js — Client-side database using IndexedDB
 * Mirrors the SQLite schema from the Python app
 */

const DB_NAME    = 'SocietyFinanceDB';
const DB_VERSION = 1;

let _db = null;

// ── Open / Init ───────────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) { resolve(_db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains('members')) {
        const ms = db.createObjectStore('members', { keyPath: 'member_id', autoIncrement: true });
        ms.createIndex('flat_no', 'flat_no', { unique: true });
      }

      if (!db.objectStoreNames.contains('fee_types')) {
        const fs = db.createObjectStore('fee_types', { keyPath: 'fee_type_id', autoIncrement: true });
        fs.createIndex('type_name', 'type_name', { unique: true });
      }

      if (!db.objectStoreNames.contains('payments')) {
        db.createObjectStore('payments', { keyPath: 'payment_id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains('expenses')) {
        db.createObjectStore('expenses', { keyPath: 'expense_id', autoIncrement: true });
      }
    };

    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror    = (e) => reject(e.target.error);
  });
}

// ── Generic helpers ───────────────────────────────────────────────────────────
function txStore(storeName, mode = 'readonly') {
  return _db.transaction(storeName, mode).objectStore(storeName);
}

function idbGetAll(storeName) {
  return new Promise((res, rej) => {
    const req = txStore(storeName).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

function idbGet(storeName, key) {
  return new Promise((res, rej) => {
    const req = txStore(storeName).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

function idbPut(storeName, record) {
  return new Promise((res, rej) => {
    const req = txStore(storeName, 'readwrite').put(record);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

function idbAdd(storeName, record) {
  return new Promise((res, rej) => {
    const req = txStore(storeName, 'readwrite').add(record);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

function idbDelete(storeName, key) {
  return new Promise((res, rej) => {
    const req = txStore(storeName, 'readwrite').delete(key);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

// ── MEMBERS ──────────────────────────────────────────────────────────────────
async function dbGetMembers() { return idbGetAll('members'); }

async function dbSaveMember(data) {
  if (data.member_id) return idbPut('members', data);
  delete data.member_id;
  return idbAdd('members', data);
}

async function dbDeleteMember(id) { return idbDelete('members', id); }

// ── FEE TYPES ─────────────────────────────────────────────────────────────────
async function dbGetFeeTypes() { return idbGetAll('fee_types'); }

async function dbSaveFeeType(data) {
  if (data.fee_type_id) return idbPut('fee_types', data);
  delete data.fee_type_id;
  return idbAdd('fee_types', data);
}

async function dbDeleteFeeType(id) { return idbDelete('fee_types', id); }

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
async function dbGetPayments() { return idbGetAll('payments'); }

async function dbSavePayment(data) {
  if (data.payment_id) return idbPut('payments', data);
  delete data.payment_id;
  return idbAdd('payments', data);
}

async function dbDeletePayment(id) { return idbDelete('payments', id); }

// ── EXPENSES ──────────────────────────────────────────────────────────────────
async function dbGetExpenses() { return idbGetAll('expenses'); }

async function dbSaveExpense(data) {
  if (data.expense_id) return idbPut('expenses', data);
  delete data.expense_id;
  return idbAdd('expenses', data);
}

async function dbDeleteExpense(id) { return idbDelete('expenses', id); }

// ── SEED DEMO DATA (runs once if empty) ──────────────────────────────────────
async function seedIfEmpty() {
  const members = await dbGetMembers();
  if (members.length > 0) return;

  const demoMembers = [
    { name: 'Ravi Kumar',    flat_no: 'A-101', phone: '9876543210', email: 'ravi@email.com',    join_date: '2024-01-01', is_active: 1 },
    { name: 'Priya Sharma',  flat_no: 'A-102', phone: '9876543211', email: 'priya@email.com',   join_date: '2024-01-01', is_active: 1 },
    { name: 'Anil Verma',    flat_no: 'B-201', phone: '9876543212', email: 'anil@email.com',    join_date: '2024-02-01', is_active: 1 },
    { name: 'Sunita Patel',  flat_no: 'B-202', phone: '9876543213', email: 'sunita@email.com',  join_date: '2024-02-01', is_active: 1 },
    { name: 'Rohit Singh',   flat_no: 'C-301', phone: '9876543214', email: 'rohit@email.com',   join_date: '2024-03-01', is_active: 1 },
    { name: 'Meena Joshi',   flat_no: 'C-302', phone: '9876543215', email: 'meena@email.com',   join_date: '2024-03-01', is_active: 1 },
  ];

  const feeTypes = [
    { type_name: 'Monthly Maintenance', amount: 1500, frequency: 'Monthly'  },
    { type_name: 'Water Charges',       amount:  300, frequency: 'Monthly'  },
    { type_name: 'Sinking Fund',        amount: 5000, frequency: 'Yearly'   },
    { type_name: 'Parking Fee',         amount:  500, frequency: 'Monthly'  },
  ];

  const today = new Date().toISOString().slice(0, 10);
  const months = ['2025-01','2025-02','2025-03','2025-04'];

  for (const m of demoMembers) await idbAdd('members', m);
  for (const f of feeTypes)   await idbAdd('fee_types', f);

  const mems = await dbGetMembers();
  const fees = await dbGetFeeTypes();

  const modes = ['Cash','UPI','Online','Cheque'];
  let pid = 0;
  for (const m of mems) {
    for (const mo of months) {
      await idbAdd('payments', {
        member_id:   m.member_id,
        fee_type_id: fees[0].fee_type_id,
        amount:      fees[0].amount,
        pay_date:    `${mo}-01`,
        for_period:  mo,
        mode:        modes[pid % modes.length],
        remarks:     ''
      });
      pid++;
    }
  }

  const expCats = [
    { category: 'Electricity', description: 'Common area electricity', amount: 8200, exp_date: '2025-01-15', paid_to: 'BESCOM', approved_by: 'Secretary' },
    { category: 'Security',    description: 'Guard salary',            amount: 12000, exp_date: '2025-02-01', paid_to: 'Ramesh', approved_by: 'Chairman'  },
    { category: 'Cleaning',    description: 'Cleaning supplies',       amount: 2500, exp_date: '2025-03-10', paid_to: 'CleanMart', approved_by: 'Treasurer' },
    { category: 'Repairs',     description: 'Lift maintenance',        amount: 6000, exp_date: '2025-04-05', paid_to: 'TechLift', approved_by: 'Secretary' },
  ];
  for (const ex of expCats) await idbAdd('expenses', ex);
}
