# Public Sharing Hub & Multi-Token Vanity Setup Links

The **Public Sharing Hub** (`/shares`) enables traders to publish real-time, interactive **Public Share Pages** for their Watchlist Radars and Trade Setups under custom vanity handle URLs (`/[username]/[slug]`).

---

## 📌 Features & Architecture Overview

1. **Custom Vanity Handle URLs (`/[username]/[slug]`)**:
   - Every trader can set a unique handle (username) in Settings (e.g., `@matt`).
   - Share URLs follow clean, social-ready routes: `https://mochex.io/matt/solana-watchlist-radar`.

2. **Multi-Token Support**:
   - Each public page can display single or **multiple coin setups** on a single unified page.
   - Real-time MEXC market tickers (price, 24h change) are fetched in parallel for all coins on the page.

3. **Two Specialized Presentation Templates**:
   - **📡 Public Watchlist Radar Template (`share_type === 'watchlist'`)**:
     - Displays ongoing market radar conditions, trigger price, alert direction (`ABOVE` / `BELOW`), distance to trigger (e.g. `2.45% above current price`), planned EP/SL/TP levels, pre-trade thesis commentary, Position side (`LONG`/`SHORT`), and Order Type (`LIMIT`, `TRIGGER LIMIT`, `MARKET`).
     - **Ongoing Token Selection Rules**: Only untriggered watchlist items (`!alert_fired`) WITH a valid trigger price set can be selected.
     - **Fired Alert Proof-of-Accuracy**: When a watchlist alert fires or target price level is hit, the token is retained on the public page with an animated **"🔥 ALERT FIRED & TRIGGERED"** badge as proof of prediction accuracy for social media followers.
   - **🎯 Public Trades Performance Template (`share_type === 'trade'`)**:
     - Displays position side (`LONG` / `SHORT`), Order Type (`LIMIT`, `MARKET`), live PnL % banner vs Entry Price, executed target levels (EP, SL, TP), Risk-to-Reward ratio (e.g. `2.50 : 1`), and post-entry review notes.

4. **Soft-Deleted Archive & Restore Pipeline (`020_soft_delete_public_share_links.sql`)**:
   - **Active Share Pages Tab**: Displays active public setup pages.
   - **Archived / Trash Tab**: Soft-deleted pages (`deleted_at IS NOT NULL`) are stored in the Trash tab. Soft-deleted links automatically return 404 to public visitors while allowing the trader to **Restore (↺)** or **Delete Permanently (🗑)** anytime.
   - **Partial Unique Index**: Slugs are unique per user among active pages (`WHERE deleted_at IS NULL`), permitting slug reuse after soft-deleting.

5. **Dedicated 404 Error Handling (`not-found.tsx`)**:
   - Visiting a non-existent username, invalid slug, or soft-deleted link renders a dedicated dark-mode 404 page (`MOCHEX / 404`) with quick navigation back to MOCHEX.

---

## 🔄 Public Sharing Lifecycles & Workflow

```mermaid
flowchart TD
    A[Trader Sets Username Handle in Settings] --> B[Navigate to /shares]
    B --> C[Click '+ Create Public Share Page']
    C --> D{Select Page Type}
    
    D -->|Watchlist Radar| E[Select Ongoing Watchlist Coins with Trigger Px]
    D -->|Trade Setups| F[Select Active/Closed Trade Alerts]
    
    E --> G[Configure Position Side & Order Type]
    F --> G
    
    G --> H[Publish Page: /[username]/[slug]]
    
    H -->|Public Visitor Views Page| I[Live MEXC Price Feed + Visual Card Template]
    
    I -->|Watchlist Price Hits Trigger| J[Transforms Card to '🔥 ALERT FIRED & TRIGGERED']
    
    H -->|Trader Clicks Delete| K[Move to Archived / Trash Tab\nSets deleted_at = now()]
    K -->|Public Link Status| L[Renders Custom 404 Page]
    
    K -->|Trader Clicks Restore ↺| H
    K -->|Trader Clicks Delete Permanently 🗑| M[Purged from Database]
```

---

## 🗄️ Database Schema & API Reference

### Tables & Migrations

- **`public_share_links`** (`018_public_share_links.sql`, `019_multi_token_share_links.sql`, `020_soft_delete_public_share_links.sql`):
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, Foreign Key)
  - `title` (TEXT)
  - `slug` (TEXT)
  - `share_type` (`'watchlist'` | `'trade'`)
  - `symbol` (TEXT)
  - `items` (JSONB array of `PublicShareItem` objects: `{ id, symbol, share_type, trigger_price, trigger_direction, order_type, entry_price, stop_loss, take_profit, notes }`)
  - `is_active` (BOOLEAN, default `true`)
  - `view_count` (INTEGER, default `0`)
  - `deleted_at` (TIMESTAMPTZ, default `NULL`)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

### API Endpoints

- `GET /api/shares`: Fetch user's public share links (active & archived).
- `POST /api/shares`: Create a new public share page.
- `PUT /api/shares/[id]`: Update title, slug, visibility, or coin items.
- `DELETE /api/shares/[id]`: Soft-delete share page (`deleted_at = now()`).
- `DELETE /api/shares/[id]?permanent=true`: Permanently purge share page from database.
- `POST /api/shares/[id]/restore`: Restore soft-deleted share page (`deleted_at = null`).

---

## ⚡ Direct MEXC Futures Integration

Every token card rendered on a public share page includes a direct chart launch button:
`https://www.mexc.co/futures/SYMBOL_USDT`
allowing public visitors to open the contract chart directly on MEXC in a new browser tab.

---

## 🗺️ 5-Feature Platform Roadmap

1. **📸 One-Click Social Card PNG Generator** *(Implemented ✅)*:
   - High-resolution 2x retina PNG exporter (`SocialCardModal`) with theme presets (`Cyber Emerald`, `Radar Gold`, `Deep Space`), one-click `📋 Copy PNG to Clipboard` and `⬇️ Download PNG`.
2. **🌐 Public Trader Profile Showcase (`/[username]`)** *(Implemented ✅)*:
   - Dedicated public profile landing page (`src/app/[username]/page.tsx`) showcasing trader handle, display name, bio, social links (Twitter/X, Telegram), verified trader badge, KPI stat cards, and interactive setup directory gallery.
3. **📈 Interactive Candlestick Charts with Setup Overlay** *(Implemented ✅)*:
   - Embedded TradingView canvas candlestick chart engine (`lightweight-charts`) with real-time MEXC Futures K-line API proxy (`/api/mexc/kline`).
   - Dynamic interactive horizontal price line overlays directly on the candles for **Trigger Price** (Orange/Gold), **Entry Price** (Cyan), **Stop Loss** (Red with % risk label), and **Take Profit** (Green with % target label).
   - Timeframe bar selection (`1m`, `5m`, `15m`, `1h`, `4h`, `1d`), live auto-refresh (10s), crosshair tooltips, and dedicated full-screen technical analysis page at `/chart/[symbol]`.
4. **🔊 Web Audio Price Proximity Alarms** *(Implemented ✅)*:
   - Pure Web Audio synthesizer engine (`src/lib/audio-alarm-engine.ts`) with zero external MP3 asset dependency.
   - 4 synthesized sound presets (`Radar Ping`, `Breakout Bell`, `Sonar Pulse`, `Soft Chime`) with live audition testing button in Settings.
   - Background proximity monitoring component (`AudioAlarmNotifier`) checking live MEXC market prices against Watchlist triggers, firing audio alarms + floating warning toasts when price is within configured threshold distance (`0.25%`, `0.5%`, `1.0%`, `2.0%`).
5. **📜 Trade Setup Revision History & Timeline Log** *(Planned 🔮)*:
   - Audit log tracking setup adjustments (e.g. moving SL to Breakeven, TP1 hit), providing full public transparency on setup evolution.
