# v4.4.4 开发收尾总览

更新时间：2026-08-17

本页是本次开发批次的收尾记录，描述当前开发目录、CI 和公开发布中已经验证的事实。v4.4.4 已由提交 `438badd4fd1fffd6aff36412912309642f02d389` 正式发布；正式下载版本、签名、公证、SHA-256 和 Pages 状态仍以 [v4.4.4 Release](https://github.com/7752777/counselor-desk/releases/tag/v4.4.4) 为准。

## 交付范围

### 数据与工作区

- 工作区继续使用 `schema v8`，保留稳定记录 ID、历史学号兼容、自定义字段、附件引用、版本历史、恢复点和失败重试。
- 浏览器 IndexedDB、便携 HTML 和 Electron SQLite 使用统一集合清单；新增业务集合已透传到迁移、备份、交换包、手机同步和桌面仓储边界。
- 业务档案覆盖综合测评、学期学业、处分、资助，并汇入学生画像和时间线。
- 业务档案、就业意向、联系记录优先使用 `student_id`，同时兼容旧学号记录；更正学号不会丢失画像关联。
- 处分附件不再把学号误写入 `student_id`。

### AI 与就业

- AI 模型配置支持用途授权、启停、每日成功调用额度、视觉能力和调用审计。
- 通知改写、预警辅助、工作总结和证书识别统一作为候选、草稿或待确认结果，不自动修改预警、心理、处分、资助或奖励结论。
- 证书识别先保存附件和草稿，人工选择学生、核对字段并确认后才写入获奖档案。
- 工作总结仅基于指定日期范围内已有记录，不补造事实；确认后才写入工作留痕。
- 就业资源目录提供约 80 条官方或可信入口，支持来源、核验状态、分类、地区、适用对象、收藏和 CSV/签名清单维护。

### 工作台与性能

- 学生台账的组合筛选、排序、字段/列派生结果使用缓存复用；5,000 条组合筛选性能回归通过。
- 10,000 行学生导入改为按块暂存、降低检查点频率并使用原子批量提交；本地浏览器性能回归约 16.9 秒完成，最大进度间隔约 96ms。
- 首页新增“领导统计视图”：只提供数值聚合，支持创建、切换、编辑、删除和 CSV 导出；不展示姓名、学号、电话、地址或心理详情。
- 旧版个人视图迁入领导视图时自动补齐默认指标；通用设置写入不会覆盖领导视图配置，v8 重启恢复已覆盖。

## 验证记录

### 本轮直接验证

```powershell
pnpm test:optimization
node tests/v8-workspace.js
node tests/v8-persistence-protocol.js
node tests/v8-browser-contract.js
node tests/v8-canonical-idb-browser.js
node tests/v40-browser-storage.js
node tests/v40-ui.js
node tests/v40-student-experience.js
node tests/navigation-structure.js
node tests/ux-operations.js
pnpm lint
node scripts/build-release.js output/v4-preview.html
pnpm build:release
pnpm desktop:build:win
pnpm exec node tests/desktop-windows-architecture.js
pnpm exec node tests/desktop-packaged-smoke.js
pnpm exec node tests/desktop-installer-smoke.js
pnpm check:public
pnpm test:release
git diff --check
```

以上定向测试、优化回归、v8/IndexedDB 回归、lint、发布构建、公开面 staging 检查和发布契约测试均通过。`pnpm test:optimization` 已包含 `tests/leadership-dashboard.js`。

### 已完成的浏览器验收

- 本地页面：`http://127.0.0.1:4173/`。
- 内置浏览器桌面视口：主页加载、领导视图创建、保存后自动选中、指标裁剪、导出、删除和清理均已操作验证。
- 页面控制台未发现应用错误或警告。
- 移动视口验收已完成：`390×844` 和 `360×800` 均无横向溢出，顶栏操作区、导航和主内容保持可用；桌面默认视口复验正常。

### 已完成的其他里程碑验证

- 学生台账筛选/排序/派生缓存和 10,000 行导入性能门禁通过。
- 最终候选 HTML 已重新生成：`output/辅导员工作台.html`。
- Windows x64 / ARM64 NSIS 安装包已按当前源码重建：`output/desktop/counselor-desk-4.4.4-x64.exe`、`output/desktop/counselor-desk-4.4.4-arm64.exe`，并生成对应 blockmap；PE 架构检查、解包应用双次持久化烟测和安装器双路径卸载烟测均通过。
- 公开 Release 已提供最终 CI 产物和三份 SHA-256 清单：[Web-SHA256.txt](https://github.com/7752777/counselor-desk/releases/download/v4.4.4/Web-SHA256.txt)、[Windows-SHA256.txt](https://github.com/7752777/counselor-desk/releases/download/v4.4.4/Windows-SHA256.txt)、[macOS-SHA256.txt](https://github.com/7752777/counselor-desk/releases/download/v4.4.4/macOS-SHA256.txt)。下载后以清单中的 CI 产物哈希为准，不以开发目录中的中间候选文件替代公开清单。
- 先前批次的迁移、备份、附件、交换包回滚、Electron、AI、业务档案和就业资源拆分测试已通过。
- 单条 `pnpm test` 曾超过当前命令执行上限；等价拆分测试已按风险范围执行通过，不能把单条命令记为通过。

## 外部发布结果

- 发布提交：[`438badd4fd1fffd6aff36412912309642f02d389`](https://github.com/7752777/counselor-desk/commit/438badd4fd1fffd6aff36412912309642f02d389)。
- GitHub Actions：[run 32024091313](https://github.com/7752777/counselor-desk/actions/runs/32024091313) 已完成 Tests、Windows NSIS、macOS Universal、离线网页和 Draft Release，全 job 成功。
- 正式 Release：[v4.4.4](https://github.com/7752777/counselor-desk/releases/tag/v4.4.4) 已于 2026-08-17 公开，包含 Windows x64 / ARM64、macOS Universal DMG / ZIP、离线 HTML 和三份 SHA-256 清单。
- Pages：[run 32025171557](https://github.com/7752777/counselor-desk/actions/runs/32025171557) 已成功部署到 [https://7752777.github.io/counselor-desk/](https://7752777.github.io/counselor-desk/)，线上入口已验收并无应用控制台错误。
- macOS Universal 构建未配置代码签名或公证；Release 说明已明确标注，安装前必须核对哈希并遵循学校软件管理策略。
- `v4.4.3` 历史 Tag 未被改写；`v4.4.4` 是当前公开下载版本。
- 不应把 `output/v4-preview.html`、开发目录或本地 `4173` 服务当作正式生产下载入口。

## 剩余限制

- 本地 `http://127.0.0.1:4173/` 仅用于开发验收，不是公开站点；公开体验入口以 Pages URL 为准。
- 发布包未配置代码签名；macOS 包另外未公证，首次启动可能受系统安全策略提示影响。
- 线上验收覆盖公开页面加载、入口结构和控制台错误检查，不等同于每一所学校的网络、安全软件、账号策略和终端兼容性认证。

## 文档入口

- 使用者： [三分钟快速上手](../quick-start.md)、[开始使用](../getting-started.md)、[用户手册](../user-guide.md)
- 数据与安全： [数据参考](../data-contract.md)、[隐私与安全边界](../v4-privacy.md)、[备份与迁移](../v4-migration-and-backup.md)
- 开发与发布： [开发与构建](../development.md)、[发布指南](../release-guide.md)、[架构概览](../architecture.md)
- 升级事实： [当前差异基线](./current-baseline.md)、[实现基线](./implementation-baseline.md)、[开发源权威清单](./source-authority.md)

## 本轮流程说明

- 普通 UI 与文档变更采用局部验证；跨模块、持久化和数据迁移风险采用扩大后的 v8/IndexedDB 测试。
- 独立代码审查代理发现了旧视图迁移和设置并发写入问题，修复后已通过专项回归。
- 没有进行与源码内容无关的常规哈希检查；仅在最终候选 HTML 和 Windows 安装包生成后执行了一次 SHA-256 校验。
