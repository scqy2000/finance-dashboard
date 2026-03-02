# Contributing Guide

感谢你愿意为 `finance-dashboard` 做贡献。

本项目目前以中文文档和中文 UI 为主，欢迎以 Issue/PR 方式参与功能改进、bug 修复、文档完善。

---

## 开始之前

- 先查看 `README.md` 了解项目结构与启动方式。
- 新功能建议先提 Issue 讨论，避免重复实现。
- 若是紧急修复（明显 bug），可直接提 PR，并在描述中说明复现与修复思路。

---

## 开发环境

- Node.js 18+
- npm 9+
- Rust 1.77+
- Tauri v2 前置依赖

安装依赖：

```bash
npm install
```

启动开发：

```bash
npm run dev
```

---

## 分支与提交建议

建议分支命名：

- `feat/<short-name>`
- `fix/<short-name>`
- `docs/<short-name>`
- `refactor/<short-name>`

建议提交信息（Conventional Commits 风格）：

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `refactor: ...`
- `chore: ...`

---

## 提交前检查

请至少确保以下命令通过：

```bash
npm run build:fe
cargo check --manifest-path src-tauri/Cargo.toml
```

如果你修改了导入导出、分期、筛选、AI 配置相关逻辑，建议补充手动验证步骤并写在 PR 描述中。

---

## PR 规范

请在 PR 描述中尽量包含：

1. 变更背景（为什么做）
2. 变更内容（做了什么）
3. 影响范围（前端/后端/数据库/配置）
4. 验证方式（命令输出或手动步骤）
5. 若涉及 UI，附截图（建议放到 `docs/images/`）

---

## 代码风格建议

- 优先遵循现有代码风格和命名习惯。
- 不引入与当前架构冲突的大改动（除非先讨论达成共识）。
- 避免一次 PR 混入无关改动。
- 敏感信息（API Key、数据库文件等）禁止提交到仓库。

---

## 文档贡献

文档改进同样非常欢迎：

- README 完善
- FAQ 补充
- 示例数据与截图补充
- 多语言文档（如中英双语）

谢谢你的贡献。
