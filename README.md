# 🏘️ Society Financial Management System
### Python + SQLite DBMS | Tkinter GUI

---

## 📦 Requirements
- Python 3.8 or higher (Tkinter is included by default)
- No extra pip packages needed — uses only standard library!

---

## 🚀 How to Run

```bash
python society_finance.py
```

The database file `society_finance.db` will be created automatically on first run.

---

## 🗄️ Database Tables (SQLite)

| Table        | Description                              |
|-------------|------------------------------------------|
| `members`    | Society flat owners / residents          |
| `fee_types`  | Maintenance, parking, etc. fee categories|
| `payments`   | All fee payments made by members         |
| `expenses`   | Society expenditures (cleaning, lift...) |
| `notices`    | Notice board (extendable)                |

---

## 📋 Features

### 🏠 Dashboard
- Live count of active members
- Total income, total expenses, net balance
- Last 20 payments at a glance

### 👥 Members
- Add / Edit / Delete members
- Flat number, name, phone, email
- Search by name or flat

### 💳 Fee Types
- Define fee categories (Monthly Maintenance, Parking, etc.)
- Set amount and frequency (Monthly / Quarterly / Yearly / One-Time)

### 💰 Payments
- Record payments with member, fee type, date, amount, mode (Cash/UPI/Cheque)
- Filter by member name
- Delete incorrect entries

### 🧾 Expenses
- Log society expenses by category
- Fields: description, amount, paid to, approved by
- Edit and delete supported

### 📊 Reports
- **Member-wise Payment Summary** – total paid per flat
- **Monthly Income Summary** – month-by-month income
- **Category-wise Expense Summary** – where money was spent
- **Defaulters List** – who hasn't paid this month

---

## 🛠️ Tech Stack
- **Language**: Python 3
- **Database**: SQLite3 (via `sqlite3` standard library)
- **GUI**: Tkinter + ttk
- **Architecture**: MVC-style separation (DB layer → Page classes)
