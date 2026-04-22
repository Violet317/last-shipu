# 测试报告

## 自动化测试
- 单元测试：`npm test`
- 覆盖率：`npm run coverage`（覆盖范围：食材库/快捷键/创作链路相关的核心 API/Store 与基础工具）
- 端到端测试（H5）：`npm run e2e`

## 覆盖目标
- 覆盖率阈值：Lines/Statements/Functions ≥ 90%，Branches ≥ 75%（按 `vitest.config.ts` 的 coverage include 统计）

## 真机适配（人工）
- iOS/Android 真机需人工执行：安装 App 产物后，逐页检查布局、点击区域、输入框与弹窗交互

## 性能（人工/抽样）
- 建议在 H5 DevTools 与 App 真机上抽样验证：首屏加载、列表滚动流畅度、快捷键响应

## 备注
- 端到端测试默认使用系统浏览器通道 `msedge`（见 `playwright.config.ts`），避免依赖下载 Playwright 内置浏览器。
