# 辅导员工作台 v4 Windows/macOS 桌面端

> 桌面端与根目录 `index.html` 共用业务页面和备份契约；主页品牌素材、平台签收状态和发布同步规则见根目录 `docs/品牌与素材说明.md`、`docs/平台构建矩阵.md`。

桌面端是可复现的 Electron 外壳，业务页面与单文件网页共用根目录的 `index.html`。运行时数据位于 Electron `app.getPath('userData')/counselor-desk-v4`：

- `database.sqlite`：启用 `better-sqlite3` 时的 WAL 结构化数据库（快照、事务、附件元数据）；
- `db.json`：便携/异常恢复用的原子快照回退；
- `transactions.jsonl`：保存操作审计；
- `attachments/`：受管理附件目录；
- `backups/`：最近 20 个恢复点。

关闭窗口前会执行自动保存校验。设置中的迁移入口会探测旧 JSON/便携 HTML，并生成已迁移、跳过和冲突报告。NSIS 非静默卸载会明确询问是否删除数据与附件；静默卸载默认保留数据，部署工具可显式传入 `--delete-app-data`。

开发运行（在已安装 Electron 依赖的环境）：

```powershell
cd desktop
npm install
npm start
npm run dist
```

## Cross-platform release

The same Electron source runs on Windows and macOS. `npm run dist:win` produces an NSIS installer; `npm run dist:mac` produces unsigned DMG and ZIP artifacts. macOS packaging must be executed on a macOS host because Electron Builder cannot create signed/notarized macOS bundles on Windows. Set an Apple signing identity and notarization credentials for production release; the checked-in configuration deliberately uses `identity: null` for reproducible unsigned QA builds.

Before packaging, rebuild `better-sqlite3` for the target Electron ABI with `npm run rebuild:native`. The builder copies its native runtime (and `bindings` dependencies) to `resources/native/node_modules`, because `.node` binaries cannot load from `app.asar`. Validate every build with `npm run test:desktop-electron` from the repository root; the packaged smoke test requires `sqlite: true` and `migration: true`.
