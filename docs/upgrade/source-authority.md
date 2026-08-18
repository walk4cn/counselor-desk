# 开发源权威清单

更新时间：2026-08-18

本次开发的已交付范围、验证证据和 v4.4.5 发布边界见[发布收尾记录](./release-v4.4.5.md)；v4.4.4 公开发布结果仍见[开发收尾总览](./final-closeout-2026-08-17.md)。

## 唯一开发基线

后续开发、测试和构建只使用以下独立 Git 项目目录：

- 路径：`F:\CounselorDesk\counselor-desk-development`
- 分支：`codex/ai-upgrade`
- 当前正式发布提交：`44c833d1bafbe51df844f81cbcc0d638e7e9621e`
- 既有历史 Tag：`v4.4.3` 指向 `5ddb502e527543f5f8e4f3f922979e09d57f1cf0`，本批不改写
- 当前正式版本：`v4.4.5`；[Release](https://github.com/7752777/counselor-desk/releases/tag/v4.4.5) 已公开并标记 Latest，[Pages](https://7752777.github.io/counselor-desk/) 已部署
- 远程仓库：`origin https://github.com/7752777/counselor-desk.git`
- Git 形态：独立完整克隆，不依赖外部 linked worktree 或主仓库目录
- 当前架构：本地优先 Web/单文件离线 HTML/Electron 共用业务界面

发布证据： [Release Actions #25](https://github.com/7752777/counselor-desk/actions/runs/32086383154) 和 [Pages 部署 #46](https://github.com/7752777/counselor-desk/actions/runs/32089792020) 均以当前正式发布提交成功；正式附件和 SHA-256 清单见[发布收尾记录](./release-v4.4.5.md)。

当前目录包含源码、测试、构建配置、升级文档、依赖和已有验证产物。以后所有开发、测试、构建、提交都在此目录执行；父目录中的其他文件夹不再作为需求或源码依据。

历史基线、旧 linked worktree、参考图片、用户测试包和其他过程资料已集中移动至：
`F:\CounselorDesk\_archive-non-development-20260817`

## 权威性顺序

需求和实现判断按以下顺序取证：

1. 当前 worktree 中的源码、测试和根目录构建配置。
2. 当前 worktree 中的架构、数据契约、隐私、迁移、安装和发布文档。
3. 归档目录中的参考 UI，仅用于判断目标体验，不证明功能已经实现。
4. 归档目录中的历史文档、候选发布包和旧版本资料，仅在需要追溯行为时作为辅助证据。

## 非开发源

以下归档目录不参与功能设计、源码搜索或依赖判断：

- `F:\CounselorDesk\_archive-non-development-20260817`
- 其中的 `_forensic-vault`、`archives`、`backups`、`cache`、`user-data`
- 其中的 `public-docs-update`、旧 `counselor-desk-next`、`v4.4-integration`
- 其中的 `参考图片`、`用户测试发布包-v4.4.3-候选`、`repository`

归档目录可以由用户在确认无保留价值后自行删除；最终开发目录不得删除或替换。

## 构建入口规则

- 根目录 `electron-builder.yml` 是当前 Electron 打包配置。
- `desktop/electron-builder.yml` 是旧重复配置，不得作为发布依据。
- Electron 主入口为 `desktop/main.cjs`，预加载入口为 `desktop/preload.cjs`。
- Web/离线入口为 `index.html`。
- 核心运行时位于 `src/core`，测试位于 `tests`，构建和检查脚本位于 `scripts`。
- 业务页面目前集中在约 10,000 行的 `index.html`，后续只做受控的增量抽离，不做一次性重写。

## 日常开发入口

```powershell
Set-Location 'F:\CounselorDesk\counselor-desk-development'
pnpm lint
pnpm test:cwb-business
pnpm test:cwb-ai
pnpm test:cwb-employment
pnpm desktop:build:win
```

浏览器入口为根目录 `index.html`；桌面入口为 `desktop/main.cjs`；根目录 `electron-builder.yml` 是唯一桌面打包配置。

## 不可破坏的基线约束

- 保持 schema v8 兼容。
- 保留稳定内部 ID、历史学号、自定义字段、附件关联和导入回滚能力。
- 保持浏览器 IndexedDB 与 Electron SQLite 的业务行为一致。
- 保持备份、恢复、版本历史、附件仓和诊断链路可用。
- 本轮不实现云同步、多人协作、学校部署或自动上传学生数据。
