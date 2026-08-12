const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else fs.copyFileSync(from, to);
  }
}

const target = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'output', '辅导员工作台-v4.0.0');
fs.mkdirSync(target, { recursive:true });

const htmlTarget = path.join(target, '辅导员工作台.html');
const build = spawnSync(process.execPath, [path.join(root, 'scripts', 'build-release.js'), htmlTarget], {
  cwd:root, encoding:'utf8', stdio:'inherit',
});
if (build.status !== 0) process.exit(build.status || 1);

const copies = [
  ['README.md', 'README.md'],
  ['docs/decisions/ADR-006-v40-dual-runtime-and-vault.md', 'ADR-006-v40-dual-runtime-and-vault.md'],
  ['docs/v4-migration-and-backup.md', 'v4-migration-and-backup.md'],
  ['LICENSE', 'LICENSE'],
  ['vendor/xlsx.LICENSE', 'THIRD-PARTY-LICENSE-SheetJS.txt'],
  ['docs/辅导员工作台使用手册.md', '使用手册.md'],
  ['docs/数据格式与联动约定.md', '字段字典与数据约定.md'],
  ['docs/测试报告-v3.9.md', '测试报告.md'],
  ['docs/v4.0-全面验收报告.md', 'v4.0-全面验收报告.md'],
  ['docs/v4.0-架构与验收.md', 'v4.0-架构与验收.md'],
  ['docs/v4.0-p0-p1实施与验收.md', 'v4.0-p0-p1实施与验收.md'],
  ['docs/品牌与素材说明.md', '品牌与素材说明.md'],
  ['docs/平台构建矩阵.md', '平台构建矩阵.md'],
  ['docs/公开仓库维护指南.md', '公开仓库维护指南.md'],
  ['desktop/README.md', '桌面端说明.md'],
];
for (const [from, to] of copies) {
  const source = path.join(root, from);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(target, to));
}
const desktopSource = path.join(root, 'desktop');
const desktopTarget = path.join(target, 'desktop');
if (fs.existsSync(desktopSource)) {
  fs.mkdirSync(desktopTarget, { recursive:true });
  for (const file of ['main.cjs','preload.cjs','database.cjs','electron-builder.yml','installer.nsh','package.json','package-lock.json','README.md']) {
    const source = path.join(desktopSource, file);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(desktopTarget, file));
  }
}
const assetsSource = path.join(root, 'assets');
const assetsTarget = path.join(target, 'assets');
if (fs.existsSync(assetsSource)) {
  copyDirectory(assetsSource, assetsTarget);
}
const docsTarget = path.join(target, 'docs');
for (const relative of [
  '辅导员工作台使用手册.md',
  '数据格式与联动约定.md',
  '二次开发指南.md',
  'v4.0-全面验收报告.md',
  'v4.0-架构与验收.md',
  '品牌与素材说明.md',
  '平台构建矩阵.md',
  '公开仓库维护指南.md',
]) {
  const source = path.join(root, 'docs', relative);
  if (fs.existsSync(source)) {
    fs.mkdirSync(docsTarget, { recursive: true });
    fs.copyFileSync(source, path.join(docsTarget, relative));
  }
}
for (const filename of ['CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md']) {
  const source = path.join(root, filename);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(target, filename));
}
const releaseReadme = path.join(target, 'README.md');
if (fs.existsSync(releaseReadme)) {
  const releaseText = fs.readFileSync(releaseReadme, 'utf8')
    .replaceAll('./index.html', './辅导员工作台.html');
  fs.writeFileSync(releaseReadme, releaseText, 'utf8');
}
const sampleSource = path.join(root, 'samples', 'import-compat');
const sampleTarget = path.join(target, '脱敏兼容样表');
fs.mkdirSync(sampleTarget, { recursive:true });
for (const entry of fs.readdirSync(sampleSource, { withFileTypes:true })) {
  if (entry.isFile()) fs.copyFileSync(path.join(sampleSource, entry.name), path.join(sampleTarget, entry.name));
}
const sampleCount = fs.readdirSync(sampleTarget).filter(name => /\.(csv|xls|xlsx)$/i.test(name)).length;
if (sampleCount < 10) throw new Error(`Release package requires at least 10 compatibility samples; found ${sampleCount}`);
console.log(`Release package created: ${target}`);
