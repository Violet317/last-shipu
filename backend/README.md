# Backend

## 启动（本地开发）

在 [backend](file:///d:/last_shipu/backend) 目录执行：

1) 安装依赖

```bash
npm install
```

2) 配置环境变量

复制一份示例文件：

```bash
cp .env.example .env
```

编辑 `backend/.env`，最少需要填：
- `DATABASE_URL`（SQLite 文件路径）
- `JWT_SECRET`（至少 16 位）
- `OCR_PROVIDER` / `LLM_PROVIDER`（`mock` 或 `zhipu`）
- 若使用智谱：`ZHIPU_API_KEY`

3) 初始化数据库（首次或改了 Prisma schema 后）

```bash
npx prisma migrate dev
```

4) 启动

```bash
npm run dev
```

## 验证是否启动成功

- 打开 `http://127.0.0.1:8787/`：返回服务信息（不再是 404）
- 打开 `http://127.0.0.1:8787/health`：返回 `code === "0"`

## 前端联调

前端通过环境变量指定后端地址（H5 / 本地调试）：

- `VITE_API_BASE_URL=http://127.0.0.1:8787`

前端读取位置：
- [frontend/app/src/api/config.ts](file:///d:/last_shipu/frontend/app/src/api/config.ts)

## Auth DTO（字段名一锤定音）

统一响应包裹：

```json
{ "code": "0", "message": "ok", "data": {} }
```

### POST /api/auth/code

Request（camelCase）：

```json
{ "email": "user@example.com" }
```

Response：

```json
{ "code": "0", "message": "ok", "data": { "sent": true } }
```

### POST /api/auth/login

Request（camelCase）：

```json
{ "email": "user@example.com", "code": "123456" }
```

Response（tokens）：

```json
{
  "code": "0",
  "message": "ok",
  "data": {
    "accessToken": "…",
    "refreshToken": "…",
    "expiresAtMs": 1730000000000
  }
}
```

### POST /api/auth/refresh

Request（camelCase）：

```json
{ "refreshToken": "…" }
```

Response（tokens，同 login）：

```json
{
  "code": "0",
  "message": "ok",
  "data": {
    "accessToken": "…",
    "refreshToken": "…",
    "expiresAtMs": 1730000000000
  }
}
```

### POST /api/auth/guest

Request：
- 建议传空 JSON：`{}`
- 必须带 `Content-Type: application/json`

Response（tokens，同 login）：

```json
{
  "code": "0",
  "message": "ok",
  "data": {
    "accessToken": "…",
    "refreshToken": "…",
    "expiresAtMs": 1730000000000
  }
}
```

## 常见问题

### 1) 浏览器打开后端是 404

- 以前根路径 `/` 没有注册会 404；现在根路径已返回提示信息。
- 正确的健康检查地址是 `/health`，业务接口都在 `/api/*`。

### 2) 前端请求后端接口 404

通常是：
- 后端没有启动（或端口不对）
- 前端没有设置 `VITE_API_BASE_URL` 或设置成了错误地址

### 3) Prisma 出现 EPERM / 文件被占用（Windows）

一般是后端 dev server 正在运行导致 Prisma 引擎文件被占用：
- 先停止 `npm run dev`
- 再执行 `npx prisma generate` / `npx prisma migrate dev`
