# 开发、测试与构建

这页面向参与开发的人。使用产品不需要执行这些命令。

## 环境

- Node.js：以仓库 `package.json` 的 engines 和 package manager 字段为准。
- 包管理器：pnpm。
- Windows/macOS 桌面打包需要对应平台、Electron 工具链和足够的本机磁盘空间。

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm run build:release
pnpm run check:public
```

## 开发原则

1. 先写或更新会失败的回归测试，再改实现。
2. 不以“页面能打开”代替数据恢复、导入、附件与真实浏览器验证。
3. 任何数据格式变更都要覆盖旧备份、旧浏览器数据、桌面 SQLite、附件关联和迁移前恢复点。
4. 公开文档只能描述已经验证的事实；未构建的桌面包、未签名的文件和未部署的网页必须明确标注。

## 发布门禁

v4.4 的目标顺序为：测试 → Windows → macOS → 网页产物 → Draft Release → 人工确认 → Pages。任一步失败、跳过或缺少真实产物，都不能提升公开版本。

在修改发布工作流、桌面配置或数据格式前，先阅读 [贡献指南](../CONTRIBUTING.md) 与 [发布状态](./v4-acceptance-report.md)。
