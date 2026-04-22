# 上线检查清单

## 配置
- `src/api/config.ts` 已设置正确的 `baseUrl`
- 后端接口路径与 [API.md](file:///d:/last_shipu/frontend/app/API.md) 一致（均以 `/api` 开头）

## 功能回归
- 底部导航栏图标在浅色/深色模式可见，切换 Tab 无异常
- 「食材库」可选择食材与厨具，点击“开始创作”能带入「创作」页
- 「创作」页快捷键模板可点击填充输入框
- 「设置」页可新增/编辑/删除/排序快捷键模板，操作有二次确认与 toast

## 测试
- `npm run typecheck` 通过
- `npm test` 与 `npm run coverage` 通过
- `npm run e2e` 通过

## 真机
- iOS/Android 主流机型：检查布局溢出、点击死角、输入法遮挡、弹窗可操作

