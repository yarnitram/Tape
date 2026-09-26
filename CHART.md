# MOCHEX — Interactive Candlestick Chart & Technical Analysis Station

The MOCHEX chart station is a high-performance technical analysis workspace integrated into both the **Watchlist Modal** and the dedicated **Full-Screen Chart Workspace** (`/chart/[symbol]`). Powered by TradingView's `lightweight-charts`, it streams live **MEXC USDT-Perpetual Futures** kline candlesticks with trade plan overlays, multi-period EMAs, candle timers, chart snapshots, and professional drawing tools.

---

## 🚀 Key Features

### 1. Multi-Period Exponential Moving Averages (EMAs)
- **User-Specified Styling & Progressive Thickness**:
  - **EMA 20**: Pure White (`#ffffff`), line width `1` (thin momentum line).
  - **EMA 50**: Electric Blue (`#3b82f6`), line width `2` (medium trend support line).
  - **EMA 100**: Vibrant Yellow (`#eab308`), line width `3` (thick structural line).
  - **EMA 200**: Fiery Orange (`#f97316`), line width `4` (thickest macro regime benchmark).
- **Fast Client-Side Calculation**: Mathematically computed on candle close prices using the standard recursive formula ($k = 2 / (N + 1)$).
- **Independent Quick-Toggle Buttons**: `[20] [50] [100] [200]` in the header toolbar to toggle individual EMAs on or off with instant visual feedback and zero chart re-renders.

### 2. Live Candle Close Countdown Timer
- **Real-Time Ticker**: Displays a glowing badge (`⏱️ 04:32`) in the chart header next to the active market price.
- **Dynamic Interval Support**: Ticks every second based on the active timeframe (`1m`, `5m`, `15m`, `1h`, `4h`, `1d`), ensuring disciplined trade execution at candle close confirmations.

### 3. 1-Click Chart Snapshot (PNG Camera Export)
- **High-Resolution Export**: Click the camera icon (`📸`) in the action bar to capture the chart canvas, candles, EMAs, setup overlays, and active drawings.
- **Branded File Naming**: Automatically downloads as `MOCHEX_{SYMBOL}_{INTERVAL}_{TIMESTAMP}.png` for easy sharing on social media, Telegram, Discord, or trade journals.

### 4. Advanced TradingView Drawing & Planning Tools
- **Fibonacci Retracement (`🌀 Fib`)**: Click Swing High and Swing Low to project key retracement levels (`0.0`, `0.236`, `0.382`, `0.5`, `0.618` "Golden Pocket", `0.786`, `1.0`) with price labels and interactive endpoint handles.
- **Long / Short Risk-to-Reward Position Box (`⚖️ R:R`)**: Generates visual Target (Green) and Stop (Red) zones with live calculated R:R ratio badge (e.g. `R:R 2.50`). Interactive handles allow dragging TP, SL, Entry, and time range.
- **Angled Trendline (`📏 Trend`)**: Two-point angled support/resistance line with 2 endpoint drag handles.
- **Horizontal Support/Resistance Ray (`⚡ Ray`)**: Click anywhere to drop an infinite horizontal price line with a right-edge price badge and vertical drag handle.
- **Support & Resistance Rectangle Zones (`⬛ Rect`)**: Two-point rectangular zone with 4 corner resize handles.
- **Multi-Point Path (`✏️ Path`)**: Draw wave counts, trend trajectories, and multi-point paths with individual vertex handles.

### 5. In-Chart Selection, Dragging, & Future Projections
- **Future Coordinate Projection**: Uses `coordinateToLogical` and `logicalToCoordinate` extrapolation, allowing drawings to extend freely into the future (past the current price candle) without clipping.
- **Click to Select**: In Pan/Select mode, click any drawn shape to display interactive resize handles.
- **Drag-to-Move**: Drag the body of any selected shape to reposition it smoothly across time and price.
- **Floating Quick-Action Toolbar**: Appears when selecting any shape; includes color swatches (Violet, Cyan, Emerald, Rose, Amber), duplicate button, delete button, and keyboard shortcuts (`Delete`/`Backspace` to delete, `Escape` to deselect).

### 6. Modal Zoom & Dedicated Page Workspace
- **Watchlist Modal Zoom**: Integrated `ResizeObserver` ensures the chart canvas smoothly resizes both horizontally and vertically when toggling between standard and maximized modal sizes (`96vw × 94vh`).
- **Dedicated Chart Page (`/chart/[symbol]`)**: Full-width container (`max-w-screen-2xl`) with an expansive `700px` height and 24h market stats grid (Last Price, 24h Change, High, Low, Funding Rate, Volume).

---

## 📐 Supported Technical Indicators & Timeframes

| Feature | Values / Styling | Behavior |
|---|---|---|
| **Candlestick Timeframes** | `1m`, `5m`, `15m`, `1h`, `4h`, `1d` | Auto-refresh every 10s via MEXC proxy |
| **EMA 20** | `#ffffff`, width 1 | Fast momentum / pullback trigger |
| **EMA 50** | `#3b82f6`, width 2 | Intermediate trend support |
| **EMA 100** | `#eab308`, width 3 | Structural medium-term baseline |
| **EMA 200** | `#f97316`, width 4 | Macro bull/bear regime filter |
| **Trade Setup Overlay** | Trigger (Amber), Entry (Violet), SL (Rose), TP (Emerald) | Visual order level lines with % gain/loss |
| **Countdown Timer** | Format: `MM:SS` (or `Hh Mm Ss`) | Ticks every 1,000ms until bar close |
| **Snapshot Export** | Format: PNG (2x pixel ratio) | Exports via `html-to-image` |
