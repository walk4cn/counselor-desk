const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function run(script) {
  return spawnSync(process.execPath, [path.join(root, script)], {
    cwd: root,
    encoding: 'utf8'
  });
}

const inline = run('scripts/check-inline-js.js');
assert.equal(inline.status, 0, inline.stderr || inline.stdout);
assert.match(inline.stdout, /Inline JavaScript syntax OK/);

const publicSurface = run('scripts/check-public-surface.js');
assert.equal(publicSurface.status, 0, publicSurface.stderr || publicSurface.stdout);
assert.match(publicSurface.stdout, /Public surface check passed/);

const html = require('node:fs').readFileSync(path.join(root, 'index.html'), 'utf8');
const packageBuilder = require('node:fs').readFileSync(path.join(root, 'scripts', 'build-package.js'), 'utf8');
const compactHeader = html.match(/@media \(max-width:480px\)\s*\{([\s\S]*?)\n\}/);
assert.ok(compactHeader, 'Expected a compact mobile header media query');
assert.match(compactHeader[1], /\.topbar-search-wrap\{display:none\}/);
assert.match(compactHeader[1], /\.topbar\{padding:0 12px/);
for (const token of ['docs/v4-acceptance-report.md', 'docs/release-guide.md', 'banner.svg', 'welcome-education-scene-v2.png', 'screenshots']) assert.ok(packageBuilder.includes(token), `release package is missing: ${token}`);
for (const stale of ['docs/v4.0-全面验收报告.md', '品牌与素材说明.md', 'assetsSource']) assert.ok(!packageBuilder.includes(stale), `release package still references stale material: ${stale}`);

console.log('PASS release-checks');
