# Stock League v3 — Setup Guide

## What's new in v3
- **Performance tab** — dedicated dashboard showing for each player:
  - Total portfolio value
  - Total return since inception
  - Lifetime IRR (computed from lot cashflows via XIRR)
  - Last month, year-to-date, last 12 months returns
  - Portfolio value-over-time line chart (all 3 players)
- **Daily snapshots** — Vercel cron at 4:15pm ET records each player's portfolio value
- Time-windowed returns show a "building…" pill until enough snapshots exist

---

## Step 1 — Supabase

1. Go to [supabase.com](https://supabase.com) → New Project → name: `stock-league`
2. **SQL Editor** → run:

```sql
create table users (
  id serial primary key,
  name text unique not null,
  cash numeric default 1000000
);

create table lots (
  id serial primary key,
  user_name text references users(name) on delete cascade,
  ticker text not null,
  shares numeric not null,
  cost_basis numeric not null,
  purchase_date date not null
);

create table stock_pool (
  ticker text primary key,
  name text not null,
  price numeric not null,
  change_pct numeric default 0,
  updated_at timestamptz
);

create table snapshots (
  id serial primary key,
  user_name text references users(name) on delete cascade,
  snapshot_date date not null,
  total_value numeric not null,
  unique(user_name, snapshot_date)
);

-- Seed players
insert into users (name) values ('Nirav'), ('Desiree'), ('Chloe');

-- Seed stocks
insert into stock_pool (ticker, name, price, change_pct) values
  ('FANUY', 'Fanuc Corp ADR', 14.82, 0.4),
  ('BSY',   'Bentley Systems', 55.37, -1.1),
  ('ILKAF', 'Ilika PLC', 1.04, 2.8),
  ('PALAF', 'Palatin Technologies', 0.61, -3.2);
```

3. **Settings → API** → copy `Project URL` and `service_role` key

---

## Step 2 — Polygon.io

1. [polygon.io](https://polygon.io) → free signup → copy API key

---

## Step 3 — GitHub

1. New repo → `stock-league` → upload all files

---

## Step 4 — Vercel

1. [vercel.com](https://vercel.com) → New Project → import repo
2. Add **Environment Variables**:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase `service_role` key |
| `POLYGON_API_KEY` | Polygon.io API key |
| `ADMIN_PASSWORD` | `admin2024` (or change it) |

3. Deploy

---

## Step 5 — Share

- Desiree & Chloe: URL + password `stocks2024`
- Nirav: URL + admin password `admin2024`

---

## Cron schedule

| Time (ET, weekdays) | Action |
|---|---|
| 9:35am | Refresh prices (market open) |
| 4:05pm | Refresh prices (market close) |
| 4:15pm | Snapshot — record portfolio values |

Crons require Vercel Hobby plan (free).

## Performance tab notes

- **IRR** is computed client-side using XIRR from lot purchase dates and costs as cash outflows, with the current portfolio value as the terminal inflow. No historical data needed.
- **Last month / YTD / last 12M** are calculated from the daily snapshots table. These show "building…" until enough snapshots exist for the relevant window.
- **Chart** appears once at least 2 snapshots exist. It shows % return (not absolute value) so all three players are comparable on the same axis.
