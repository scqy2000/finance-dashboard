# Finance Dashboard

一个基于 **Tauri v2 + React + Rust + SQLite** 的本地桌面记账应用，聚焦个人资产负债管理、分期账单跟踪、流水分析与 AI 财务诊断。

项目特点是：

- 本地优先：核心账本数据保存在本地 SQLite。
- 桌面体验：Tauri 打包，资源占用相对轻量。
- 可扩展：前端与后端通过清晰的命令边界交互，便于演进。

---

## 目录

- [功能概览](#功能概览)
- [技术栈](#技术栈)
- [架构与数据流](#架构与数据流)
- [快速开始](#快速开始)
- [常用命令](#常用命令)
- [配置说明](#配置说明)
- [数据存储与安全](#数据存储与安全)
- [CSV 导入导出说明](#csv-导入导出说明)
- [项目结构](#项目结构)
- [常见问题](#常见问题)
- [后续规划](#后续规划)

---

## 功能概览

### 1) 财务概览（Dashboard）

- 资产、负债、净值、周期收支等核心指标看板。
- 基于后端聚合快照接口，避免前端全量计算造成卡顿。
- 支持周/月/季/年的时间维度切换。

### 2) 收支明细（Transactions）

- 新增、编辑、删除流水。
- 分页查询（默认每页 50 条，可扩展到 200 条）。
- 结构化筛选：账户、分类、收支类型、日期区间、金额区间、关键词搜索。
- CSV 导入（支持列映射）与导出。
- 导入失败时可导出失败明细，便于修正后二次导入。

### 3) 资产与负债（Accounts）

- 管理资产账户与负债账户（信用卡/花贷等）。
- 支持授信额度、账单日、还款日等字段。
- 提供未来 30 天现金流预警视图。
- 内置测试数据注入入口（用于本地演示/联调）。

### 4) 分期管理（Installments）

- 创建分期计划（等额/自定义每期金额）。
- 记录已还期数并追踪每期明细。
- “记一期还款”会同步：
  - 更新分期期次状态
  - 更新账户余额
  - 生成对应流水（分类：`分期还款`）

### 5) AI 财务诊断（Analytics）

- 支持 OpenAI 兼容接口的聊天诊断。
- 结合本地账本聚合上下文（资产/负债/本月收支/最近流水）生成建议。
- 支持流式输出。

### 6) 设置（Settings）

- 外观个性化（品牌名、缩写、主题色、背景材质）。
- AI 参数配置（Base URL / API Key / Model）。
- API Key 使用系统凭据管理器安全存储。

---

## 技术栈

### 前端

- React 19
- TypeScript 5
- Vite 5
- Zustand（状态管理）
- Tailwind CSS v4（配合自定义设计变量）
- Tauri JS API（dialog/fs/shell）

### 后端（Tauri / Rust）

- Rust 2021
- Tauri 2
- rusqlite（bundled SQLite）
- chrono / uuid
- keyring（API Key 安全存储）

---

## 架构与数据流

### 前后端边界

- 前端通过 `@tauri-apps/api/core` 的 `invoke` 调用 Rust 命令。
- Rust 统一在 `src-tauri/src/commands.rs` 提供命令接口。
- 数据库初始化与 schema 管理在 `src-tauri/src/db.rs`。

### 核心命令（示例）

- 账户：`get_accounts` / `create_account` / `update_account` / `delete_account`
- 流水：`get_transactions_page` / `create_transaction` / `update_transaction` / `delete_transaction`
- 聚合：`get_finance_snapshot`
- 分类：`get_categories` / `create_category` / `update_category` / `delete_category`
- 分期：`create_installment` / `get_periods` / `pay_period` / `cancel_installment`
- 安全配置：`load_api_key` / `save_api_key` / `clear_api_key`

---

## 快速开始

## 1) 环境要求

- Node.js 18+（推荐 LTS）
- npm 9+
- Rust 1.77+
- Tauri v2 构建前置依赖（请先按官方文档安装）

Windows 常见前置：

- Visual Studio C++ Build Tools
- WebView2 Runtime

## 2) 安装依赖

```bash
npm install
```

## 3) 启动开发模式（桌面）

```bash
npm run dev
```

这会先启动前端开发服务器，再由 Tauri 启动桌面壳。

## 4) 仅启动前端开发服务器

```bash
npm run dev:fe
```

## 5) 构建前端

```bash
npm run build:fe
```

## 6) 打包桌面安装包

```bash
npm run build
```

默认会在 Tauri 配置的目标下生成 `msi`/`nsis`（Windows）。

---

## 常用命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动 Tauri 桌面开发模式 |
| `npm run dev:fe` | 仅启动前端开发服务器 |
| `npm run build:fe` | 构建前端产物 |
| `npm run build` | 打包桌面应用 |
| `npm run preview` | 预览前端构建产物 |

---

## 配置说明

### AI 配置

在应用「设置」页配置：

- Base URL（例如 `https://api.openai.com/v1` 或其他兼容地址）
- API Key
- Model（例如 `gpt-4o`）

说明：

- API Key 保存到系统 keyring（非明文 localStorage）。
- 其他非敏感配置（base URL、model、主题等）保存在 localStorage。

### 外观配置

- 应用名称和缩写
- 主题色
- 背景材质

保存后会实时应用到界面。

---

## 数据存储与安全

### 数据库存储

- 数据库文件名：`finance-data.sqlite`
- 存放位置：Tauri `app_data_dir()` 下
- 启动时自动初始化表结构与默认分类
- SQLite 启用 WAL 与外键约束

> 提示：不同系统路径不同。Windows 通常在当前用户的 AppData/Roaming 目录下应用标识对应目录内。

### 默认初始化内容

- 默认支出/收入分类（餐饮、交通、工资、理财等）
- 账户、流水、分期、分期明细表及相关索引

### 安全建议

- 不要把 API Key、数据库文件提交到 Git。
- 若用于多设备，请自行实现加密备份/同步策略。

---

## CSV 导入导出说明

### 导入能力

- 支持 CSV/TXT 文本导入。
- 支持列映射（日期、类型、账户、金额、分类、描述）。
- 支持带引号字段、字段内逗号、字段内换行。
- 支持常见日期格式归一化。
- 对异常行进行拦截并记录失败原因。

### 导入结果

- 成功/失败数量统计。
- 可导出失败明细 CSV（含行号、原因、原始列信息）。

### 导出能力

- 按当前筛选条件导出。
- UTF-8 BOM，便于在常见表格软件中打开中文。

---

## 项目结构

```text
finance-dashboard/
├─ src/                         # React 前端
│  ├─ api/                      # invoke 封装与类型
│  ├─ components/               # 复用组件（弹窗、侧栏等）
│  ├─ hooks/                    # 业务 hooks
│  ├─ pages/                    # 页面（Dashboard/Transactions/...）
│  ├─ store/                    # Zustand store
│  ├─ utils/                    # 工具函数（时间处理等）
│  └─ index.css                 # 设计变量与全局样式
├─ src-tauri/                   # Rust + Tauri 后端
│  ├─ src/
│  │  ├─ commands.rs            # Tauri 命令实现
│  │  ├─ db.rs                  # SQLite 初始化与 schema
│  │  └─ lib.rs                 # 应用入口与命令注册
│  ├─ icons/                    # 应用图标
│  └─ tauri.conf.json           # Tauri 配置
├─ public/
├─ package.json
└─ README.md
```

---

## 常见问题

### 1) `npm run dev` 无法启动

- 检查 Node/npm 版本。
- 检查 Rust 工具链是否可用：`rustc --version`。
- 检查 Tauri 前置依赖是否完整（尤其 Windows 的 C++ Build Tools 与 WebView2）。

### 2) AI 聊天提示未配置 API Key

- 到设置页填写并保存 API Key。
- 若更换设备或系统凭据被清理，需要重新填写。

### 3) 导入 CSV 后部分记录失败

- 查看导入结果中的失败数量。
- 导出失败明细，修复后重新导入。

### 4) 想重置演示数据

- 在「资产与负债」页使用“注入测试数据”功能。

---

## 后续规划

- 报表维度扩展（按分类/账户趋势分析）
- 自动预算与阈值告警
- 数据导入模板与字段智能映射增强
- 多语言与可访问性进一步优化

---

## 版本信息

- 当前版本：`0.1.0`
- 应用标识：`com.finance.dashboard`

---

## License

当前仓库尚未声明开源许可证。若计划公开分发，请补充 `LICENSE` 文件。
