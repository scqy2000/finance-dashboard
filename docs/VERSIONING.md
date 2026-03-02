# 版本号与发布规则

本文档定义 `finance-dashboard` 的版本号策略和发布流程，避免版本混乱。

## 目标

- 让版本号能准确表达变更风险（是否破坏兼容）。
- 让用户可预期升级影响。
- 让发布动作可重复、可审计。

## 版本号策略

采用 `SemVer`（语义化版本）：`MAJOR.MINOR.PATCH`。

当前项目处于 `0.x` 阶段，推荐采用以下解释：

- `PATCH`：仅修复 bug 或文档更新，不改变现有使用方式。
  - 例：`0.1.0 -> 0.1.1`
- `MINOR`：新增功能或明显行为变化，可能影响部分使用习惯。
  - 在 `0.x` 阶段，`MINOR` 可视为“潜在破坏性升级”。
  - 例：`0.1.1 -> 0.2.0`
- `MAJOR`：进入稳定大版本里程碑（建议首个为 `1.0.0`）。
  - 例：`0.9.x -> 1.0.0`

## 何时升到 1.0.0

满足以下条件建议发 `1.0.0`：

- 核心数据模型（账户/流水/分期）基本稳定。
- CSV 导入导出行为稳定且有回归验证。
- AI 配置、数据安全策略（keyring）稳定。
- 发布流程与文档完整（README/CHANGELOG/版本规则）。

## 预发布版本（可选）

在正式版前可使用预发布标记：

- `1.0.0-alpha.1`（功能初测）
- `1.0.0-beta.1`（功能冻结后测试）
- `1.0.0-rc.1`（候选发布）

## 版本号同步源

每次发布必须同步以下文件的版本：

- `package.json` -> `version`
- `src-tauri/tauri.conf.json` -> `version`
- `src-tauri/Cargo.toml` -> `[package].version`

建议三处保持一致，避免桌面包版本与前端版本不一致。

## 推荐发布频率

- `PATCH`：随修复发（必要时当天发）。
- `MINOR`：建议 2~4 周一次，集中发布功能。
- `MAJOR`：按里程碑，不追求频率。

## 发布流程（手动）

1. 确认工作区干净：`git status`
2. 更新三处版本号（见上文）
3. 更新 README 中版本信息
4. 执行检查：

```bash
npm run build:fe
cargo check --manifest-path src-tauri/Cargo.toml
```

5. 提交版本发布 commit（示例：`chore(release): v0.2.0`）
6. 打标签并推送：

```bash
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin main
git push origin v0.2.0
```

7. 在 GitHub 创建 Release，并附安装包与变更说明。

## 变更说明建议模板

- Added: 新功能
- Changed: 行为调整
- Fixed: 问题修复
- Security: 安全相关

## 这个项目当前建议

考虑近期已完成的功能增强（分页筛选、CSV 强化、分期还款流水、API Key keyring 安全化、动画体系收敛），下一个版本建议：

- 若希望强调“一次功能跃迁”：`0.2.0`
- 若仅视为稳定修补：`0.1.1`

推荐采用 `0.2.0`，更符合本次变更体量。
