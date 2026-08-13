const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const target = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'output', 'counselor-desk-v4.4.0');
const screenshots = [
  '01-overview.png', '02-students-pagination-bulk.png',
  '03-import-preview.png', '04-student-timeline.png',
  '05-party-development.png', '06-talk-crisis-schedule.png',
  '07-grades-support.png', '08-backup-migration.png'
];

function copy(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive:true });
  fs.copyFileSync(source, destination);
}

function assertReleasePackageSafe(directory) {
  const forbidden = /(?:prompts?|superpowers|\.git(?:\\|\/|$)|node_modules(?:\\|\/|$))/i;
  const queue = [directory];
  while (queue.length) {
    const current = queue.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes:true })) {
      const full = path.join(current, entry.name);
      if (forbidden.test(path.relative(directory, full))) throw new Error(`Release package contains internal material: ${full}`);
      if (entry.isDirectory()) queue.push(full);
    }
  }
}

if (fs.existsSync(target) && fs.readdirSync(target).length) throw new Error(`Release package target must be empty: ${target}`);
fs.mkdirSync(target, { recursive:true });

const htmlTarget = path.join(target, '辅导员工作台.html');
const built = spawnSync(process.execPath, [path.join(root, 'scripts', 'build-release.js'), htmlTarget], { cwd:root, stdio:'inherit' });
if (built.status !== 0) process.exit(built.status || 1);

for (const relative of [
  'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE', 'SECURITY.md', 'THIRD-PARTY-NOTICES.md',
  'docs/README.md', 'docs/development.md', 'docs/architecture.md', 'docs/getting-started.md', 'docs/quick-start.md', 'docs/user-guide.md',
  'docs/data-contract.md', 'docs/v4-migration-and-backup.md', 'docs/v4-desktop-installation.md',
  'docs/v4-privacy.md', 'docs/release-guide.md', 'docs/v4-acceptance-report.md'
]) copy(path.join(root, relative), path.join(target, relative));

for (const asset of ['logo.svg', 'app-icon.svg', 'banner.svg', 'counselor-desk-hero.png', 'welcome-education-scene-v2.png']) copy(path.join(root, 'assets', asset), path.join(target, 'assets', asset));
for (const name of screenshots) copy(path.join(root, 'assets', 'screenshots', 'v4.4.0', name), path.join(target, 'assets', 'screenshots', 'v4.4.0', name));

const sampleSource = path.join(root, 'samples', 'import-compat');
for (const entry of fs.readdirSync(sampleSource, { withFileTypes:true })) {
  if (entry.isFile() && /\.(csv|xls|xlsx)$/i.test(entry.name)) copy(path.join(sampleSource, entry.name), path.join(target, '脱敏导入样表', entry.name));
}
assertReleasePackageSafe(target);
console.log(`Release package created: ${target}`);
