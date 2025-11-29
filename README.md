# Jay Ambe Money Manager

Internal tool that helps Jay Ambe create invoices, record receipts, and monitor receivables in real time. Data now persists in Supabase so invoices/payments/payables survive restarts and can be queried from anywhere.

## Project structure

```
jayambe-money/
├── backend/     # Express API (invoices, payments, payables, metrics)
└── frontend/    # React + Vite dashboard
```

## Prerequisites

- Node.js 18+
- npm 9+

## Backend setup

```bash
cd backend
npm install
npm run dev
```

Key environment variables:

- `PORT` (default `4000`)
- `SUPABASE_URL` (project URL)
- `SUPABASE_SERVICE_ROLE_KEY` (service role key used by the backend)

Create a `.env` file inside `backend/`:

```
PORT=4000
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` to use the dashboard. Create invoices, record payments, and watch KPIs update live. Data persists remotely in Supabase.

## Analytics visualizations (frontend + Streamlit)

Two ways to visualize data:

- Built-in frontend charts: the Analytics page (`/analytics`) now includes charts powered by Chart.js (bar chart for receivables, line chart for collections). After updating dependencies in `frontend`, run:

```powershell
cd frontend
npm install
npm run dev
```

- Streamlit explorer: a lightweight Streamlit app is included at `streamlit_app/app.py`. It fetches the backend analytics CSV and payments endpoint and renders interactive Altair charts. To run it:

```powershell
cd streamlit_app
pip install -r requirements.txt
streamlit run app.py
```

Set the backend base URL at the top of the Streamlit page (default `http://localhost:4000`).

## Supabase tables

Create the following tables (camelCase fields are returned via the API, but the database uses snake_case columns):

```sql
-- invoices
create table if not exists invoices (
  id uuid primary key,
  number text not null unique,
  type text not null,
  customer_name text,
  customer_email text,
  due_date date,
  status text,
  line_items jsonb,
  taxes jsonb,
  subtotal numeric,
  tax_amount numeric,
  total numeric,
  paid_to_date numeric,
  balance_due numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- payments
create table if not exists payments (
  id uuid primary key,
  invoice_id uuid references invoices(id),
  invoice_number text,
  customer_name text,
  receipt_number text unique,
  amount numeric,
  mode text,
  tag text,
  note text,
  created_at timestamptz default now()
);

-- payables
create table if not exists payables (
  id uuid primary key,
  bill_number text unique,
  supplier_name text,
  amount numeric,
  due_date date,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## Roadmap

- Add file storage for invoice attachments
- Build receivables aging buckets and supplier payables UI
- CSV/PDF export and lightweight authentication
