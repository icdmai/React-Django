# Dashboard Setup Guide

## Overview

A Dashboard is a special report that displays multiple child reports as widgets.
Each widget calls the existing `/api/reports/{id}/data/` endpoint — no extra backend work needed.

---

## Option A — Dashboard from a Single Debtors Report

Use this when you have one report with all debtor columns and just want a clean dashboard view.

### Step 1 — Create the Debtors Report

Go to **Django Admin → Reports → Reports → Add Report**

| Field | Value |
|---|---|
| Name | `Debtors Ledger` |
| Report Type | `table` |
| Is Active | ✅ |
| Base Query | (see below) |

**Base Query:**
```sql
SELECT
    debtor_code,
    debtor_name,
    invoice_no,
    outstanding_balance,
    due_date,
    branch_code,
    status
FROM debtors_ledger
WHERE status = 'open'
ORDER BY outstanding_balance DESC
```

Save and note the **Report ID** (e.g. `5`).

### Step 2 — Sync the Report

Open the report → **Actions → Trigger Full Sync** → click **Go**.

Wait for sync status to show `synced`.

### Step 3 — Create the Dashboard Report

Go to **Django Admin → Reports → Reports → Add Report**

| Field | Value |
|---|---|
| Name | `Debtors Dashboard` |
| Report Type | `dashboard` |
| Is Active | ✅ |

**Dashboard Widgets (JSON field):**
```json
[
  {
    "report_id": 5,
    "title": "Debtors Ledger",
    "col_span": 12,
    "page_size": 20
  }
]
```

Save and note the **Dashboard Report ID** (e.g. `8`).

### Step 4 — Open in Frontend

```
http://localhost:5173/dashboard/8
```

**What you will see:**

```
┌─────────────────────────────────────────────────────────┐
│  Debtors Dashboard                                       │
├─────────────────────────────────────────────────────────┤
│  Debtors Ledger                          1,234 rows      │
│  debtor_code | debtor_name | invoice_no | balance | ...  │
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

### Step 5 — Add Stat Cards (Optional)

In `src/pages/DashboardPage.tsx`, add stat cards above the widget grid:

```tsx
import { StatCard, ReportWidget } from "../components";

// Inside the dashboardId view, before the widget grid:
<div className="flex gap-4 mb-6">
  <StatCard
    reportId={5}
    metric="outstanding_balance"
    label="Total AR"
    format="currency"
    aggregate="sum"
  />
  <StatCard
    reportId={5}
    metric="outstanding_balance"
    label="Highest Single Debtor"
    format="currency"
    aggregate="max"
  />
  <StatCard
    reportId={5}
    metric="invoice_no"
    label="Total Invoices"
    aggregate="count"
  />
</div>
```

**Result:**

```
┌──────────────────┬──────────────────┬──────────────────┐
│  Total AR        │  Highest Debtor  │  Total Invoices  │
│  R 1,234,567     │  R 45,000        │  842             │
├──────────────────┴──────────────────┴──────────────────┤
│  Debtors Ledger (full width table)                      │
└─────────────────────────────────────────────────────────┘
```

---

## Option B — Dashboard from Three Separate Reports

Use this when you want different filtered/grouped views side by side.

### Step 1 — Create Report A: Top Debtors Summary

**Django Admin → Reports → Add Report**

| Field | Value |
|---|---|
| Name | `Debtors - Top by Balance` |
| Report Type | `table` |

**Base Query:**
```sql
SELECT
    debtor_code,
    debtor_name,
    SUM(outstanding_balance) AS total_outstanding,
    COUNT(invoice_no)        AS invoice_count,
    MAX(due_date)            AS latest_due
FROM debtors_ledger
WHERE status = 'open'
GROUP BY debtor_code, debtor_name
ORDER BY total_outstanding DESC
```

Save → note **ID = 5** → sync.

---

### Step 2 — Create Report B: Overdue Invoices

**Django Admin → Reports → Add Report**

| Field | Value |
|---|---|
| Name | `Debtors - Overdue Invoices` |
| Report Type | `table` |

**Base Query:**
```sql
SELECT
    invoice_no,
    debtor_name,
    outstanding_balance  AS amount,
    due_date,
    DATEDIFF(day, due_date, GETDATE()) AS days_overdue
FROM debtors_ledger
WHERE due_date < GETDATE()
  AND status   = 'open'
ORDER BY days_overdue DESC
```

Save → note **ID = 6** → sync.

---

### Step 3 — Create Report C: AR by Branch

**Django Admin → Reports → Add Report**

| Field | Value |
|---|---|
| Name | `Debtors - AR by Branch` |
| Report Type | `table` |

**Base Query:**
```sql
SELECT
    branch_code,
    SUM(outstanding_balance) AS ar_total,
    COUNT(DISTINCT debtor_code) AS debtor_count
FROM debtors_ledger
WHERE status = 'open'
GROUP BY branch_code
ORDER BY ar_total DESC
```

Save → note **ID = 7** → sync.

---

### Step 4 — Create the Dashboard Report

**Django Admin → Reports → Add Report**

| Field | Value |
|---|---|
| Name | `Debtors Dashboard` |
| Report Type | `dashboard` |

**Dashboard Widgets (JSON field):**
```json
[
  {
    "report_id": 5,
    "title": "Top Debtors by Balance",
    "col_span": 12,
    "page_size": 15
  },
  {
    "report_id": 6,
    "title": "Overdue Invoices",
    "col_span": 8,
    "page_size": 10
  },
  {
    "report_id": 7,
    "title": "AR by Branch",
    "col_span": 4,
    "page_size": 10
  }
]
```

Save → note **Dashboard ID = 8**.

---

### Step 5 — Sync All Child Reports

For each report (5, 6, 7):
- Open in admin → **Actions → Trigger Full Sync** → **Go**

---

### Step 6 — Open in Frontend

```
http://localhost:5173/dashboard/8
```

**What you will see:**

```
┌─────────────────────────────────────────────────────────┐
│  Debtors Dashboard                                       │
├─────────────────────────────────────────────────────────┤
│  Top Debtors by Balance              (full width)        │
│  debtor_code | debtor_name | total_outstanding | ...     │
├──────────────────────────────┬──────────────────────────┤
│  Overdue Invoices            │  AR by Branch            │
│  invoice_no | debtor | days  │  branch | ar_total | ...  │
└──────────────────────────────┴──────────────────────────┘
```

---

## col_span Reference

The grid is 12 columns wide (like Bootstrap).

| col_span | Width |
|---|---|
| `12` | Full width |
| `8` | Two thirds |
| `6` | Half |
| `4` | One third |
| `3` | Quarter |

---

## Opening Any Report Directly (No Dashboard)

Every report is also accessible as a standalone paginated page:

```
http://localhost:5173/report/5    ← Debtors Summary
http://localhost:5173/report/6    ← Overdue Invoices
http://localhost:5173/report/7    ← AR by Branch
```

No configuration needed — the `ReportPaginatedViewerPage` handles any report ID automatically.

---

## Quick Reference

| What | Where to configure | Frontend URL |
|---|---|---|
| Create report | Admin → Reports → Add Report | — |
| Sync report | Admin → open report → Actions → Trigger Full Sync | — |
| View report | — | `/report/{id}` |
| Create dashboard | Admin → Reports → Add Report (type=dashboard) | — |
| View dashboard | — | `/dashboard/{id}` |
| Welcome page | — | `/dashboard` |
