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

### 2. Trades Page & Position Management
- **3-Tab Architecture**: **Active Trades**, **Closed History**, and **Archive**.
- **Manual Trade Creation**: Add market or limit trades directly on Trades page (`+ Manual Trade`) without Watchlist triggers.
- **Interactive & Live Close Modal**: Close active trades with live MEXC price pre-fill and live realized PnL calculations ($ and %).
- **Auto TP/SL Hit & Journaling**: Automatically closes trades when TP or SL target is hit and writes entry into Journal (`trades` table).
- **Soft-Delete Archive**: Soft-delete trade alerts with Restore (↩) and Permanent Delete (🗑) options.

> 📖 **Full Trades Documentation**: See [`TRADES.md`](TRADES.md) for trade lifecycles, PnL formulas, diagrams, and database schemas.

### 3. Public Sharing Hub & Vanity Handle URLs
- **Custom Vanity Handles**: Share setup URLs under clean vanity routes (`/[username]/[slug]`).
- **Multi-Token Support**: Share single or multiple coin setups on a single unified page.
- **Two Specialized Templates**:
  - **📡 Watchlist Radar**: Ongoing market condition radar, trigger levels, distance to trigger (%), planned EP/SL/TP, pre-trade thesis, Position side (`LONG`/`SHORT`), Order Type (`LIMIT`, `TRIGGER LIMIT`, `MARKET`), and **"🔥 ALERT FIRED & TRIGGERED"** proof-of-accuracy badges.
  - **🎯 Trade Setups**: Position side, Order Type, live PnL % banner vs Entry Price, executed targets, R:R ratio, and post-entry review notes.
- **Soft-Delete Archive & Restore Tab**: Soft-delete public share pages with instant **Restore (↺)** and **Permanent Delete (🗑)** options.
- **Dedicated 404 Error Page**: Custom dark-mode page (`Tape / 404`) for invalid or soft-deleted share links.

> 📖 **Full Public Sharing Documentation**: See [`SHARES.md`](SHARES.md) for vanity URL routing, card templates, diagrams, and database schemas.

### 4. Risk Management & Notifications
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

Apply all SQL migrations located in `supabase/migrations/` (migrations `001` through `020_soft_delete_public_share_links.sql`) in your Supabase SQL Editor.

### 3. Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view Tape.
