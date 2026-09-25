# Tape — Personal Trading Journal & Futures Watchlist

Tape is a high-performance personal trading journal and real-time futures watchlist app built with **Next.js 15**, **Supabase**, and **Tailwind CSS**, featuring live data feeds from **MEXC USDT-Perpetual Futures**.

---

## 🚀 Key Features

### 1. Futures Watchlist & Trigger Engine
- **Live MEXC Prices**: Real-time ticker prices, 24h volume, and percentage changes.
- **Dual-Tab Interface**: Separate **Watchlist (Active)** and **Triggered (Archive)** tabs.
- **Multi-Setup Per Coin**: Add multiple independent trade plans for the same token (e.g. dip-buy `Limit` vs breakout `Trigger Limit`).
- **Trigger Limit Chaining**: First-stage triggers automatically spawn a secondary `Limit` order at Entry Price (EP) when hit.
- **Trigger Archive & Restoring**: Move triggered items back to the active watchlist anytime without plan loss.

> 📖 **Full Watchlist Documentation**: See [`WATCHLIST.md`](WATCHLIST.md) for architecture, trigger lifecycles, diagrams, and database schemas.

### 2. Trade Journal & Trade Alerts
- Track trades with Entry/Exit prices, P&L, position size, fees, and R-multiples.
- Log trade thesis, reviews, screenshots, and discipline scores.
- Direct logging of fired watchlist price triggers into the trade journal.

### 3. Risk Management & Notifications
- Account-wide risk parameters (Max Daily Loss, Position Risk %, Max Open Positions).
- **Multi-Channel Alert Notifications**:
  - **Discord Webhooks**: Configure single or multiple Discord webhooks.
  - **Telegram Bot Integration**: Configure single or multiple Telegram bot destinations (`Bot Token` + `Chat ID`).
  - **In-App & Desktop Toasts**: Instant notifications via bell menu and Windows PowerShell toasts.

---

## 🛠 Getting Started

### 1. Environment Setup

Copy `.env.example` to `.env.local` and set your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Run Database Migrations

Apply the SQL migrations located in `supabase/migrations/` (including `012_triggered_watchlist_items.sql`) in your Supabase SQL Editor.

### 3. Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view Tape.
