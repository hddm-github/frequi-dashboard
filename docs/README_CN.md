# 🚀 FreqUI (Trellis Workspace)

<p align="center">
  <img src="../public/favicon.svg" width="80" height="80" alt="FreqUI Logo" />
</p>

<p align="center">
  <strong>专为 Freqtrade 量化交易机器人打造的现代分形工作区看板</strong>
</p>

<p align="center">
  全面适配桌面与手机端 · 加密只读分享 · 永不重载
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
  <a href="../README.md">English</a> • <b>简体中文</b>
</p>

---

## 📖 目录

- [核心功能特性](#-核心功能特性)
- [快速启动与运行](#-快速启动与运行)
- [机器人配置与跨域 (CORS) 设置](#-机器人配置与跨域-cors-设置)
- [生产部署 (Docker 与 Nginx)](#-生产部署-docker-与-nginx)
- [加密防窥只读分享机制](#-加密防窥只读分享机制)
- [项目工程结构](#-项目工程结构)
- [常见问题与排错指南](#-常见问题与排错指南)
- [开源协议](#-开源协议)

---

## 🌟 核心功能特性

### 1. 🧩 Trellis 分形停靠引擎 (桌面端)
- **极致自由的工作区布局**：任意拖拽、切分、停靠、多标签合并与浮动多窗口。
- **状态与图表永不重载 (Zero Remount)**：在移动、拖拽和切分窗口的过程中，Canvas K 线图表和 React 组件状态完全保留，无闪烁。
- **布局自动持久化**：所有窗口位置与尺寸自动记忆在本地 `localStorage`，支持一键还原默认布局。

### 2. 📱 全面适配移动端 (手机版原生体验)
- **智能视口自适应**：屏幕宽度 `< 768px` 自动无缝切换为针对触控优化的移动版界面。
- **单手便捷底部导航**：原生 App 级底部快捷导航栏，全面适配刘海屏及底部安全区（`100dvh`），手势滑动丝滑自然（`touch-action: pan-y`）。
- **多功能抽屉菜单**：快速在主看板、K 线行情、持仓监控、运行日志、收益曲线与策略榜单之间一键切换。

### 3. 📊 FreqUI 主运行监控看板 (核心大盘)
- **四大核心 KPI 卡片**：已结收益（已结金额与收益率）、整体胜率（胜/负笔数）、当前浮动盈亏（实时动态更新）、账户总余额（可用余额与单仓模式）。
- **当前持仓交易全景表**：实时展示所有持仓交易对、开仓价、现价、浮盈金额与比例、仓位大小、止损线、入场策略信号标签，支持一键在 K 线中查看。
- **近 10 日收益走势图**：
  - 支持 **Log 对数模式**（平衡大小极端收益，小额柱形依然清晰）与 **线性模式** 一键快速切换；
  - 柱状图悬浮展示单日盈亏金额与笔数，统计 10 日胜负天数分布。
- **最近已平仓订单列表**：严格倒序排列最新成交流水，支持手动一键同步最新记录。
- **6 秒实时刷新倒计时**：顶部带实时秒数倒计时徽章，支持自动轮询与手动即时刷新。

### 4. 📈 TradingView 级轻量 K 线行情
- 基于 TradingView 原生开源 **Lightweight Charts v5** 构建。
- 支持实时 K 线走势、成交量柱状图，自动绘制开仓价水平线、止盈止损点位标记。

### 5. 🎯 NFI 策略信号专属排行榜
- 专为 **NostalgiaForInfinity** 系列策略（X8、X7 等）深度定制。
- 对策略核心买入信号（如 141、145、120、103、52 等）进行胜率分析、触发频次统计、单笔均益与总收益贡献排行榜展示。

### 6. 💱 多币种计价展示与即时汇率折算
- 支持在 **USDT**、**USD**、**CNY (人民币 ¥)**、**EUR (欧元 €)** 之间一键切换。
- 自动获取银行最新外汇汇率，同时贴心支持点击手动自定义汇率。

### 7. 🛡️ 安全加密只读分享与隐私保护
- **AES 前端对称加密分享**：通过 URL Hash (`#share=...`) 分享，无需通过任何第三方服务器，链接打开后自动净化 URL，杜绝浏览器历史记录泄露。
- **严格只读保护**：访客模式下彻底隐藏平仓按钮、控制台、启停开关与原始连接密码。
- **多机器人累加管理**：接收多个分享链接可无缝在本地保存多个机器人，顶部下拉菜单自由切换，支持自定义修改备注名。
- **纯 HTTP 剪贴板降级机制**：在纯 IP（无 HTTPS 域名）环境下点击生成分享链接，自动降级为虚拟元素复制，完美规避现代浏览器安全拦截报错。

---

## ⚡ 快速启动与运行

### 环境准备
- **Node.js** >= 18.0.0
- **pnpm** (推荐) 或 **npm** / **yarn**

### 1. 克隆项目并安装依赖
```bash
git clone https://github.com/your-username/frequi-dashboard.git
cd frequi-dashboard
pnpm install
```

### 2. 启动本地开发服务
```bash
pnpm dev
```
启动后在浏览器打开终端提示的地址（默认为 `http://localhost:5173`）即可使用。

### 3. 本地编译打包
```bash
pnpm build
```
编译成功后，产物将生成在 `dist/` 目录下。

### 4. 轻量 Node.js 服务托管
对于未安装 Docker 或 Nginx 的轻量服务器，可直接使用内置脚本托管：
```bash
node server.js
```
内置自带 `/api-proxy` 中转代理，彻底消除跨域限制。

---

## 🔌 机器人配置与跨域 (CORS) 设置

### 连接 Freqtrade 机器人

1. 浏览器打开看板页面；
2. 首次进入将弹出连接引导，或点击顶部机器人菜单选择 **「添加 / 连接新机器人」**；
3. 输入你的 Freqtrade 配置：
   - **机器人备注名**：自定义别名（例如 `NFIX8-实盘1号`）
   - **API 节点地址**：Freqtrade 访问地址（例如 `http://127.0.0.1:8080` 或 `http://你的服务器IP:8080`）
   - **API 账号**：Freqtrade 的 username
   - **API 密码**：Freqtrade 的 password
4. 点击 **「保存并连接」**。

### ⚠️ 关键步骤：在 Freqtrade 中开放跨域白名单 (CORS)

因为看板前端与 Freqtrade API 处于不同端口或域名，浏览器的跨域安全策略会发起 OPTIONS 预检请求。**必须在服务器的 Freqtrade `config.json` 中配置白名单**。

打开服务器上的 `user_data/config.json`，在 `api_server` 中添加你的看板访问地址：

```json
{
  "api_server": {
    "enabled": true,
    "listen_ip_address": "0.0.0.0",
    "listen_port": 8989,
    "verbosity": "info",
    "enable_openapi": false,
    "jwt_secret_key": "你的密钥",
    "CORS_origins": [
      "http://localhost:5173",
      "http://你的服务器IP:3000",
      "http://你的服务器IP:22222"
    ],
    "username": "你的账号",
    "password": "你的密码"
  }
}
```

> ⚠️ **注意**：
> 1. `"CORS_origins"` 列表中的地址必须带完整的 `http://` 或 `https://` 以及端口号；
> 2. 保存配置后，**必须重启 Freqtrade 机器人**（如 `docker compose restart`）生效。

---

## 🚢 生产部署 (Docker 与 Nginx)

### 方式一：Docker Compose 一键部署 (推荐)

项目内已包含生产就绪的 `Dockerfile` 与 `docker-compose.yml`：

1. 按需修改 `docker-compose.yml` 中的映射端口（默认映射为宿主机的 3000 端口）：
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

2. 在项目目录下启动容器：
   ```bash
   docker compose up -d --build
   ```

3. 访问 `http://<服务器IP>:3000` 即可开始使用。

### 方式二：传统 Nginx 静态文件部署

1. 在本地或编译服务器执行打包：
   ```bash
   pnpm build
   ```
2. 将生成的 `dist/` 目录上传替换服务器上的 Nginx 静态目录（如 `/usr/share/nginx/html`）。
3. 参考项目中的 [`nginx.conf`](../nginx.conf) 配置 SPA 路由支持与静态资源强缓存。

---

## 🔒 加密防窥只读分享机制

FreqUI 提供了两种互补的只读分享方案：

### 方案 1：前端一键生成加密只读链接（最方便，零服务器门槛）
- 在看板底部或顶部点击 **「生成只读分享链接」**；
- 链接格式为 `http://你的看板地址/?share=eyJhbGci...#share`；
- **安全保障**：
  - 凭据经由 AES 算法加密；
  - 访客打开后自动进入「实盘观摩只读」模式，隐藏所有操作平仓按钮，敏感密码被完全擦除保护；
  - 打开后即时净化 URL，浏览器历史记录不留底；
  - 访客可将该机器人保存至其本地浏览器，并随时给不同机器人添加自定义备注名。

### 方案 2：服务器网关级 Nginx 安全反向代理 (`/share-api/`)
- 在 [`nginx.conf`](../nginx.conf) 中配置只读反向代理：
  ```nginx
  location /share-api/ {
      limit_except GET OPTIONS {
          deny all; # 网关层面彻底拦截除 GET 外的所有写请求，杜绝平仓
      }
      proxy_pass http://127.0.0.1:8989/api/v1/;
      proxy_set_header Authorization "Basic <BASE64凭据>";
  }
  ```
- 访客直接访问 `http://你的域名/?share=true`，完全免输密码，且在浏览器 DevTools 中完全看不到真实账密。

---

## 📂 项目工程结构

```text
frequi-dashboard/
├── dist/                     # 生产打包产物
├── docs/                     # 项目文档
│   └── README_CN.md          # 中文使用文档
├── public/                   # 静态文件与图标
├── src/
│   ├── api/                  # Freqtrade REST API 客户端与 Mock 数据
│   │   ├── client.ts         # 通用 API 请求客户端与智能地址补全
│   │   └── mockData.ts       # 高保真 Mock 演示数据
│   ├── components/           # 通用可复用组件
│   │   ├── ConnectModal.tsx  # 新增机器人连接弹窗
│   │   ├── EditBotModal.tsx  # 编辑机器人别名与连接配置
│   │   ├── HeaderBar.tsx     # 顶部状态栏与多机器人切换菜单
│   │   ├── MobileWorkspace.tsx # 移动端专用视口容器与底部导航
│   │   └── SignalBadge.tsx   # 策略入场信号徽章
│   ├── context/              # 全局 React 状态上下文
│   │   └── BotContext.tsx    # 机器人配置管理、数据自动轮询与持久化
│   ├── i18n/                 # 国际化语言包与上下文
│   ├── utils/                # 辅助工具库
│   │   ├── clipboard.ts      # HTTP 纯 IP 剪贴板降级复制兼容
│   │   ├── dateUtils.ts      # UTC+8 (北京时间) 统一时间格式化
│   │   ├── nfiSignals.ts     # NFI 策略信号解析与贡献榜算法
│   │   └── shareCrypto.ts    # 分享 Token 对称加密与解密工具
│   ├── views/                # 模块化 Trellis 视图面板
│   │   ├── ActiveTradesView.tsx    # 活跃持仓监控面板
│   │   ├── BotControlView.tsx      # 机器人控制台与策略环境参数
│   │   ├── BotLogsView.tsx         # 机器人实时控制台运行日志
│   │   ├── BotSelectView.tsx       # 机器人列表管理卡片视图
│   │   ├── CandleChartView.tsx     # Lightweight Charts K线图表面板
│   │   ├── ClosedTradesView.tsx    # 历史成交平仓流水记录
│   │   ├── EquityCurveView.tsx     # 累计资金净值资产收益曲线
│   │   ├── FreqUIDashboardView.tsx # 主运行看板 (KPI、收益走势、持仓表)
│   │   ├── LoginGateView.tsx       # 初次登录与引导页
│   │   └── SignalsView.tsx         # 策略信号排行榜面板
│   ├── App.tsx               # 工作区注册与桌面/移动端动态视口分流
│   ├── index.css             # 全局样式与 Trellis 深浅主题变量
│   └── main.tsx              # 应用根入口
├── docker-compose.yml        # Docker Compose 生产容器编排文件
├── Dockerfile                # 多阶段构建 Dockerfile
├── nginx.conf                # 生产环境 Nginx 反向代理配置
├── server.js                 # 独立 Node.js 托管与代理服务
└── vite.config.ts            # Vite 构建配置
```

---

## ❓ 常见问题与排错指南

### 1. 控制台报错 `Disallowed CORS origin` 或 `Failed to fetch`
- **原因**：Freqtrade 拒绝了来自你当前看板地址的跨域请求。
- **解决**：在服务器的 Freqtrade `config.json` 中，找到 `api_server.CORS_origins`，加入你的看板实际访问地址（例如 `"http://你的服务器IP:3000"`），保存后**重启机器人进程**。

### 2. 点击复制只读链接报错 `writeText of undefined`
- **原因**：现代浏览器出于安全策略，仅允许在 HTTPS 域名或 localhost 环境下使用原生 `navigator.clipboard`。
- **解决**：本项目在 `src/utils/clipboard.ts` 中封装了自动降级兼容方案，在纯 HTTP IP 环境下会自动降级为虚拟元素复制，现已全面支持一键复制。

### 3. 持仓较多时页面如何浏览？
- 看板外层采用平滑垂直滚动容器。当市场出现较多开仓时，持仓列表会完整展示，向下滚动即可自然查看近 10 日收益走势图、平仓流水与货币切换栏，元素之间绝不会重叠。

---

## 📄 开源协议

本项目基于 [MIT License](../LICENSE) 开源发布。欢迎自由修改、定制与提交 Pull Request！
