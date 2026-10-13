# ==========================================
# 阶段 1: 前端静态资源打包构建
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# 启用 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 优先复制依赖清单，最大化利用 Docker 构建缓存
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# 复制前端项目源代码
COPY . .

# 执行生产环境静态构建 (产物输出到 dist/)
RUN pnpm run build

# ==========================================
# 阶段 2: Nginx 生产运行与安全代理镜像
# ==========================================
FROM nginx:alpine

# 清理默认静态网页
RUN rm -rf /usr/share/nginx/html/*

# 复制前端编译打包产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露 HTTP 端口
EXPOSE 80

STOPSIGNAL SIGQUIT

CMD ["nginx", "-g", "daemon off;"]
