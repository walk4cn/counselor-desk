# v4.4.0 发布验收记录

> 本页保留 v4.4.0 的首个完整发布证据，便于追溯发布基线；当前用户下载请前往 [v4.4.2 Release](https://github.com/7752777/counselor-desk/releases/tag/v4.4.2)，不要把本页中的历史附件名当作最新下载项。

v4.4.4 的开发收尾、专项验证和未完成发布事项记录在[开发收尾总览](./upgrade/final-closeout-2026-08-17.md)；该文档不改变本页的 v4.4.0 历史发布事实。

本页记录已经发生并可复查的发布事实。它不是功能愿望清单，也不以“源码里有”代替可见、可下载、可恢复的产品能力。

## 发布身份

| 项目 | 已验证事实 |
| --- | --- |
| 正式版本 | `v4.4.0`，发布于 2026-08-14 |
| 发布提交 | [`ed362d73a1c95bded26bdfba811a10eb73b5b2a2`](https://github.com/7752777/counselor-desk/commit/ed362d73a1c95bded26bdfba811a10eb73b5b2a2) |
| Tag / Release | [v4.4.0](https://github.com/7752777/counselor-desk/releases/tag/v4.4.0) |
| 在线体验 | [GitHub Pages](https://7752777.github.io/counselor-desk/) |
| 数据格式 | schema v8 |
| 发布顺序 | Tests → Windows → macOS → Web artifact → Draft Release → Pages |

## 交付物与下载

下载时请只从 [v4.4.2 Release](https://github.com/7752777/counselor-desk/releases/tag/v4.4.2) 获取当前附件，并核对随附件发布的 SHA-256 清单；下表仅说明 v4.4.0 基线当时的产物组成。

| 使用方式 | Release 附件 | 适用说明 |
| --- | --- | --- |
| 网页端 | GitHub Pages | 适合先体验界面和演示流程；请勿在公共电脑保存真实学生资料。 |
| 离线网页 | `CounselorDesk-v4.4.0-Offline.html` | 单文件打开，便携模式与常规网页数据空间隔离。 |
| Windows x64 | `counselor-desk-4.4.0-x64.exe` | 面向主流 Intel / AMD Windows 设备的 NSIS 安装包。 |
| Windows ARM64 | `counselor-desk-4.4.0-arm64.exe` | 面向 Windows on ARM 设备的 NSIS 安装包。 |
| macOS Universal | `counselor-desk-4.4.0-mac-universal.dmg` / `.zip` | 同时包含 Intel 与 Apple Silicon 架构。当前为**未签名、未公证**构建。 |

## 发布门禁结果

| 门禁 | 结果 | 可复查证据 |
| --- | --- | --- |
| 完整主测试链 | 通过 | [GitHub Actions #31768117637](https://github.com/7752777/counselor-desk/actions/runs/31768117637) 的 Tests job |
| Windows 构建与安装器 | 通过 | 同一运行中的 Windows NSIS x64 / ARM64 job：构建、安装、重装、SQLite、附件、备份、退出保存和卸载路径检查均完成。 |
| macOS Universal | 通过 | 同一运行中的 macOS job：双架构检查、DMG 挂载、应用启动、SQLite、附件、备份恢复和退出保存烟测均完成。 |
| 网页与离线产物 | 通过 | 同一运行中的 Web artifact job：构建、公开面扫描、资源和 SHA-256 检查完成。 |
| Pages 部署 | 通过 | [GitHub Actions #31768796087](https://github.com/7752777/counselor-desk/actions/runs/31768796087) |

这些是 CI 目标平台上的真实构建与烟测结论，不等同于在每一台最终使用者设备上完成了校园网络、安全软件和本校策略适配。首次使用仍建议先用脱敏数据验证。

## 本次可见能力核对

- 学生台账支持 `10 / 20 / 50 / 100` 分页、组合筛选、状态记忆、固定选择/操作列、顶部与底部横向滚动、当前页与筛选结果全选、批量编辑、批量删除和一次撤销。
- 党员发展、班团组织、成绩与学业帮扶、奖惩、活动、住宿、工作留痕均有独立入口；学生档案可汇聚谈话、危机、成绩、住宿、党团和组织任职等时间线。
- schema v8 工作区提供写入队列、保存状态、版本历史、恢复点、诊断、迁移、便携隔离、附件完整性保护与交换包失败回滚。
- 欢迎页提供双栏教育场景、五套主题、按本地时间显示的问候、每日一次控制和无外链来源的中文教育短句。
- 八张 `2560 × 1440` 独立截图使用虚构演示数据，覆盖今日概览、分页批量、复杂导入、学生时间线、党员发展、谈话危机、成绩帮扶和备份迁移。

## 已知边界与使用建议

1. 本项目默认本地优先，不替代学校正式业务系统、专业心理评估、应急处置或党团审批。敏感事项必须遵守所在学校制度。
2. “本地保存”不等于无需管理安全。请使用受控设备、系统账户和学校允许的备份介质；公开交流只使用虚构或脱敏数据。
3. macOS 产物尚未签名或公证。请只从项目 Release 获取文件，先验证 SHA-256，再遵照本校软件管理要求安装。
4. 升级前先导出备份；若升级后发现数据、附件或显示异常，停止继续写入，保留原目录和备份后再排查。

## 复现与追溯

开发者可按 [开发与构建](./development.md) 复现主测试、网页构建和桌面打包。公开页面的文档、截图和下载内容只描述本表列出的已验证版本；后续版本会建立新的 Tag、Release、CI 记录和验收页，不覆盖本次发布事实。
