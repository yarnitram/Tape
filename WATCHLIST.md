# Futures Watchlist & Trigger Engine

The **Futures Watchlist** is a real-time market tracking and trade plan trigger system integrated with MEXC USDT-perpetual futures. It allows traders to define precise trigger conditions and trade plans, automatically archiving triggered tokens and chaining orders based on user-defined order types.

---

## 📌 Overview & Features

1. **Real-time MEXC Market Radar**:
   - Live ticker updates (price, 24h change, 24h volume) polled at configurable intervals.
   - Quick search across MEXC USDT-perpetual futures contracts.

2. **3-Tab Architecture**:
   - **Watchlist (Active)**: Armed tokens actively watching live prices for trigger conditions.
   - **Triggered**: Tokens whose trigger conditions have been met automatically.
   - **Archive**: Soft-deleted tokens from either the active Watchlist or Triggered tab.

3. **Trade Plan & Order Types**:
   - **Trigger Price**: The price condition that arms/fires the alert (`above` or `below`).
   - **Entry Price (EP)**, **Stop Loss (SL)**, **Take Profit (TP)**: Trade parameters.
   - **Order Types**:
     - `Limit`: Standard limit order plan.
     - `Trigger Limit`: Two-stage order chaining.
     - `Market`: Immediate market order plan.

4. **Multi-Instance Token Support**:
   - Traders can create and monitor **multiple independent setups for the same coin** simultaneously (e.g., separate dip-buy `Limit` and breakout `Trigger Limit` setups for `BTC`).
   - Ticker polling automatically deduplicates symbols so market data requests remain lean.
   - Moving an item back from Triggered or Archive creates a new active entry without overwriting or colliding with existing active setups for that coin.

---

## 🔄 Trigger Execution Lifecycles

### 1. Standard Triggers (`Limit` / `Market`)

```mermaid
flowchart TD
    A[Live Price hits Trigger Price] --> B[Atomic Claim PATCH]
    B --> C[Archive to triggered_watchlist_items]
    C --> D[Remove from active watchlist_items]
    D --> E[Log to trade_alerts table]
    E --> F[Appears on /trades page + Dispatch Notification]
```

When live MEXC prices hit the configured `trigger_price`:
1. The row is marked fired atomically (preventing duplicate triggers across tabs).
2. The item moves from **Watchlist** to **Triggered**.
3. A trade alert row is logged in `trade_alerts`, making it immediately visible on the `/trades` page.
4. Notifications are dispatched via configured channels (in-app bell, desktop toast, Discord webhook).

---

### 2. Trigger Limit Chaining (`Trigger Limit`)

```mermaid
flowchart TD
    A[Live Price hits Trigger Price] --> B[Atomic Claim PATCH]
    B --> C[Archive original item to triggered_watchlist_items]
    C --> D[Remove original item from active watchlist_items]
    D --> E{Entry Price set?}
    E -->|Yes| F[Create NEW watchlist_items row\n• order_type = limit\n• trigger_price = entry_price\n• Direction auto-inferred from current price vs EP]
    E -->|No| G[Skip chaining]
    F --> H[Dispatch notification: 'TL Triggered — Limit Order Armed']
```

When a `Trigger Limit` item fires:
1. The original item moves to **Triggered**.
2. A **new watchlist item** is automatically spawned in the active watchlist with:
   - `trigger_price` set to the original **Entry Price (EP)**.
   - `order_type` updated to `limit`.
   - `trigger_direction` auto-inferred from live price vs EP (`below` if current price > EP, `above` if current price < EP).
3. **No `/trades` row is logged yet** — the token remains in the active watchlist until the new Limit trigger (at EP) is reached.

---

## 📂 Triggered Tokens Tab

The **Triggered** tab maintains a record of all automatically fired tokens and their trade plans at the exact moment of execution.

### Displayed Information
- **Coin**: Base asset symbol (e.g., `BTC`, `SOL`).
- **Side**: `LONG` (if trigger direction was `below`) or `SHORT` (if trigger direction was `above`).
- **Order Type**: `Trigger Limit`, `Limit`, or `Market`.
- **Trigger Px**: Price condition configured by the user.
- **Fired Px**: Actual MEXC last price at trigger execution.
- **Fired At**: Timestamp of trigger in Singapore Time (`SGT`).
- **EP / SL / TP**: Trade plan parameters.
- **Notes**: Trade thesis or notes saved with the item.

### Actions
- **Move Back (↩)**: Re-creates the item back into the active Watchlist with its full trade plan intact, clearing it from Triggered.
- **Delete (🗑)**: Soft-deletes the item to the **Archive** tab (tagged as `Removed from Triggered`).

---

## 📦 Archive Tab (Soft-Delete Repository)

The **Archive** tab holds all manually deleted items from both the Active Watchlist and Triggered tabs.

```mermaid
flowchart TD
    W[Active Watchlist Item] -->|Delete| A[Archive Tab]
    T[Triggered Item] -->|Delete| A[Archive Tab]

    A -->|Restore ↩| W
    A -->|Delete 🗑| X((Permanent Delete))
```

### Displayed Information
- **Coin**: Base asset symbol.
- **Source**: `Watchlist` (if removed from Active Watchlist) or `Triggered` (if removed from Triggered tab).
- **Side**: `LONG` or `SHORT`.
- **Order Type**: `Trigger Limit`, `Limit`, or `Market`.
- **Trigger Px & Fired Px**: Configured and actual execution prices (if fired).
- **Archived At**: Timestamp when the item was moved to Archive.
- **Notes**: Trade notes saved with the item.

### Actions
- **Restore (↩)**: Re-creates the item back into the active Watchlist with its full trade plan, clearing it from the Archive.
- **Permanently Delete (🗑)**: Completely purges the item from the database.

---

## 🗄 Database & API Reference

### Tables

1. **`watchlist_items`**: Active watchlist items currently monitored by the watcher.
   - Key columns: `id`, `user_id`, `symbol`, `trigger_price`, `trigger_direction`, `entry_price`, `stop_loss`, `take_profit`, `order_type`, `notes`.

2. **`triggered_watchlist_items`**: Archive of automatically fired tokens.
   - Key columns: `id`, `user_id`, `source_item_id`, `symbol`, `trigger_price`, `trigger_direction`, `fired_price`, `entry_price`, `stop_loss`, `take_profit`, `order_type`, `notes`, `fired_at`.

3. **`archived_watchlist_items`**: Soft-delete repository for manually removed active or triggered items.
   - Key columns: `id`, `user_id`, `symbol`, `trigger_price`, `trigger_direction`, `fired_price`, `entry_price`, `stop_loss`, `take_profit`, `order_type`, `notes`, `archive_source`, `fired_at`, `archived_at`.

### API Endpoints

- `GET  /api/watchlist`: Fetch active watchlist items.
- `POST /api/watchlist`: Add/re-create an active watchlist item with trade plan.
- `PATCH /api/watchlist/[id]`: Update trade plan or claim trigger (`alert_fired: true`).
- `DELETE /api/watchlist/[id]`: Remove active item.
- `GET  /api/triggered-watchlist`: Fetch triggered tokens.
- `POST /api/triggered-watchlist`: Insert a new triggered item on fire.
- `DELETE /api/triggered-watchlist/[id]`: Remove a triggered item.
- `GET  /api/archived-watchlist`: Fetch soft-deleted archived tokens.
- `POST /api/archived-watchlist`: Save a soft-deleted item into Archive.
- `DELETE /api/archived-watchlist/[id]`: Permanently delete an archived item.

---

## ⚡ Unified MEXC Market Request Pipeline

1. **Server Spec Caching & Batching (`/api/mexc/futures`)**:
   - 60-second in-memory server cache for MEXC contract details (max leverage, base coin icon URLs, fee rates).
   - Supports batch lookup queries (`?symbols=BTC_USDT,ETH_USDT&with_details=true`), returning both tickers and coin icons in **1 single HTTP payload**.

2. **Unified Hook & Tab Visibility Pause (`useMexcMarketData`)**:
   - Replaced duplicate polling and per-symbol icon fetch loops with `useMexcMarketData`.
   - Automatically pauses polling when browser tab is inactive (`document.hidden`), preventing rate limits and reducing network usage.
