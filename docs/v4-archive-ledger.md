# v4.4 归档与发布账本

本账本记录 v4.4.0 候选的目录边界、取证位置与发布状态。它不替代 Git 历史，也不包含任何业务数据内容。

## 当前候选

- 发布候选分支：`codex/v4.4-integration`
- 已验证功能基线：`80d8b711e3d98607b4f89717ff46222118a5ccf6`（`codex/v4.4-integration`，2026-08-14）。最终发布 SHA 只在 `v4.4.0` tag、Release 与 Pages 指向同一提交后作为发布记录固定。
- 唯一可编辑工作树：`D:\CounselorDesk\v4.4-integration`
- Git 裸仓库/镜像：`D:\CounselorDesk\repository`
- 验证证据目录：`D:\CounselorDesk\verification\v4.4.0-release-audit`

`master` 保持冻结。v4.4 只通过审阅合并进入主线，不从任何历史目录整包回拷源码。

## D 盘目录边界

| 目录 | 用途 | 处理规则 |
| --- | --- | --- |
| `D:\CounselorDesk\repository` | Git 对象与镜像 | 保留，不作为日常编辑工作树。 |
| `D:\CounselorDesk\v4.4-integration` | 唯一发布候选工作树 | 仅此目录继续开发、测试和提交。 |
| `D:\CounselorDesk\verification` | 构建、测试与烟测证据 | 仅保存当前验证证据；旧证据按周期清理。 |
| `D:\CounselorDesk\cache` | pnpm、Electron 与构建缓存 | 可重建；不存业务数据。 |
| `D:\CounselorDesk\_forensic-vault\retained` | 历史业务备份、传播素材与归档说明 | 只读保留，不解包、不改写来源数据。 |
| `D:\CounselorDesk\_forensic-vault\quarantine\2026-08-14` | 历史 v4.0 构建、缓存、临时文件与重复副本 | 30 天回收区；2026-09-13 后才可永久清理。 |

## 已完成的取证与隔离

- `D:\辅导员工作台-历史开发归档-2026-08-07` 的 v4.0 构建、临时日志、分享中间物和社交接收副本，已先登记后移入回收区。
- 历史业务备份与宣传素材已移入 `retained`；文件 SHA-256 位于 `D:\CounselorDesk\_forensic-vault\inventory\2026-08-14\retained-business-files-sha256.csv`。
- 历史目录元数据、大小、版本判断与删除资格位于 `legacy-archive-ledger.csv`。
- C 盘旧更新缓存已移入回收区。旧 v4.0 分享包已经逐文件 SHA-256 复制校验到回收区，但其源目录受系统保护未删除；不能视为已释放空间，也不得绕过系统保护强删。
- `C:\Users\wby\AppData\Roaming\counselor-desk` 保留不动，因为它可能包含真实用户数据。

## 本次验证

在 D 盘隔离的 pnpm store、Electron cache 和临时目录中，候选分支已运行：

```powershell
pnpm test
pnpm run test:release
node tests/public-surface-cleanup.js
node tests/release-screenshots.js
node scripts/check-public-surface.js
git fsck --full --no-reflogs
```

`pnpm test` 已在 2026-08-14 的 v4.4 候选工作树、提交 `80d8b711e3d98607b4f89717ff46222118a5ccf6` 完成统一验证，退出码为 0，耗时 476 秒；完整日志位于 `D:\CounselorDesk\verification\v4.4.0-release-audit\logs\pnpm-test-current.txt`。PR #1 对同一 SHA 的 HTML / JS 语法检查与完整测试门禁均已通过；正式 tag 创建前仍须在待发布提交上由发布工作流重新运行同一门禁。

本机 Windows 取证（仅候选构建，不代表正式发布）已在 2026-08-14 完成：

- 由 `desktop:build:win` 生成 NSIS x64 与 ARM64 安装器；解包可执行文件的 PE machine 分别为 x64 和 ARM64。
- x64 解包应用完成两次启动烟测，确认 schema v8、SQLite、附件、加密备份与退出后的持久化均可读回。
- 本机安装器产物 SHA-256：`counselor-desk-4.4.0-x64.exe` 为 `434E015CB153AAC0F2C870A73CE6BA39A0F5291C5E7E14FA8F27D65AB8CCFE4B`；`counselor-desk-4.4.0-arm64.exe` 为 `E705C37031D9D8E870C84D4E3A4D99F2B5573F82DCFB3AA37251EED3BDD0431B`。
- 三个本机构建的 Windows `.exe` 均为 `NotSigned`。发布页必须如实标注“未签名”；不得写作已签名或已公证。
- 本机 `%APPDATA%\Counselor Desk` 存在真实用户资料，因此安装、默认卸载保留数据、`/DELETEUSERDATA=1` 删除数据的流程被安全跳过，未触碰该目录。该流程由 Windows CI 的干净账户强制执行。

## 仍然阻止公开发布的事项

1. GitHub Actions 必须从同一候选提交产出并验证 Windows NSIS x64/ARM64 安装包。
2. GitHub Actions 或真实 macOS 设备必须验证 Universal DMG/ZIP 的架构、挂载、启动、SQLite、附件、备份与退出保存。
3. 用户确认八张产品截图的最终视觉效果后，才可合并、创建 `v4.4.0` tag、发布 Release 与手动部署 Pages。
4. 新版本公开可用后，才能清理旧 `v4.0.0-preview.*` Tags/Releases 以及已完成的远程开发分支。

没有完成以上事项前，不得把公开 Pages、现有下载页或旧 Preview 当作 v4.4 的发布证明。
