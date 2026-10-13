# FreqUI 生产部署与只读分享指南

本项目支持一键打包装入 Docker Nginx 容器，具备**生产级静态压缩**与
**同源标准 Freqtrade API 反向代理**。

---

## 一、一键启动 Docker 容器

在服务器的 `dashboard` 目录下直接执行：

```bash
docker compose up -d --build
```

容器启动后，直接访问服务器 IP 即可查看看板：

```
http://<服务器IP>:3000/
```

---

## 二、连接机器人：服务地址怎么填

看板支持任意数量的机器人，「服务地址」按你的部署方式填写即可：

| 场景 | 服务地址填写 | 说明 |
|---|---|---|
| 机器人与看板在**同一台服务器、共用同一反向代理** | `/` | 看板在自身域名下调用标准 `/api/v1`（推荐） |
| 机器人在**独立域名**（子域名） | `https://bot1.example.com` | 自动补全为 `.../api/v1` |
| 机器人在**同一域名下的子路径** | `https://freq.example.com/bot1` | 由反向代理把该子路径转发到对应机器人 |
| 直连机器人 API 端口 | `http://203.0.113.10:8081` | 自动补全为 `.../api/v1` |

**多机器人**：每个机器人一条记录，分别填写各自的地址即可，例如
`https://bot1.example.com`、`https://bot2.example.com`。

> 远程机器人（不同域名/主机）需在该机器人的 `api_server.CORS_origins` 中加入
> 看板地址；同源 `/` 与同主机子路径**无需** CORS。

---

## 三、只读分享模式：如何实现"访客看不到密码，但能看盘"？

### 1. 原理
* **密码不存放在前端，也不存放在浏览器中**：由 Nginx 反向代理在内网转发，
  访客请求不携带真实账密。
* **物理防平仓/防修改**：在同源 API 网关 `location /api/v1/` 上配置
  `limit_except GET OPTIONS { deny all; }`，从网关层面彻底封死所有
  `POST` / `DELETE` 写入操作。

### 2. 配置步骤

编辑 [`nginx.conf`](./nginx.conf) 中的 `location /api/v1/` 段落：

1. **确认后端地址**：
   将 `upstream freqtrade_backend { server ft-futures-bot:8081; }` 指向你的
   Freqtrade 机器人真实内网地址（容器名:端口）。

2. **加上只读守卫**：

   ```nginx
   location /api/v1/ {
       limit_except GET OPTIONS {
           deny all; # 网关层面彻底拦截除 GET 外的所有写请求，杜绝平仓
       }
       proxy_pass http://freqtrade_backend;
       # ... 保留原有的 proxy_set_header 配置 ...
   }
   ```

3. **重载容器**：

   ```bash
   docker compose restart
   ```

4. **访客访问**：

   - 在看板中新增机器人，服务地址填 `/`（同源，标准 `/api/v1`）；
   - 或直接打开分享链接：`http://<你的域名或IP>:3000/?share=true`。

   访客打开后无需输入密码，直接进入「🛡️ 实盘观摩只读」模式，界面隐藏平仓、
   启停按钮；且写接口在网关层被彻底拦截，浏览器中也完全看不到真实账密。
