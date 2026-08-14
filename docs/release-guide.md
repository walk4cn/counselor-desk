# 发布指南

本页面向维护者。目标是让网页、离线 HTML、Windows、macOS、README 和 Release 使用同一提交、同一数据格式、同一套事实说明。

## 当前发布线

`v4.4.3` 是当前发布候选：真实校园表格兼容、离线 Excel 运行库和大批量导入撤销必须一起进入同一标签。只有 Tests、Windows、macOS、网页产物、Draft Release 和人工 Pages 部署全部完成后，才可把该标签写为正式公开版。`v4.4.2`（提交 [`9a0fe04982a21eda9be59e7d75caee4c1f47809c`](https://github.com/7752777/counselor-desk/commit/9a0fe04982a21eda9be59e7d75caee4c1f47809c)）保留为上一正式发布；`v4.4.0` 保留为首个完整发布基线。旧 Preview Tags、Releases 和已完成的远程开发分支仅在新 Release 与 Pages 验证后再清理，Git 提交历史保留。

## 发布前

1. 确认工作树只包含本次发布必要的改动，且不含用户数据、临时文件、测试输出和敏感信息。
2. 运行主测试、关键业务回归、真实浏览器 E2E 和公开内容扫描；跳过不等于通过。
3. 产出离线 HTML、Windows 和 macOS 包，记录真实文件名、体积、SHA-256、签名与公证状态。
4. 在目标平台完成安装、启动、附件、备份恢复和退出保存验证。
5. 生成并核验 README 展示的产品截图；只展示当次发布真实可见的能力。

## 版本事实检查

发布说明必须把“候选已集成”“CI 已验证”“Release 已公开”“Pages 已切换”四种状态分开写。以下内容只能在实际发生后填写：

- Git tag、Release URL、Pages URL 与发布提交 SHA；
- Windows/macOS 安装包名称、SHA-256、签名和公证状态；
- 目标平台的安装、启动、附件、SQLite、恢复与退出保存证据；
- 清理的 Preview Tag、Release 和远程开发分支。

不允许引用旧构建日志、旧截图或旧 Pages 来证明新版本已经发布。

## 发布顺序

测试 → Windows → macOS → 网页产物 → Draft Release → 人工确认 → Pages。

任何一步失败、缺少产物或无法验证，都应停止在 Draft 阶段，不能让 Pages 指向未经验证的提交。

## 发布后

- 在 CHANGELOG、Release 说明和版本状态页写入实际验证结果与明确限制。
- 确认在线体验、下载链接、哈希文件、截图和 README 均指向同一版本。
- 仅在新版本完整可用后，清理已过期的 Preview Release、Preview Tag 和远程开发分支；不改写历史提交。

## 发布记录模板

正式发布完成后，维护者应把以下信息写入验收报告和 Release Notes：

| 项目 | 要记录的事实 |
| --- | --- |
| 版本与提交 | Tag、提交 SHA、构建时间、schema 版本 |
| 网页与离线版 | 产物文件名、哈希、实际访问结果 |
| Windows | x64 / ARM64 文件名、哈希、安装与卸载结果、签名状态 |
| macOS | Universal DMG/ZIP、架构、挂载/启动结果、公证状态 |
| 已知限制 | 未验证的平台、明确跳过的环境条件和下一步处理方式 |
