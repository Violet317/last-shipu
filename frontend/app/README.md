# AI 食谱（UniApp + Vue3）

## 环境
- Node.js 18+

## 安装
```bash
cd d:/last_shipu/frontend/app
npm install
```

## 开发
```bash
npm run dev:h5
```

## 构建
```bash
npm run build:h5
```

## 校验
```bash
npm run typecheck
npm test
```

## 接口对接
- 所有前端预留接口统一以 `/api` 开头（见 [API.md](./API.md)）
- 当前请求封装基于 `uni.request`，入口在 `src/api/client.ts`
- 后端接入时可在 `src/api/config.ts` 配置 `baseUrl`（示例：`https://example.com`）

