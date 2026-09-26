# 📡 TradingView Webhook Automation Guide

MOCHEX supports direct, automated alert ingestion from **TradingView**. You can pipe PineScript indicator alerts, strategy backtest signals, or discretionary price level crossings straight into your **Watchlist (Radar)** or **Trades (Execution Log)** with zero manual entry.

---

## 🔑 1. Getting Your Webhook URL & Secret

1. Open **MOCHEX** and navigate to [⚙️ Settings](/settings).
2. Scroll to the **📡 TradingView Webhook Automation** card.
3. Your personal endpoint will be displayed:
   ```
   https://mochex.app/api/webhooks/tradingview?key=tv_sec_xxxxxxxxxxxx
   ```
4. Click **📋 Copy Webhook URL**.
5. If your secret is ever exposed or compromised, click **🔄 Roll Secret** to invalidate the old key and generate a fresh one immediately.

---

## 🛠️ 2. Setting Up an Alert on TradingView

1. On any TradingView chart, click the **Alert** button (or press `Alt + A`).
2. In the **Condition** dropdown, pick your indicator, strategy, or price level.
3. Switch to the **Notifications** tab in the alert dialog:
   - Check **Webhook URL**.
   - Paste your personal MOCHEX webhook URL:
     ```
     https://mochex.app/api/webhooks/tradingview?key=YOUR_SECRET
     ```
4. Switch to the **Settings** tab.
5. In the **Message** box, paste one of the JSON formats below.

---

## 📋 3. Supported Alert JSON Formats

### Format A: Watchlist Setup Alert (Default)
Adds a monitored setup to your active Watchlist with automated price tracking and directional safety rules:

```json
{
  "symbol": "{{ticker}}",
  "position": "long",
  "order_type": "limit",
  "trigger_price": {{close}},
  "entry_price": {{close}},
  "stop_loss": 62500,
  "take_profit": 68000,
  "notes": "4H EMA 200 Bullish Rebound"
}
```

#### Multi-Target Scaling (TP1, TP2, TP3):
```json
{
  "symbol": "{{ticker}}",
  "position": "long",
  "order_type": "limit",
  "trigger_price": {{close}},
  "entry_price": {{close}},
  "stop_loss": 62500,
  "tp1_price": 65000,
  "tp2_price": 67000,
  "tp3_price": 70000,
  "notes": "Multi-target breakout setup"
}
```

---

### Format B: Direct Trade Execution Alert (`"action": "trade"`)
Bypasses the Watchlist and logs directly as an active position alert on your [⚡ Trades](/trades) page:

```json
{
  "action": "trade",
  "symbol": "{{ticker}}",
  "side": "long",
  "order_type": "market",
  "entry_price": {{close}},
  "stop_loss": 62500,
  "take_profit": 68000,
  "leverage": 10,
  "margin_usd": 100,
  "notes": "SuperTrend Automated Strategy Execution"
}
```

---

### Format C: Quick PineScript Alert (Simplified)
```json
{
  "ticker": "{{ticker}}",
  "side": "buy",
  "price": {{close}},
  "sl": 62500,
  "tp": 68000,
  "notes": "PineScript 15m Momentum Alert"
}
```

---

## 🌲 4. PineScript Integration Example

Here is an example of sending alerts programmatically from a PineScript v5 indicator:

```pinescript
//@version=5
indicator("MOCHEX SuperTrend Alert", overlay=true)

[supertrend, direction] = ta.supertrend(3.0, 10)

buySignal  = ta.crossover(close, supertrend)
sellSignal = ta.crossunder(close, supertrend)

plot(supertrend, "SuperTrend", color = direction < 0 ? color.green : color.red)

// Construct MOCHEX alert JSON payloads
buyMessage = '{"symbol": "' + syminfo.ticker + '", "position": "long", "order_type": "limit", "trigger_price": ' + str.tostring(close) + ', "entry_price": ' + str.tostring(close) + ', "stop_loss": ' + str.tostring(close * 0.97) + ', "take_profit": ' + str.tostring(close * 1.06) + ', "notes": "SuperTrend Bullish Flip"}'

sellMessage = '{"symbol": "' + syminfo.ticker + '", "position": "short", "order_type": "limit", "trigger_price": ' + str.tostring(close) + ', "entry_price": ' + str.tostring(close) + ', "stop_loss": ' + str.tostring(close * 1.03) + ', "take_profit": ' + str.tostring(close * 0.94) + ', "notes": "SuperTrend Bearish Flip"}'

if buySignal
    alert(buyMessage, alert.freq_once_per_bar_close)

if sellSignal
    alert(sellMessage, alert.freq_once_per_bar_close)
```

---

## 🧠 5. Smart Normalizer Features

MOCHEX automatically normalizes diverse TradingView variables and exchange notations:

| TradingView Input | Normalized Output | Notes |
| :--- | :--- | :--- |
| `BINANCE:BTCUSDT.P` | `BTC_USDT` | Strips exchange prefix and `.P` perpetual contract suffix |
| `MEXC:SOL_USDT` | `SOL_USDT` | Strips `MEXC:` prefix |
| `ETHUSDT` | `ETH_USDT` | Appends underscore before `USDT` |
| `buy`, `call`, `long` | `long` | Position side normalized to `long` |
| `sell`, `put`, `short` | `short` | Position side normalized to `short` |

---

## 🔔 6. Multi-Channel Notification Fan-Out

Every ingested alert automatically triggers:
1. **In-App Notification**: Added to your unread bell notifications (`/notifications`).
2. **Discord Webhooks**: Broadcasts to all connected Discord channels (if enabled).
3. **Telegram Bots**: Dispatches to all configured Telegram channels and group chats (if enabled).
4. **Desktop Chime**: Triggers audio notification chime in open browser tabs.
