# v4.4.4 升级实现基线

完整开发收尾、验证与发布边界见[开发收尾总览](./final-closeout-2026-08-17.md)。

## 本轮已落地

- 保持 `schema_version: 8`、稳定记录 ID、历史学号兼容、IndexedDB / Electron SQLite 双仓储和附件仓储不变。
- 新增 `src/core/cwb-business.js`，承载综合测评、学期学业汇总、处分档案、困难认定与资助四类记录的规范化和学生画像聚合。
- 新增“业务档案”入口。四类记录均以学号选择和关联，支持新增、编辑、删除、CSV 导出；处分档案支持附件仓储归档。
- 学生档案时间线和画像摘要展示新增综测、学业、处分、资助、就业意向和就业联系统计。
- 工作留痕页面支持将当前统计区间直接带入 AI 草稿；AI 工作台新增通知改写和预警辅助分析确认入口。AI 输出仍是草稿或建议，不自动修改预警、心理、处分和资助结论。
- AI 摘要上下文已纳入学业、资助和就业记录，沿用默认脱敏与调用审计策略。
- 首页新增领导统计视图：只提供数值汇总，可保存、切换、编辑、删除视图并导出当前 CSV，不展示学生身份或业务明细。

## 仓储与迁移

新增自定义集合：

- `custom.v4_assessments`
- `custom.v4_academic_terms`
- `custom.v4_disciplines`
- `custom.v4_aid_records`

这些集合已加入浏览器仓储、Electron 白名单、v8 逻辑路径、备份/交换包和手动换机包清单。浏览器 IndexedDB schema 已从 v4 升到 v5，以便已有本地库自动创建新 object stores。旧集合不会被改写，未知旧字段也不会在迁移中丢弃。

## Electron 体积基线

本机 Windows x64、Electron 38.8.6 的一次实测：

| 指标 | 优化前 | 优化后 |
| --- | ---: | ---: |
| 解包应用 | 348.8 MB | 304.2 MB |
| 安装包 | 未测 | 91.1 MB |
| `resources/app.asar` | 9.1 MB | 9.1 MB |

优化只排除了 `desktop` 内不参与运行的旧说明、锁文件、旧打包配置和安装脚本，并限制 Electron 语言包为 `zh-CN` / `en-US`。SQLite、附件、备份、Excel、Argon2、JSZip、ECharts 和桌面 IPC 资源均保留。

## 验证记录

- 核心：`cwb-business`、`cwb-ai-governance`、`cwb-employment`
- 集成：导航、v8 迁移、Electron surface、Electron package config、v40 UI / runtime / integration layout
- 桌面：Electron 启动冒烟、已打包应用双次持久化冒烟，均覆盖 SQLite、附件、迁移和备份
- 浏览器：业务档案、AI、工作留痕入口及 390px 视口无横向溢出
- 最终 Windows NSIS 重建已成功完成，产物为 `output/desktop/counselor-desk-4.4.4-x64.exe`（约 91.1 MB）和 `output/desktop/counselor-desk-4.4.4-arm64.exe`（约 85.6 MB），同时生成对应 blockmap；本次构建使用 Electron 38.8.6 / electron-builder 26.15.3。

单条 `pnpm test` 在当前环境超过 10 分钟命令上限；性能门禁及其后的测试已拆批全部通过，不能把单条命令超时误记为测试失败。

## 开发目录整理

- 唯一开发目录：`F:\CounselorDesk\counselor-desk-development`
- 归档目录：`F:\CounselorDesk\_archive-non-development-20260817`
- 最终开发目录是独立 Git 克隆，已完整带入当前源码、未跟踪新增模块、测试、文档、依赖和验证产物，不依赖外部 `public-docs-update` 或旧 linked worktree。
- 归档目录只保留历史基线、参考图片、用户测试包、用户数据和过程产物；不得从归档内容继续派生新功能。
