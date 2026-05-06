# 前后端字段命名规范

## 1. 总则
- 统一使用 camelCase（驼峰）。
- 后端请求/响应 JSON、前端 TypeScript DTO、数据库字段映射（如有）都必须按该规范对外保持一致。
- 任何新增接口必须先定义 DTO（字段名与类型），再实现。

## 2. 命名规则

### 2.1 基础字段
- 用户名：`userName`
- 密码：`password`
- 邮箱：`email`
- 验证码：`code`

### 2.2 Token 与鉴权
- Access Token：`accessToken`
- Refresh Token：`refreshToken`
- Token 过期时间（毫秒）：`expiresAtMs`

### 2.3 时间与时间戳
- 统一使用毫秒时间戳：`xxxAtMs`
  - `createdAtMs`
  - `updatedAtMs`

### 2.4 布尔值
- 优先使用形容词/状态词：`enabled`、`checked`、`loading`
- 若需要强调“是否”：`isAuthed`、`hasMore`

## 3. 禁止事项
- 禁止同一接口混用 `snake_case` 与 `camelCase`
- 禁止同一含义出现多个字段名（例如 `passWord`、`pwd`、`password` 混用）
- 禁止前端“猜字段名”；字段变更必须同步更新 DTO 与文档

## 4. 兼容与演进
- 如需兼容旧字段名，必须在文档标注 deprecated，并给出移除版本或移除条件。
- 兼容期过后，后端应移除旧字段支持，避免永久背负兼容成本。

