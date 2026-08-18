# 发布指南

本页面向维护者。目标是让网页、离线 HTML、Windows、macOS、README 和 Release 使用同一提交、同一数据格式、同一套事实说明。

## 当前发布线

`v4.4.5` 是当前发布候选，目标是把 AI 深度融合、移动端收口、relay 安全和仓库门禁与网页、离线 HTML、Windows、macOS、Release、Pages 一起正式交付。`v4.4.4` 的正式发布事实保留在[开发收尾总览](./upgrade/final-closeout-2026-08-17.md)，不得用旧产物证明新版本。

### v4.4.4 历史发布记录

| 项目 | 已验证事实 |
| --- | --- |
| 发布提交 | `438badd4fd1fffd6aff36412912309642f02d389` |
| 发布门禁 | [Actions run 32024091313](https://github.com/7752777/counselor-desk/actions/runs/32024091313)，Tests、Windows、macOS、Web、Draft Release 全部成功 |
| 正式 Release | [辅导员工作台 v4.4.4](https://github.com/7752777/counselor-desk/releases/tag/v4.4.4)，2026-08-17 公开 |
| Pages 部署 | [Actions run 32025171557](https://github.com/7752777/counselor-desk/actions/runs/32025171557)，部署成功 |
| Release 附件 | Windows x64 / ARM64、macOS Universal DMG / ZIP、离线 HTML、Windows/macOS/Web 三份 SHA-256 清单 |
| 签名状态 | Windows 与 macOS 构建未配置代码签名；macOS 同时未公证，安装前须核对哈希并遵循本校策略 |

## 发布前

1. 确认工作树只包含本次发布必要的改动，且不含用户数据、临时文件、测试输出和敏感信息。
2. 运行主测试、关键业务回归、真实浏览器 E2E 和公开内容扫描；跳过不等于通过。
3. 产出离线 HTML、Windows 和 macOS 包，记录真实文件名、体积、SHA-256、签名与公证状态。
4. 在目标平台完成安装、启动、附件、备份恢复和退出保存验证。
5. 生成并核验 README 展示的产品截图；只展示当次发布真实可见的能力。
6. 核对本次新增设置类功能的 v8 重启恢复，确认不会被个人视图、导入任务或其他设置写入覆盖。

## 版本事实检查

发布说明必须把“候选已集成”“CI 已验证”“Release 已公开”“Pages 已切换”四种状态分开写。v4.4.4 已完成这四个状态；v4.4.5 在真实结果写回前只能标为候选：

- Git tag、Release URL、Pages URL 与发布提交 SHA；
- Windows/macOS 安装包名称、SHA-256、签名和公证状态；
- 目标平台的安装、启动、附件、SQLite、恢复与退出保存证据；
- 清理的 Preview Tag、Release 和远程开发分支。

不允许引用旧构建日志、旧截图或旧 Pages 来证明新版本已经发布。

## 发布顺序

测试 → Windows → macOS → 网页产物 → Draft Release → 人工公开确认 → Pages。

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
