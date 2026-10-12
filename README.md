# 🚀 FreqUI (Trellis Workspace)

<p align="center">
  <img src="./public/favicon.svg" width="80" height="80" alt="FreqUI Logo" />
</p>

<p align="center">
  <strong>Next-Generation Trading Dashboard & Workspace for Freqtrade & NostalgiaForInfinity</strong>
</p>

<p align="center">
  Modern fractal workspace dashboard for <strong>Freqtrade</strong> bots · Desktop & Mobile Responsive · Encrypted Read-Only Sharing · Zero-Remount
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwindcss" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Charts-Lightweight--Charts-10b981" alt="Lightweight Charts" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker" alt="Docker Ready" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

<p align="center">
  <b>English</b> • <a href="./docs/README_CN.md">简体中文</a>
</p>

---

## 📖 Table of Contents

- [Key Features](#-key-features)
- [Quick Start](#-quick-start)
- [Configuration Guide (Freqtrade & CORS)](#-configuration-guide)
- [Deployment (Docker & Nginx)](#-deployment)
- [Read-Only Share Mode](#-read-only-share-mode)
- [Project Structure](#-project-structure)
- [FAQ & Troubleshooting](#-faq--troubleshooting)
- [License](#-license)

---

## 🌟 Key Features

### 1. 🧩 Trellis Fractal Docking Engine
- **Infinite Layout Flexibility**: Drag, split, dock, stack tabs, and float panels freely across the workspace.
- **Zero Remount Architecture**: WebGL / Canvas K-line charts and React states **never reload** during panel resizing, moving, or docking.
- **Persistent Workspace**: Window positions and sizes are automatically persisted to `localStorage` with a 1-click reset button.

### 2. 📱 Full Mobile Adaptation (Responsive UI)
- **Automatic Viewport Detection**: Switches seamlessly between desktop fractal workspace and a dedicated, mobile-optimized experience (< 768px).
- **Single-Hand Touch Navigation**: Bottom tab bar supporting iOS/Android safe areas (`100dvh`), fluid gestures (`touch-action: pan-y`).
- **Smooth Nested Scrolling**: Avoids viewport trapping, ensuring long lists and KPI summaries scroll naturally on smartphones.

### 3. 📊 Live Operations Dashboard (FreqUI Main Stage)
- **Real-Time KPI Cards**: Realized Profit (Closed PnL), Win Rate, Floating Unrealized PnL, Total Balance & Free Balance.
- **Active Trades Monitor**: Shows all open positions, open rates, current prices, live PnL, stakes, stoploss lines, strategy signal tags, and 1-click chart jump.
- **Daily Returns Distribution**: 10-day historical daily returns chart supporting **Logarithmic Scale** (balances extreme returns) & **Linear Scale** toggling.
- **Recent Closed Orders**: Reverse-chronological trade history with instantaneous manual sync.
- **Live Refresh Indicator**: 6-second countdown badge with auto-polling and manual trigger.

### 4. 📈 TradingView-Grade Candlestick Charts
- Built on top of TradingView's **Lightweight Charts v5**.
- Live candlestick streaming, volume bars, trade entry price markers, and real-time take-profit/stop-loss overlay.

### 5. 🎯 NostalgiaForInfinity (NFI) Signals Leaderboard
- Specially tailored for the **NostalgiaForInfinity (NFI)** strategy series (NFIX8, NFIX7, etc.).
- Categorizes signals (e.g. Signal 141, 145, 120, 103, 52) and ranks them by trade count, win rate, average profit, and total profit contribution.

### 6. 💱 Multi-Currency Valuation & Live FX Conversion
- Instantly switch display valuation between **USDT**, **USD**, **CNY (¥)**, and **EUR (€)**.
- Real-time bank exchange rate fetching with custom manual exchange rate override.

### 7. 🛡️ Encrypted Read-Only Sharing & Multi-Bot Management
- **AES-Encrypted Share Tokens**: Share bots via URL Hash (`#share=...`). The sensitive credentials are never sent to external servers and the URL is auto-sanitized after caching.
- **Hardened Read-Only Mode**: Danger operations (Force Exit, Start, Stop, Reload) and raw passwords are completely hidden and locked.
- **Multi-Bot Cumulative Switching**: Easily bookmark multiple bots and switch between them in the top navigation bar with custom bot aliases.
- **Universal Clipboard Fallback**: Fully compatible with non-HTTPS plain IP environments (`http://IP:PORT`), preventing browser `writeText` permission crashes.

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** >= 18.0.0
- **pnpm** (recommended) or **npm** / **yarn**

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/frequi-dashboard.git
cd frequi-dashboard/dashboard
pnpm install
```

### 2. Local Development Server
```bash
pnpm dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Production Build
```bash
pnpm build
```
The compiled static assets will be output to the `dist/` directory.

### 4. Lightweight Node.js Server
For servers without Nginx or Docker:
```bash
# Serves dist/ with built-in reverse proxy on port 5173
node server.js
```

---

## 🔌 Configuration Guide

### Connecting to your Freqtrade Bot

1. Open the dashboard in your browser.
2. If this is your first visit, the connection dialog will appear automatically. You can also click the bot selector in the top bar to **"Add / Connect Bot"**.
3. Enter your Freqtrade API information:
   - **Bot Alias**: Custom name (e.g., `NFIX8-Production`)
   - **Base URL**: Freqtrade API address (e.g., `http://127.0.0.1:8080` or `http://YOUR_SERVER_IP:8080`)
   - **API Username**: Freqtrade API username
   - **API Password**: Freqtrade API password
4. Click **"Save & Connect"**.

### ⚠️ Crucial: Configure Freqtrade CORS Settings

Freqtrade enforces cross-origin request validation. Since the dashboard runs on a different port or domain from the Freqtrade API, you **must** add the dashboard's URL to Freqtrade's `config.json`.

In your server's `user_data/config.json`:

```json
{
  "api_server": {
    "enabled": true,
    "listen_ip_address": "0.0.0.0",
    "listen_port": 8989,
    "verbosity": "info",
    "enable_openapi": false,
    "jwt_secret_key": "YOUR_SECRET_KEY",
    "CORS_origins": [
      "http://localhost:5173",
      "http://YOUR_SERVER_IP:3000",
      "http://YOUR_SERVER_IP:22222"
    ],
    "username": "your_username",
    "password": "your_password"
  }
}
```

> ⚠️ **Important**:
> - Each entry in `CORS_origins` must include the protocol (`http://` or `https://`) and port.
> - **Restart your Freqtrade bot** (`docker compose restart` or systemd) after editing `config.json`.

---

## 🚢 Deployment

### Option 1: Docker Compose (Recommended)

1. Review and adjust `docker-compose.yml` if needed (default mapped port is `3000`):
   ```yaml
   services:
     frequi-dashboard:
       build:
         context: .
         dockerfile: Dockerfile
       container_name: frequi-dashboard
       restart: unless-stopped
       ports:
         - "3000:80"
   ```

2. Build and launch:
   ```bash
   docker compose up -d --build
   ```

3. Access your dashboard at `http://<SERVER_IP>:3000`.

### Option 2: Traditional Nginx Deployment

1. Build locally or on the server:
   ```bash
   pnpm build
   ```
2. Upload the `dist/` directory contents to your server's web root (e.g., `/usr/share/nginx/html` or `/var/www/frequi`).
3. Use the included [`nginx.conf`](./nginx.conf) for production-grade Gzip compression, SPA client-side routing, and caching.

---

## 🔒 Read-Only Share Mode

FreqUI includes two complementary read-only sharing mechanisms:

### Method A: Client-Side Encrypted Token (Default & Instant)
- Click **"Generate Read-Only Share Link"** on the dashboard.
- The link format is: `http://YOUR_HOST/?share=eyJhbGciOi...#share`
- **Protection**:
  - Encrypted via client-side AES tokens.
  - Recipient's browser opens directly in **Read-Only Guest Mode**.
  - No Force Exit buttons, no bot start/stop controls, and credentials cannot be revealed.
  - The URL Hash is automatically cleaned after bookmarking to prevent browser history leaks.

### Method B: Server-Side Nginx Gateway Proxy (`/share-api/`)
- Configure [`nginx.conf`](./nginx.conf):
  ```nginx
  location /share-api/ {
      limit_except GET OPTIONS {
          deny all; # Physically blocks any POST/DELETE/PUT write operations
      }
      proxy_pass http://127.0.0.1:8989/api/v1/;
      proxy_set_header Authorization "Basic <BASE64_CREDENTIALS>";
  }
  ```
- Visitors navigate to `http://YOUR_HOST/?share=true`. Nginx injects credentials in the background. Visitors never see the credentials in their browser DevTools.

---

## 📂 Project Structure

```text
frequi-dashboard/
├── dist/                     # Compiled production assets
├── docs/                     # Project documentation
│   └── README_CN.md          # Chinese documentation (中文使用文档)
├── public/                   # Static assets & icons
├── src/
│   ├── api/                  # Freqtrade REST API client & Mock generator
│   │   ├── client.ts         # Universal API client with error handling & proxy
│   │   └── mockData.ts       # High-fidelity mock dataset
│   ├── components/           # Reusable UI widgets
│   │   ├── ConnectModal.tsx  # Bot connection modal
│   │   ├── EditBotModal.tsx  # Edit alias & credentials modal
│   │   ├── HeaderBar.tsx     # Top navigation bar with multi-bot switcher
│   │   ├── MobileWorkspace.tsx # Dedicated mobile container & bottom nav
│   │   └── SignalBadge.tsx   # Strategy signal tag badge
│   ├── context/              # Global state management
│   │   └── BotContext.tsx    # Multi-bot profiles, polling loop & persistence
│   ├── i18n/                 # Localization dictionaries & LocaleContext
│   ├── utils/                # Utilities
│   │   ├── clipboard.ts      # HTTP plain-IP compatible clipboard fallback
│   │   ├── dateUtils.ts      # UTC+8 (Beijing Time) date/time formatter
│   │   ├── nfiSignals.ts     # NFI strategy signal parser & stats
│   │   └── shareCrypto.ts    # Symmetric encryption for URL share tokens
│   ├── views/                # Modular Trellis view panels
│   │   ├── ActiveTradesView.tsx    # Live open trades
│   │   ├── BotControlView.tsx      # Bot controls, whitelist & specs
│   │   ├── BotLogsView.tsx         # Real-time console logs
│   │   ├── BotSelectView.tsx       # Multi-bot selection card list
│   │   ├── CandleChartView.tsx     # Lightweight Charts candlestick view
│   │   ├── ClosedTradesView.tsx    # Historical closed orders
│   │   ├── EquityCurveView.tsx     # Cumulative portfolio equity curve
│   │   ├── FreqUIDashboardView.tsx # Main operations stage (KPI, Chart, Trades)
│   │   ├── LoginGateView.tsx       # Initial login & bot onboarding gate
│   │   └── SignalsView.tsx         # Strategy signals leaderboard
│   ├── App.tsx               # Trellis workspace initialization & viewport switch
│   ├── index.css             # Tailwind CSS & Trellis theme styling
│   └── main.tsx              # Application entry point
├── docker-compose.yml        # Docker compose production setup
├── Dockerfile                # Multi-stage Docker build file
├── nginx.conf                # Production Nginx reverse proxy configuration
├── server.js                 # Standalone Node.js server with /api-proxy
└── vite.config.ts            # Vite & Tailwind configuration
```

---

## ❓ FAQ & Troubleshooting

### Q1: "Disallowed CORS origin" or "Failed to fetch"
- **Cause**: Freqtrade rejected requests from your dashboard's IP/port.
- **Fix**: Open Freqtrade's `config.json`, add your dashboard origin (e.g., `"http://YOUR_SERVER_IP:3000"`) to `"api_server.CORS_origins"`, and restart the bot.

### Q2: "Cannot read properties of undefined (reading 'writeText')"
- **Cause**: Modern browsers disable `navigator.clipboard` on insecure HTTP non-localhost origins.
- **Status**: **Fixed**. FreqUI includes an automatic `textarea + execCommand('copy')` fallback in `src/utils/clipboard.ts`.

### Q3: How to view multiple bots simultaneously?
- Click the bot name pill in the top header bar, click **"Add / Connect Bot"** or open a share link.
- Both bots will be saved in your local workspace. Switch between them instantly from the top dropdown.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE). Feel free to customize, extend, and submit Pull Requests!
