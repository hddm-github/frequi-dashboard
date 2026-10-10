# FreqUI 生产部署与只读安全分享指南

本项目支持一键打包装入 Docker Nginx 容器，具备**生产级静态压缩**与**服务器端只读免密安全反向代理**。

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

## 二、只读分享模式：如何实现“访客看不到密码，但能看盘”？

### 1. 原理
* **密码不存放在前端，也不存放在浏览器中**：通过服务器 Nginx 的反向代理在内网转发时自动注入 `Authorization: Basic xxx`。
* **物理防平仓/防修改**：Nginx 的 `/share-api/` 端点配置了 `limit_except GET { deny all; }`，从网关层面彻底封死所有 `POST` / `DELETE` 写入操作。

### 2. 配置步骤

编辑 [`nginx.conf`](./nginx.conf) 中的 `/share-api/` 段落：

1. **设置后端地址**：
   将 `proxy_pass http://127.0.0.1:8080/api/v1/;` 改为你的 Freqtrade 机器人真实内网 API 地址。

2. **生成 Basic Auth 密钥**：
   假设你的 Freqtrade 用户名为 `freqtrade`，密码为 `mypassword`，在终端运行命令计算 base64：
   ```bash
   echo -n "freqtrade:mypassword" | base64
   # 输出例如: ZnJlcXRyYWRlOm15cGFzc3dvcmQ=
   ```

3. **填入 nginx.conf**：
   ```nginx
   proxy_set_header Authorization "Basic ZnJlcXRyYWRlOm15cGFzc3dvcmQ=";
   ```

4. **重载容器**：
   ```bash
   docker compose restart
   ```

5. **生成分享链接发送给朋友**：
   ```
   http://<你的服务器域名或IP>:3000/?share=true
   ```
   访客打开后，无需输入任何密码，直接进入「🛡️ 实盘观摩只读」模式，界面隐藏平仓按钮、隐藏启停按钮，且在网络请求中绝对看不到你的真实密码！
